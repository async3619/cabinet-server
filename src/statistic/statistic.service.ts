import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import chalk from 'chalk'

import { AttachmentService } from '@/attachment/attachment.service'
import { EntityBaseService } from '@/common/entity-base.service'
import { PostService } from '@/post/post.service'
import { PrismaService } from '@/prisma/prisma.service'
import { ThreadService } from '@/thread/thread.service'

@Injectable()
export class StatisticService extends EntityBaseService<'statistic'> {
  private readonly logger = new Logger(StatisticService.name)

  constructor(
    @Inject(PrismaService) prismaService: PrismaService,
    @Inject(ThreadService) private readonly threadService: ThreadService,
    @Inject(PostService) private readonly postService: PostService,
    @Inject(AttachmentService)
    private readonly attachmentService: AttachmentService,
  ) {
    super(prismaService, 'statistic')
  }

  @Cron('0 0 * * * *')
  private async record() {
    const threadCount = await this.threadService.count()
    const postCount = await this.postService.count()
    const attachmentCount = await this.attachmentService.count()
    const totalSize = await this.attachmentService.aggregate({
      _sum: { size: true },
    })

    await this.prisma.statistic.create({
      data: {
        threadCount,
        postCount,
        attachmentCount,
        totalSize: totalSize._sum.size ?? 0,
      },
    })

    this.logger.log(`Recorded statistical data:`)
    this.logger.log(`  - Thread count: ${chalk.blue(threadCount)}`)
    this.logger.log(`  - Post count: ${chalk.blue(postCount)}`)
    this.logger.log(`  - Attachment count: ${chalk.blue(attachmentCount)}`)
    this.logger.log(`  - Total size: ${chalk.blue(totalSize._sum.size ?? 0)}`)
  }
}
