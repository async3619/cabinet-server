import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import * as _ from 'lodash'
import prettyMilliseconds from 'pretty-ms'

import { EntityBaseService } from '@/common/entity-base.service'
import { ConfigService } from '@/config/config.service'
import { CrawlerService } from '@/crawler/crawler.service'
import { CRAWLER_CONSTRUCTOR_MAP } from '@/crawler/crawlers'
import { WatcherThread } from '@/crawler/types/watcher-thread'
import { Watcher } from '@/generated/graphql'
import { PrismaService } from '@/prisma/prisma.service'
import { ThreadService } from '@/thread/thread.service'
import { stopwatch } from '@/utils/stopwatch'

@Injectable()
export class WatcherService
  extends EntityBaseService<'watcher'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(WatcherService.name)

  constructor(
    @Inject(PrismaService) prismaService: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(ThreadService) private readonly threadService: ThreadService,
    @Inject(forwardRef(() => CrawlerService))
    private readonly crawlerService: CrawlerService,
  ) {
    super(prismaService, 'watcher')
  }

  async onModuleInit() {
    await this.initializeWatchers()

    this.configService.on('change', this.handleConfigChange)
  }

  async onModuleDestroy() {
    this.configService.off('change', this.handleConfigChange)
  }

  async findByName(name: string) {
    const watcher = await this.prisma.watcher.findFirst({
      where: { name },
    })

    if (!watcher) {
      throw new Error(`Watcher with name '${name}' not found`)
    }

    return watcher
  }

  private handleConfigChange = async () => {
    this.logger.warn('Server configuration changed, reinitializing watchers...')

    const [elapsedTime] = await stopwatch(async () => {
      await this.initializeWatchers()
    })

    this.logger.log(
      `Watchers reinitialized successfully. (${prettyMilliseconds(elapsedTime, { verbose: true })})`,
    )
  }

  private async initializeWatchers() {
    const watcherMap = _.chain(this.configService.config.watchers)
      .values()
      .flatten()
      .compact()
      .keyBy('name')
      .value()

    const watcherNameCounts = _.chain(this.configService.config.watchers)
      .values()
      .flatten()
      .countBy((w) => w.name)
      .toPairs()
      .value()

    const watchers = Object.values(watcherMap)
    for (const [name, count] of watcherNameCounts) {
      if (count <= 1) {
        continue
      }

      throw new Error(`Watcher with name '${name}' declared more than once`)
    }

    const threads = await this.threadService.find({
      include: {
        board: true,
        attachments: true,
        posts: {
          include: {
            attachments: true,
          },
        },
      },
    })

    for (const watcher of watchers) {
      const watcherEntity = await this.prisma.watcher.findFirst({
        where: { name: watcher.name },
      })

      if (watcherEntity) {
        this.logger.warn(
          `Watcher '${watcher.name}' already exists, skipping...`,
        )
        continue
      }

      const matchedThreads = threads.filter((thread) =>
        CRAWLER_CONSTRUCTOR_MAP[watcher.type].checkIfMatched(watcher, thread),
      )

      const attachments = _.chain(matchedThreads)
        .map('posts')
        .flattenDeep()
        .map('attachments')
        .concat(
          _.chain(matchedThreads).map('attachments').flattenDeep().value(),
        )
        .flattenDeep()
        .uniqBy('id')
        .value()

      if (!watcherEntity) {
        await this.prisma.watcher.create({
          data: {
            name: watcher.name,
            type: watcher.type,
            attachments: {
              connect: attachments.map((attachment) => ({
                id: attachment.id,
              })),
            },
            threads: {
              connect: matchedThreads.map((thread) => ({ id: thread.id })),
            },
          },
        })
      }
    }
  }

  async registerThread(url: string, watcherId: number) {
    const watcher = await this.prisma.watcher.findUnique({
      where: { id: watcherId },
    })
    if (!watcher) {
      throw new Error(`Watcher with ID '${watcherId}' not found`)
    }

    const crawler = this.crawlerService.getCrawlerByWatcher(watcher)
    if (!crawler) {
      throw new Error(
        `Crawler for watcher '${watcher.name}' not found. Please check your configuration.`,
      )
    }

    const actualUrl = crawler.getActualUrl(url)
    if (!actualUrl) {
      throw new Error(
        `URL '${url}' does not match the crawler '${watcher.name}' configuration.`,
      )
    }

    const count = await this.prisma.watcherThread.count({
      where: { url: actualUrl, watcherId },
    })

    if (count > 0) {
      throw new Error(
        `Thread with URL '${actualUrl}' already registered for watcher '${watcher.name}'.`,
      )
    }

    await this.prisma.watcherThread.create({
      data: {
        url: actualUrl,
        watcher: {
          connect: { id: watcherId },
        },
      },
    })

    return true
  }

  getWatcherThreads(entity: Watcher) {
    return this.prisma.watcherThread.findMany({
      where: { watcherId: entity.id, isArchived: false },
    })
  }

  async connectWatcherThreads(watcherThreadIdMap: Record<number, string>) {
    for (const [watcherThreadId, threadId] of Object.entries(
      watcherThreadIdMap,
    )) {
      const watcherThread = await this.prisma.watcherThread.findUnique({
        where: { id: Number(watcherThreadId) },
      })

      if (!watcherThread) {
        this.logger.warn(
          `Watcher thread with ID '${watcherThreadId}' not found. Skipping connection.`,
        )
        continue
      }

      const thread = await this.prisma.thread.findUnique({
        where: { id: threadId },
      })

      if (!thread) {
        this.logger.warn(
          `Thread with ID '${threadId}' not found. Skipping connection.`,
        )
        continue
      }

      await this.prisma.watcherThread.update({
        where: { id: watcherThread.id },
        data: {
          thread: {
            connect: { id: thread.id },
          },
        },
      })
    }
  }

  async markWatcherThreadsAsArchived(archivedWatcherThreads: WatcherThread[]) {
    await this.prisma.watcherThread.updateMany({
      where: {
        id: {
          in: archivedWatcherThreads.map((thread) => thread.id),
        },
      },
      data: {
        isArchived: true,
      },
    })
  }

  async excludeThread(threadId: string, watcherId: number, wait?: boolean) {
    const watcher = await this.prisma.watcher.findUnique({
      where: { id: watcherId },
    })

    if (!watcher) {
      throw new Error(`Watcher with ID '${watcherId}' not found`)
    }

    await this.prisma.excludedThread.create({
      data: { threadId, watcher: { connect: { id: watcherId } } },
    })

    const promise = this.crawlerService.cleanUpObsoleteEntities()
    if (wait) {
      await promise
    } else {
      promise.then()
    }

    return true
  }

  async getExcludedThreads() {
    return this.prisma.excludedThread.findMany({
      include: { watcher: true },
    })
  }
}
