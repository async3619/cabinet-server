import { Module } from '@nestjs/common'

import { BoardResolver } from '@/board/board.resolver'
import { BoardService } from '@/board/board.service'

@Module({
  providers: [BoardService, BoardResolver],
  exports: [BoardService],
})
export class BoardModule {}
