import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import prettyMilliseconds from 'pretty-ms'

import { EntityBaseService } from '@/common/entity-base.service'
import { PrismaService } from '@/prisma/prisma.service'
import { stopwatch } from '@/utils/stopwatch'

@Injectable()
export class AttachmentMigrationService
  extends EntityBaseService<'attachment'>
  implements OnModuleInit
{
  private readonly logger = new Logger(AttachmentMigrationService.name)

  constructor(@Inject(PrismaService) prismaService: PrismaService) {
    super(prismaService, 'attachment')
  }

  async onModuleInit() {
    await this.migrateAttachmentDownloadedAtColumn()
  }

  private async migrateAttachmentDownloadedAtColumn() {
    const attachments = await this.prisma.attachment.findMany({
      where: {
        downloadedAt: null,
      },
    })

    this.logger.log(
      `Migrating ${attachments.length} attachments for 'downloadedAt' columns...`,
    )

    const [elapsedTime] = await stopwatch(async () => {
      for (const attachment of attachments) {
        await this.prisma.attachment.update({
          where: { id: attachment.id },
          data: { downloadedAt: attachment.createdAt },
        })
      }
    })

    this.logger.log(
      `Migrated ${attachments.length} attachments for 'downloadedAt' columns. (${prettyMilliseconds(elapsedTime, { verbose: true })})`,
    )
  }
}
