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

      await this.prisma.post.upsert({
        where: { id },
        update: { ...input },
        create: { id, ...input },
      })
    }
  }
}
