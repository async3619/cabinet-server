import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import * as dayjs from 'dayjs'

import { AttachmentService } from '@/attachment/attachment.service'
import { EntityBaseService } from '@/common/entity-base.service'
import { getAttachmentUniqueId } from '@/crawler/types/attachment'
import { getBoardUniqueId } from '@/crawler/types/board'
import { RawPost } from '@/crawler/types/post'
import { getThreadUniqueId, RawThread } from '@/crawler/types/thread'
import { PrismaService } from '@/prisma/prisma.service'
import { Watcher } from '@/watcher/types/watcher'

@Injectable()
export class ThreadService extends EntityBaseService<'thread'> {
  constructor(
    @Inject(PrismaService) prismaService: PrismaService,
    @Inject(AttachmentService)
    private readonly attachmentService: AttachmentService,
  ) {
    super(prismaService, 'thread')
  }

  async upsertMany(
    threads: RawThread<string>[],
    watcherMap: Record<string, Watcher[]>,
    attachmentWatcherMap: Record<string, Watcher[]>,
    threadPostMap: Record<string, RawPost<string>[]>,
  ) {
    for (const thread of threads) {
      await this.attachmentService.saveMany(
        thread.attachments,
        attachmentWatcherMap,
      )

      const id = getThreadUniqueId(thread)
      const posts = threadPostMap[id] ?? []
      const attachments = posts.flatMap((post) => post.attachments)

      const input: Omit<Prisma.ThreadCreateInput, 'id'> = {
        no: thread.no,
        author: thread.author,
        title: thread.title,
        content: thread.content,
        createdAt: dayjs.unix(thread.createdAt).toDate(),
        bumpedAt: dayjs.unix(thread.createdAt).toDate(),
        isArchived: false,
        postCount: posts.length,
        attachmentCount: attachments.length,
        board: {
          connect: { id: getBoardUniqueId(thread.board) },
        },
        attachments: {
          connect: thread.attachments.map((item) => ({
            id: getAttachmentUniqueId(item),
          })),
        },
        watchers: {
          connect: watcherMap[id].map((item) => ({ id: item.id })),
        },
      }

      await this.prisma.thread.upsert({
        where: { id },
        update: { ...input },
        create: { id, ...input },
      })
    }
  }
}
