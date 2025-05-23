import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import * as dayjs from 'dayjs'
import * as _ from 'lodash'
import prettyMilliseconds from 'pretty-ms'

import { EntityBaseService } from '@/common/entity-base.service'
import { PrismaService } from '@/prisma/prisma.service'
import { stopwatch } from '@/utils/stopwatch'

@Injectable()
export class ThreadMigrationService
  extends EntityBaseService<'thread'>
  implements OnModuleInit
{
  private readonly logger = new Logger(ThreadMigrationService.name)

  constructor(@Inject(PrismaService) prismaService: PrismaService) {
    super(prismaService, 'thread')
  }

  async onModuleInit() {
    await this.migrateBumpedAtColumn()
  }

  /**
   * This method is used to migrate the `bumpedAt` column from the `thread` table.
   * find all threads with `bumpedAt` set to null and update it to the latest post's createdAt.
   */
  private async migrateBumpedAtColumn() {
    const threads = await this.prisma.thread.findMany({
      where: {
        bumpedAt: null,
      },
      include: {
        posts: true,
      },
    })

    this.logger.log(
      `Migrating ${threads.length} threads for 'bumpedAt' column...`,
    )

    const [elapsedTime] = await stopwatch(async () => {
      for (const thread of threads) {
        const latestPost = _.chain(thread.posts)
          .orderBy((p) => dayjs(p.createdAt).unix(), 'desc')
          .first()
          .value()

        await this.prisma.thread.update({
          where: { id: thread.id },
          data: {
            bumpedAt: latestPost.createdAt,
          },
        })
      }
    })

    this.logger.log(
      `Migrated ${threads.length} threads for 'bumpedAt' column. (${prettyMilliseconds(elapsedTime, { verbose: true })})`,
    )
  }
}
