import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import chalk from 'chalk'
import { CronJob } from 'cron'
import * as _ from 'lodash'
import * as pluralize from 'pluralize'
import prettyMilliseconds from 'pretty-ms'

import { BoardService } from '@/board/board.service'
import { ConfigService } from '@/config/config.service'
import {
  getAttachmentUniqueId,
  RawAttachment,
} from '@/crawler/types/attachment'
import { getBoardUniqueId, RawBoard } from '@/crawler/types/board'
import { getPostUniqueId, RawPost } from '@/crawler/types/post'
import { getThreadUniqueId, RawThread } from '@/crawler/types/thread'
import { WATCHER_CONSTRUCTOR_MAP, WatcherMap } from '@/crawler/watchers'
import { BaseWatcher } from '@/crawler/watchers/base.watcher'
import { PostService } from '@/post/post.service'
import { ThreadService } from '@/thread/thread.service'
import { stopwatch } from '@/utils/stopwatch'
import { Watcher } from '@/watcher/types/watcher'
import { WatcherService } from '@/watcher/watcher.service'

const CRAWLER_TASK_NAME = 'crawler'

@Injectable()
export class CrawlerService implements OnModuleInit {
  private readonly logger = new Logger(CrawlerService.name)
  private readonly watchers: BaseWatcher<string, any>[] = []

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(WatcherService) private readonly watcherService: WatcherService,
    @Inject(BoardService) private readonly boardService: BoardService,
    @Inject(ThreadService) private readonly threadService: ThreadService,
    @Inject(PostService) private readonly postService: PostService,
    @Inject(SchedulerRegistry)
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    await this.createWatchers()
    await this.initializeSchedulers()
  }

  private async createWatchers(): Promise<void> {
    const watcherTypes = Object.keys(
      this.configService.config.watchers,
    ) as Array<keyof WatcherMap>

    for (const type of watcherTypes) {
      const watcherConfigs = this.configService.config.watchers[type]
      if (!watcherConfigs) {
        continue
      }

      for (const config of watcherConfigs) {
        const watcher = await this.watcherService.findByName(config.name)

        switch (config.type) {
          case 'four-chan':
            this.watchers.push(
              new WATCHER_CONSTRUCTOR_MAP[config.type](config, watcher),
            )
            break

          default:
            throw new Error(
              `Unknown watcher configuration type '${config.type}'`,
            )
        }

        this.logger.log(
          `Successfully created '${config.name}' (${config.type}) watcher`,
        )
      }
    }
  }

  private async initializeSchedulers() {
    const crawlInterval = this.configService.crawlInterval
    if (typeof crawlInterval === 'string') {
      const job = new CronJob(crawlInterval, this.doCrawling.bind(this))
      this.schedulerRegistry.addCronJob(CRAWLER_TASK_NAME, job)
      job.start()
    } else {
      const crawlingTimeoutFn = async () => {
        this.schedulerRegistry.deleteTimeout(CRAWLER_TASK_NAME)
        await this.doCrawling()
        const timeout = setTimeout(crawlingTimeoutFn, crawlInterval)
        this.schedulerRegistry.addTimeout(CRAWLER_TASK_NAME, timeout)
      }

      this.doCrawling().then(() => {
        const timeout = setTimeout(crawlingTimeoutFn, crawlInterval)
        this.schedulerRegistry.addTimeout(CRAWLER_TASK_NAME, timeout)
      })
    }
  }

  private async doCrawling(): Promise<void> {
    this.logger.log(
      `Starting crawling task for ${this.watchers.length} watchers`,
    )

    const [elapsedTime, { posts, threads, boards, attachments }] =
      await stopwatch(async () => {
        let boards: Record<string, RawBoard<string>> = {}
        let threads: Record<string, RawThread<string>> = {}
        let posts: Record<string, RawPost<string>> = {}
        let attachments: Record<string, RawAttachment<string>> = {}

        const threadWatcherMap: Record<string, Watcher[]> = {}
        const attachmentWatcherMap: Record<string, Watcher[]> = {}

        for (const watcher of this.watchers) {
          const result = await watcher.watch()

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
        }

        await this.boardService.upsertMany(Object.values(boards))
        await this.threadService.upsertMany(
          Object.values(threads),
          threadWatcherMap,
          attachmentWatcherMap,
        )
        await this.postService.upsertMany(
          Object.values(posts),
          attachmentWatcherMap,
        )

        return { boards, threads, posts, attachments }
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
  }
}
