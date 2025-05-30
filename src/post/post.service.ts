import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import * as dayjs from 'dayjs'

import { AttachmentService } from '@/attachment/attachment.service'
import { EntityBaseService } from '@/common/entity-base.service'
import { getAttachmentUniqueId } from '@/crawler/types/attachment'
import { getBoardUniqueId } from '@/crawler/types/board'
import { getPostUniqueId, RawPost } from '@/crawler/types/post'
import { getThreadUniqueId } from '@/crawler/types/thread'
import { PrismaService } from '@/prisma/prisma.service'
import { Watcher } from '@/watcher/types/watcher'

@Injectable()
export class PostService extends EntityBaseService<'post'> {
  constructor(
    @Inject(PrismaService) prismaService: PrismaService,
    @Inject(forwardRef(() => AttachmentService))
    private readonly attachmentService: AttachmentService,
  ) {
    super(prismaService, 'post')
  }

  async upsertMany(
    posts: RawPost<string>[],
    attachmentWatcherMap: Record<string, Watcher[]>,
  ) {
    const threadBumpedAtMap: Record<string, number> = {}

    for (const post of posts) {
      await this.attachmentService.saveMany(
        post.attachments,
        attachmentWatcherMap,
      )

      const id = getPostUniqueId(post)
      const input: Omit<Prisma.PostCreateInput, 'id'> = {
        no: post.no,
        author: post.author,
        title: post.title,
        content: post.content,
        createdAt: dayjs.unix(post.createdAt).toDate(),
        board: {
          connect: { id: getBoardUniqueId(post.board) },
        },
        thread: {
          connect: { id: getThreadUniqueId(post.thread) },
        },
        attachments: {
          connect: post.attachments.map((item) => ({
            id: getAttachmentUniqueId(item),
          })),
        },
      }

      if (post.thread) {
        const threadId = getThreadUniqueId(post.thread)

        threadBumpedAtMap[threadId] = Math.max(
          threadBumpedAtMap[threadId] ?? 0,
          post.createdAt,
        )
      }

      await this.prisma.post.upsert({
        where: { id },
        update: { ...input },
        create: { id, ...input },
      })
    }

    for (const [threadId, bumpedAt] of Object.entries(threadBumpedAtMap)) {
      await this.prisma.thread.update({
        where: { id: threadId },
        data: {
          bumpedAt: dayjs.unix(bumpedAt).toDate(),
        },
      })
    }
  }
}
