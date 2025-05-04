import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import * as _ from 'lodash'

import { EntityBaseService } from '@/common/entity-base.service'
import { ConfigService } from '@/config/config.service'
import { WATCHER_CONSTRUCTOR_MAP } from '@/crawler/watchers'
import { PrismaService } from '@/prisma/prisma.service'
import { ThreadService } from '@/thread/thread.service'

@Injectable()
export class WatcherService
  extends EntityBaseService<'watcher'>
  implements OnModuleInit
{
  constructor(
    @Inject(PrismaService) prismaService: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(ThreadService) private readonly threadService: ThreadService,
  ) {
    super(prismaService, 'watcher')
  }

  async onModuleInit() {
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

  async findByName(name: string) {
    const watcher = await this.prisma.watcher.findFirst({
      where: { name },
    })

    if (!watcher) {
      throw new Error(`Watcher with name '${name}' not found`)
    }

    return watcher
  }
}
