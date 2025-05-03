import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import * as _ from 'lodash'

import { EntityBaseService } from '@/common/entity-base.service'
import { ConfigService } from '@/config/config.service'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class WatcherService
  extends EntityBaseService<'watcher'>
  implements OnModuleInit
{
  constructor(
    @Inject(PrismaService) prismaService: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    super(prismaService, 'watcher')
  }

  async onModuleInit() {
    await this.prisma.watcher.deleteMany()

    const watchers = Object.values(this.configService.config.watchers).flat()
    const watcherNameCounts = _.chain(watchers)
      .countBy((w) => w.name)
      .toPairs()
      .value()

    for (const [name, count] of watcherNameCounts) {
      if (count <= 1) {
        continue
      }

      throw new Error(`Watcher with name '${name}' declared more than once`)
    }

    await this.prisma.watcher.createManyAndReturn({
      data: watchers.map((item) => ({
        name: item.name,
        type: item.type,
      })),
    })
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
