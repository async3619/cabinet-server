import { Inject } from '@nestjs/common'
import { Args, Int, Query, ResolveField, Resolver, Root } from '@nestjs/graphql'

import { BoardService } from '@/board/board.service'
import {
  Board,
  BoardCount,
  FindFirstBoardArgs,
  FindManyBoardArgs,
  Post,
  Thread,
} from '@/generated/graphql'

@Resolver(() => Board)
export class BoardResolver {
  constructor(
    @Inject(BoardService) private readonly boardService: BoardService,
  ) {}

  @Query(() => Int)
  async boardCount(): Promise<number> {
    return this.boardService.count()
  }

  @Query(() => Board)
  async board(@Args() args: FindFirstBoardArgs): Promise<Board | null> {
    return this.boardService.findOne(args)
  }

  @Query(() => [Board])
  async boards(@Args() args: FindManyBoardArgs): Promise<Board[]> {
    return this.boardService.find(args)
  }

  @ResolveField(() => [Thread])
  async threads(@Root() board: Board) {
    return this.boardService
      .findOne({
        where: { id: board.id },
      })
      .threads()
  }

  @ResolveField(() => [Post])
  async posts(@Root() board: Board) {
    return this.boardService
      .findOne({
        where: { id: board.id },
      })
      .posts()
  }

  @ResolveField(() => BoardCount)
  async _count(@Root() board: Board) {
    const result = await this.boardService.findOne({
      select: { _count: true },
      where: { id: board.id },
    })

    if (!result) {
      throw new Error('Relation count aggregation failed')
    }

    return result._count
  }
}
