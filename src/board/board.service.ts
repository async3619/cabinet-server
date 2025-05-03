import { Inject, Injectable } from '@nestjs/common'

import { EntityBaseService } from '@/common/entity-base.service'
import { getBoardUniqueId, RawBoard } from '@/crawler/types/board'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class BoardService extends EntityBaseService<'board'> {
  constructor(@Inject(PrismaService) prismaService: PrismaService) {
    super(prismaService, 'board')
  }

  async upsertMany(boards: RawBoard<string>[]) {
    for (const board of boards) {
      const id = getBoardUniqueId(board)

      await this.prisma.board.upsert({
        where: { id },
        update: { ...board },
        create: { id, ...board },
      })
    }
  }
}
