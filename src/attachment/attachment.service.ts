import { InjectQueue } from '@nestjs/bullmq'
import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Queue } from 'bullmq'
import * as dayjs from 'dayjs'

import { EntityBaseService } from '@/common/entity-base.service'
import {
  getAttachmentUniqueId,
  RawAttachment,
} from '@/crawler/types/attachment'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class AttachmentService extends EntityBaseService<'attachment'> {
  constructor(
    @Inject(PrismaService) prismaService: PrismaService,
    @InjectQueue('attachment') private readonly attachmentQueue: Queue,
  ) {
    super(prismaService, 'attachment')
  }

  async save(attachment: RawAttachment<string>) {
    const id = getAttachmentUniqueId(attachment)
    const input: Omit<Prisma.AttachmentCreateInput, 'id'> = {
      name: attachment.name,
      size: attachment.size,
      width: attachment.width,
      height: attachment.height,
      hash: attachment.hash,
      extension: attachment.extension,
      timestamp: attachment.createdAt,
      thumbnailWidth: attachment.thumbnail?.width,
      thumbnailHeight: attachment.thumbnail?.height,
      createdAt: dayjs
        .unix(Math.floor(attachment.createdAt / (1000 * 1000)))
        .toDate(),
    }

    await this.prisma.attachment.upsert({
      where: { id },
      update: { ...input },
      create: { id, ...input },
    })

    await this.attachmentQueue.add('download', {
      attachment,
    })
  }

  async saveMany(attachments: RawAttachment<string>[]) {
    for (const attachment of attachments) {
      await this.save(attachment)
    }
  }
}
