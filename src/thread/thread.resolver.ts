import { Inject } from '@nestjs/common'
import { Args, Int, Query, ResolveField, Resolver, Root } from '@nestjs/graphql'

import {
  Attachment,
  Board,
  FindFirstThreadArgs,
  FindManyAttachmentArgs,
  FindManyPostArgs,
  FindManyThreadArgs,
  FindManyWatcherArgs,
  Post,
  Thread,
  ThreadCount,
  Watcher,
} from '@/generated/graphql'
import { ThreadService } from '@/thread/thread.service'

@Resolver(() => Thread)
export class ThreadResolver {
  constructor(
    @Inject(ThreadService) private readonly threadService: ThreadService,
  ) {}

  @Query(() => Int)
  async threadCount(): Promise<number> {
    return this.threadService.count()
  }

  @Query(() => Thread, { nullable: true })
  async thread(@Args() args: FindFirstThreadArgs): Promise<Thread | null> {
    return this.threadService.findOne(args)
  }

  @Query(() => [Thread])
  async threads(@Args() args: FindManyThreadArgs): Promise<Thread[]> {
    return this.threadService.find(args)
  }

  @ResolveField(() => [Watcher])
  async watchers(@Root() thread: Thread, @Args() args: FindManyWatcherArgs) {
    return this.threadService
      .findOne({
        where: { id: thread.id },
      })
      .watchers(args)
  }

  @ResolveField(() => [Attachment])
  async attachments(
    @Root() thread: Thread,
    @Args() args: FindManyAttachmentArgs,
  ) {
    return this.threadService
      .findOne({
        where: { id: thread.id },
      })
      .attachments(args)
  }

  @ResolveField(() => [Post])
  async posts(@Root() thread: Thread, @Args() args: FindManyPostArgs) {
    return this.threadService
      .findOne({
        where: { id: thread.id },
      })
      .posts(args)
  }

  @ResolveField(() => Board)
  async board(@Root() thread: Thread) {
    return this.threadService
      .findOne({
        where: { id: thread.id },
      })
      .board()
  }

  @ResolveField(() => ThreadCount)
  async _count(@Root() thread: Thread): Promise<ThreadCount> {
    const result = await this.threadService.findOne({
      select: { _count: true },
      where: { id: thread.id },
    })

    if (!result) {
      throw new Error('Relation count aggregation failed')
    }

    return result._count
  }
}
