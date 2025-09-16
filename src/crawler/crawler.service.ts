import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import chalk from 'chalk'
import { CronJob } from 'cron'
import * as _ from 'lodash'
import * as pluralize from 'pluralize'
import prettyMilliseconds from 'pretty-ms'

import { ActivityLogService } from '@/activity-log/activity-log.service'
import type { WatcherResult } from '@/activity-log/types/activity-log'
import { AttachmentService } from '@/attachment/attachment.service'
import { BoardService } from '@/board/board.service'
import {
  SubscribableService,
  SubscriptionDataMap,
} from '@/common/subscribable.service'
import { ConfigService } from '@/config/config.service'
import { CRAWLER_CONSTRUCTOR_MAP } from '@/crawler/crawlers'
import { BaseCrawler } from '@/crawler/crawlers/base.crawler'
import {
  getAttachmentUniqueId,
  RawAttachment,
} from '@/crawler/types/attachment'
import { getBoardUniqueId, RawBoard } from '@/crawler/types/board'
import { getPostUniqueId, RawPost } from '@/crawler/types/post'
import { getThreadUniqueId, RawThread } from '@/crawler/types/thread'
import { PostService } from '@/post/post.service'
import { ThreadService } from '@/thread/thread.service'
import { stopwatch } from '@/utils/stopwatch'
import { Watcher } from '@/watcher/types/watcher'
import { WatcherService } from '@/watcher/watcher.service'

const CRAWLER_TASK_NAME = 'crawler'

interface CrawlerSubscriptionDataMap extends SubscriptionDataMap {
  crawlingStatusChanged: boolean
}

@Injectable()
export class CrawlerService
  extends SubscribableService<CrawlerSubscriptionDataMap>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CrawlerService.name)
  private readonly crawlers: BaseCrawler<string, any>[] = []

  private initializingPromise: Promise<void> | null = null
  private crawlingPromise: Promise<void> | null = null

  private crawling = false

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(WatcherService) private readonly watcherService: WatcherService,
    @Inject(BoardService) private readonly boardService: BoardService,
    @Inject(ThreadService) private readonly threadService: ThreadService,
    @Inject(PostService) private readonly postService: PostService,
    @Inject(AttachmentService)
    private readonly attachmentService: AttachmentService,
    @Inject(ActivityLogService)
    private readonly activityLogService: ActivityLogService,
    @Inject(SchedulerRegistry)
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    super()
  }

  get isCrawling() {
    return this.crawling
  }

  async onModuleInit() {
    this.initializingPromise = (async () => {
      await this.createCrawlers()
      await this.initializeSchedulers()
    })()

    this.configService.on('change', this.handleConfigChange)
  }

  async onModuleDestroy() {
    this.configService.off('change', this.handleConfigChange)
  }

  getCrawlerByWatcher(watcher: Watcher) {
    return this.crawlers.find((item) => item.entity.id === watcher.id) ?? null
  }

  private async createCrawlers(): Promise<void> {
    this.crawlers.length = 0

    const { watchers } = this.configService.config
    for (const config of watchers) {
      const watcher = await this.watcherService.findByName(config.name)

      switch (config.type) {
        case 'four-chan':
          this.crawlers.push(
            new CRAWLER_CONSTRUCTOR_MAP[config.type](config, watcher),
          )
          break

        default:
          throw new Error(`Unknown watcher configuration type '${config.type}'`)
      }

      this.logger.log(
        `Successfully created '${config.name}' (${config.type}) crawler`,
      )
    }
  }

  private async initializeSchedulers() {
    if (this.schedulerRegistry.doesExist('cron', CRAWLER_TASK_NAME)) {
      this.schedulerRegistry.deleteCronJob(CRAWLER_TASK_NAME)
    } else if (this.schedulerRegistry.doesExist('timeout', CRAWLER_TASK_NAME)) {
      this.schedulerRegistry.deleteTimeout(CRAWLER_TASK_NAME)
    }

    const crawlInterval = this.configService.crawling.interval
    if (typeof crawlInterval === 'string') {
      const job = new CronJob(crawlInterval, this.doCrawl.bind(this))
      this.schedulerRegistry.addCronJob(CRAWLER_TASK_NAME, job)
      job.start()
    } else {
      const crawlingTimeoutFn = async () => {
        this.schedulerRegistry.deleteTimeout(CRAWLER_TASK_NAME)
        await this.doCrawl()
        const timeout = setTimeout(crawlingTimeoutFn, crawlInterval)
        this.schedulerRegistry.addTimeout(CRAWLER_TASK_NAME, timeout)
      }

      this.doCrawl().then(() => {
        const timeout = setTimeout(crawlingTimeoutFn, crawlInterval)
        this.schedulerRegistry.addTimeout(CRAWLER_TASK_NAME, timeout)
      })
    }
  }

  async doCrawl(): Promise<void> {
    if (this.crawlingPromise) {
      this.logger.warn(
        'A crawling task is already running, skipping this request.',
      )

      return this.crawlingPromise
    }

    this.crawlingPromise = (async () => {
      this.setCrawlingState(true)

      const { id: activityId } =
        await this.activityLogService.startActivity('crawling')

      this.logger.log(
        `Starting crawling task for ${this.crawlers.length} watchers (Activity ID: ${activityId})`,
      )

      let errorMessage: string | undefined

      try {
        await this.threadService.updateMany({
          data: { isArchived: true },
        })

        const [
          elapsedTime,
          { posts, threads, boards, attachments, watcherResults },
        ] = await stopwatch(async () => {
          let boards: Record<string, RawBoard<string>> = {}
          let threads: Record<string, RawThread<string>> = {}
          let posts: Record<string, RawPost<string>> = {}
          let attachments: Record<string, RawAttachment<string>> = {}
          let watcherThreadIdMap: Record<number, string> = {}
          const watcherResults: Record<string, WatcherResult> = {}

          const threadWatcherMap: Record<string, Watcher[]> = {}
          const attachmentWatcherMap: Record<string, Watcher[]> = {}

          for (const watcher of this.crawlers) {
            try {
              const excludedThreadIds = await this.watcherService
                .getExcludedThreads()
                .then((items) =>
                  items
                    .filter((item) => item.watcherId === watcher.entity.id)
                    .map((item) => item.threadId),
                )

              const watcherThreads =
                await this.watcherService.getWatcherThreads(watcher.entity)

              const result = await watcher.watch(
                watcherThreads,
                excludedThreadIds,
              )

              watcherResults[watcher.entity.name] = {
                threadsFound: result.threads.length,
                postsFound: result.posts.length,
                attachmentsFound: _.chain(result.threads)
                  .concat(result.posts)
                  .flatMap((item) => item.attachments)
                  .value().length,
                isSuccessful: true,
              }

              const archivedWatcherThreads = watcherThreads.filter(
                (item) => !watcherThreadIdMap[item.id],
              )

              await this.watcherService.markWatcherThreadsAsArchived(
                archivedWatcherThreads,
              )

              watcherThreadIdMap = {
                ...watcherThreadIdMap,
                ...result.watcherThreadIdMap,
              }

              for (const thread of result.threads) {
                const id = getThreadUniqueId(thread)
                threadWatcherMap[id] ??= []
                threadWatcherMap[id].push(watcher.entity)
              }

              const allAttachments = _.chain(result.threads)
                .concat(result.posts)
                .flatMap((item) => item.attachments)
                .value()

              for (const attachment of allAttachments) {
                const id = getAttachmentUniqueId(attachment)
                attachmentWatcherMap[id] ??= []
                attachmentWatcherMap[id].push(watcher.entity)
              }

              boards = _.chain(result.boards)
                .map((board) => [getBoardUniqueId(board), board] as const)
                .fromPairs()
                .merge(boards)
                .value()

              threads = _.chain(result.threads)
                .map((thread) => [getThreadUniqueId(thread), thread] as const)
                .fromPairs()
                .merge(threads)
                .value()

              posts = _.chain(result.posts)
                .map((post) => [getPostUniqueId(post), post])
                .fromPairs()
                .merge(posts)
                .value()

              attachments = _.chain(result.threads)
                .concat(result.posts)
                .flatMap((item) => item.attachments)
                .map(
                  (attachment) =>
                    [getAttachmentUniqueId(attachment), attachment] as const,
                )
                .fromPairs()
                .merge(attachments)
                .value()
            } catch (watcherError) {
              this.logger.error(
                `Failed to crawl watcher ${watcher.entity.name}: ${watcherError}`,
              )
              watcherResults[watcher.entity.name] = {
                threadsFound: 0,
                postsFound: 0,
                attachmentsFound: 0,
                isSuccessful: false,
                errorMessage: String(watcherError),
              }
            }
          }

          const threadPostMap: Record<string, RawPost<string>[]> = {}
          for (const post of Object.values(posts)) {
            if (!post.thread) {
              continue
            }

            const threadId = getThreadUniqueId(post.thread)
            threadPostMap[threadId] ??= []
            threadPostMap[threadId].push(post)
          }

          await this.boardService.upsertMany(Object.values(boards))
          await this.threadService.upsertMany(
            Object.values(threads),
            threadWatcherMap,
            attachmentWatcherMap,
            threadPostMap,
          )
          await this.postService.upsertMany(
            Object.values(posts),
            attachmentWatcherMap,
          )

          await this.watcherService.connectWatcherThreads(watcherThreadIdMap)

          return { boards, threads, posts, attachments, watcherResults }
        })

        const boardCount = Object.keys(boards).length
        const threadCount = Object.keys(threads).length
        const postCount = Object.keys(posts).length
        const attachmentCount = Object.keys(attachments).length

        const tokens = [
          `${boardCount.toString()} ${pluralize('board', boardCount)}`,
          `${threadCount.toString()} ${pluralize('thread', threadCount)}`,
          `${postCount.toString()} ${pluralize('post', postCount)}`,
          `${attachmentCount.toString()} ${pluralize('attachment', attachmentCount)}`,
        ].map((token) => `  - ${chalk.blue(token)}`)

        this.logger.log(`Successfully finished crawling task with:`)
        for (const token of tokens) {
          this.logger.log(token)
        }

        this.logger.log(
          `This crawling task took ${chalk.blue(prettyMilliseconds(elapsedTime, { verbose: true }))}`,
        )

        if (this.configService.crawling.deleteObsolete) {
          await this.cleanUpObsoleteEntities()
        }

        await this.activityLogService.finishActivity(activityId, {
          type: 'crawling',
          isSuccess: true,
          crawlingResult: {
            threadsCreated: threadCount,
            postsCreated: postCount,
            attachmentsCreated: attachmentCount,
            boardsProcessed: boardCount,
            watcherResults: Object.entries(watcherResults).map(
              ([watcherName, result]) => ({
                watcherName,
                threadsFound: result.threadsFound,
                postsFound: result.postsFound,
                attachmentsFound: result.attachmentsFound,
                isSuccessful: result.isSuccessful,
                errorMessage: result.errorMessage,
              }),
            ),
          },
        })
      } catch (error) {
        errorMessage = String(error)

        this.logger.error(`Crawling task failed: ${error}`)

        await this.activityLogService.finishActivity(activityId, {
          type: 'crawling',
          isSuccess: false,
          errorMessage,
        })

        throw error
      }
    })().finally(() => {
      this.setCrawlingState(false)
      this.crawlingPromise = null
    })
  }

  async cleanUpObsoleteEntities() {
    this.logger.log('Now try to delete obsolete entities')

    const excludedThreads = await this.watcherService.getExcludedThreads()
    const excludedThreadIdMap = _.chain(excludedThreads)
      .groupBy((item) => item.watcherId)
      .mapValues((items) => items.map((item) => item.threadId))
      .value()

    const threads = await this.threadService.find({
      include: {
        watchers: true,
        watcherThreads: true,
        board: true,
        attachments: {
          include: {
            threads: true,
            posts: true,
          },
        },
        posts: {
          include: {
            attachments: {
              include: {
                threads: true,
                posts: true,
              },
            },
          },
        },
      },
    })

    const obsoleteThreads = threads.filter((thread) => {
      const isExcludedFromAllWatchers = thread.watchers.every(
        (watcher) =>
          excludedThreadIdMap[watcher.id]?.includes(thread.id) ?? false,
      )

      if (isExcludedFromAllWatchers) {
        return true
      }

      return (
        thread.isArchived &&
        thread.watcherThreads.length <= 0 &&
        !this.crawlers.some((watcher) => {
          return CRAWLER_CONSTRUCTOR_MAP[watcher.entity.type].checkIfMatched(
            watcher.config,
            thread,
          )
        })
      )
    })

    const obsoletePosts = _.chain(obsoleteThreads).flatMap('posts').value()

    const obsoleteThreadIdMap = _.chain(obsoleteThreads)
      .keyBy((item) => item.id)
      .mapValues(() => true)
      .value()

    const obsoletePostIdMap = _.chain(obsoletePosts)
      .keyBy((item) => item.id)
      .mapValues(() => true)
      .value()

    const allAttachments = _.chain(obsoleteThreads)
      .flatMap((thread) => thread.attachments)
      .concat(
        _.chain(obsoleteThreads)
          .flatMap((thread) => thread.posts)
          .flatMap((post) => post.attachments)
          .value(),
      )
      .uniqBy((attachment) => attachment.id)
      .value()

    const obsoleteAttachments = allAttachments.filter((attachment) => {
      const relationCount = _.chain([
        ...attachment.posts,
        ...attachment.threads,
      ])
        .map('id')
        .uniq()
        .filter((id) => !!obsoleteThreadIdMap[id] || !!obsoletePostIdMap[id])
        .toLength()
        .value()

      return relationCount === 0
    })

    if (
      obsoleteThreads.length === 0 &&
      obsoletePosts.length === 0 &&
      obsoleteAttachments.length === 0
    ) {
      this.logger.log(`No obsolete entities found.`)
      return
    }

    const tokens = [
      `${obsoleteThreads.length} ${pluralize('thread', obsoleteThreads.length)}`,
      `${obsoletePosts.length} ${pluralize('post', obsoletePosts.length)}`,
      `${obsoleteAttachments.length} ${pluralize('attachment', obsoleteAttachments.length)}`,
    ].map((token) => `  - ${chalk.blue(token)}`)

    this.logger.log(`Successfully found these obsolete entities:`)
    for (const token of tokens) {
      this.logger.log(token)
    }

    await this.postService.deleteMany({
      where: {
        id: { in: obsoletePosts.map((post) => post.id) },
      },
    })

    await this.threadService.deleteMany({
      where: {
        id: { in: obsoleteThreads.map((thread) => thread.id) },
      },
    })

    this.attachmentService.cleanUpMany(obsoleteAttachments)
  }

  private handleConfigChange = async () => {
    if (this.initializingPromise) {
      await this.initializingPromise
      this.initializingPromise = null
    }

    if (this.crawlingPromise) {
      await this.crawlingPromise
      this.crawlingPromise = null
    }

    this.logger.warn(
      `Server configuration changed, reinitializing crawlers and schedulers...`,
    )

    this.initializingPromise = (async () => {
      await this.createCrawlers()
      await this.initializeSchedulers()
    })()

    this.logger.log(`Crawlers and schedulers reinitialized successfully`)
  }

  private setCrawlingState(isCrawling: boolean) {
    this.crawling = isCrawling
    this.publish('crawlingStatusChanged', isCrawling)
  }
}
