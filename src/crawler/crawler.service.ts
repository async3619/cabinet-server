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

const CRAWLER_TASK_NAME = 'crawler'

@Injectable()
export class CrawlerService implements OnModuleInit {
  private readonly logger = new Logger(CrawlerService.name)
  private readonly watchers: BaseWatcher<string, any>[] = []

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(BoardService) private readonly boardService: BoardService,
    @Inject(ThreadService) private readonly threadService: ThreadService,
    @Inject(PostService) private readonly postService: PostService,
    @Inject(SchedulerRegistry)
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  private async createWatchers(): Promise<void> {
    const watcherNames = Object.keys(
      this.configService.config.watchers,
    ) as Array<keyof WatcherMap>

    for (const watcherName of watcherNames) {
      const watcherConfigs = this.configService.config.watchers[watcherName]
      if (!watcherConfigs) {
        continue
      }

      for (const config of watcherConfigs) {
        switch (config.type) {
          case 'four-chan':
            this.watchers.push(new WATCHER_CONSTRUCTOR_MAP[config.type](config))
            break

          default:
            throw new Error(
              `Unknown watcher configuration type '${config.type}'`,
            )
        }

        this.logger.log(`Successfully created '${config.type}' watcher`)
      }
    }
  }

  private initializeSchedulers(): void {
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

      const timeout = setTimeout(crawlingTimeoutFn, crawlInterval)
      this.schedulerRegistry.addTimeout(CRAWLER_TASK_NAME, timeout)
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

        for (const watcher of this.watchers) {
          const result = await watcher.watch()

          boards = {
            ...boards,
            ..._.chain(result.boards)
              .map((board) => [getBoardUniqueId(board), board] as const)
              .fromPairs()
              .value(),
          }

          threads = {
            ...threads,
            ..._.chain(result.threads)
              .map((threads) => [getThreadUniqueId(threads), threads] as const)
              .fromPairs()
              .value(),
          }

          posts = {
            ...posts,
            ..._.chain(result.posts)
              .map((posts) => [getPostUniqueId(posts), posts])
              .fromPairs()
              .value(),
          }

          attachments = {
            ...attachments,
            ..._.chain(result.threads)
              .concat(result.posts)
              .flatMap((item) => item.attachments)
              .map(
                (attachment) =>
                  [getAttachmentUniqueId(attachment), attachment] as const,
              )
              .fromPairs()
              .value(),
          }
        }

        await this.boardService.upsertMany(Object.values(boards))
        await this.threadService.upsertMany(Object.values(threads))
        await this.postService.upsertMany(Object.values(posts))

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

  async onModuleInit() {
    await this.createWatchers()
    this.initializeSchedulers()
  }
}
