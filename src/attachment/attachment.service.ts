import { InjectQueue } from '@nestjs/bullmq'
import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Queue } from 'bullmq'
import * as dayjs from 'dayjs'
import { decode as decodeHtmlEntities } from 'html-entities'

import { EntityBaseService } from '@/common/entity-base.service'
import {
  getAttachmentUniqueId,
  RawAttachment,
} from '@/crawler/types/attachment'
import { Thread } from '@/generated/graphql'
import { PostService } from '@/post/post.service'
import { PrismaService } from '@/prisma/prisma.service'
import { Watcher } from '@/watcher/types/watcher'

@Injectable()
export class AttachmentService extends EntityBaseService<'attachment'> {
  constructor(
    @Inject(PrismaService) prismaService: PrismaService,
    @InjectQueue('attachment') private readonly attachmentQueue: Queue,
    @Inject(forwardRef(() => PostService))
    private readonly postService: PostService,
  ) {
    super(prismaService, 'attachment')
  }

  async save(attachment: RawAttachment<string>, watchers: Watcher[]) {
    const id = getAttachmentUniqueId(attachment)
    const input: Omit<Prisma.AttachmentCreateInput, 'id'> = {
      name: decodeHtmlEntities(attachment.name),
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
      watchers: {
        connect: watchers.map((item) => ({ id: item.id })),
      },
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

  async saveMany(
    attachments: RawAttachment<string>[],
    attachmentWatcherMap: Record<string, Watcher[]>,
  ) {
    for (const attachment of attachments) {
      await this.save(
        attachment,
        attachmentWatcherMap[getAttachmentUniqueId(attachment)],
      )
    }
  }

  async countByThread(thread: Thread) {
    const postIds = await this.postService
      .find({
        select: { id: true },
        where: { threadId: thread.id },
      })
      .then((posts) => posts.map(({ id }) => id))

    return this.prisma.attachment.count({
      where: {
        posts: {
          every: { id: { in: postIds } },
        },
      },
    })
  }
}
