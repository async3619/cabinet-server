import {
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
import { WATCHER_CONSTRUCTOR_MAP } from '@/crawler/watchers'
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
    await this.prisma.watcher.deleteMany()

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
      const matchedThreads = threads.filter((thread) =>
        WATCHER_CONSTRUCTOR_MAP[watcher.type].checkIfMatched(watcher, thread),
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
