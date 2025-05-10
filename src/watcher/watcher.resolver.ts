import { Inject } from '@nestjs/common'
import { Resolver, Query, Args, ResolveField, Root, Int } from '@nestjs/graphql'

import {
  Attachment,
  FindManyAttachmentArgs,
  FindManyThreadArgs,
  FindManyWatcherArgs,
  FindUniqueWatcherArgs,
  Thread,
  Watcher,
  WatcherCount,
} from '@/generated/graphql'
import { WatcherService } from '@/watcher/watcher.service'

@Resolver(() => Watcher)
export class WatcherResolver {
  constructor(
    @Inject(WatcherService) private readonly watcherService: WatcherService,
  ) {}

  @Query(() => Int)
  async watcherCount(): Promise<number> {
    return this.watcherService.count()
  }

  @Query(() => Watcher, { nullable: true })
  async watcher(@Args() args: FindUniqueWatcherArgs): Promise<Watcher | null> {
    return this.watcherService.findOne(args)
  }

  @Query(() => [Watcher])
  async watchers(@Args() args: FindManyWatcherArgs): Promise<Watcher[]> {
    return this.watcherService.find(args)
  }

  @ResolveField(() => [Thread])
  async threads(@Root() watcher: Watcher, @Args() args: FindManyThreadArgs) {
    return this.watcherService
      .findOne({
        where: { id: watcher.id },
      })
      .threads(args)
  }

  @ResolveField(() => [Attachment])
  async attachments(
    @Root() watcher: Watcher,
    @Args() args: FindManyAttachmentArgs,
  ) {
    return this.watcherService
      .findOne({
        where: { id: watcher.id },
      })
      .attachments(args)
  }

  @ResolveField(() => WatcherCount)
  async _count(@Root() watcher: Watcher) {
    const result = await this.watcherService.findOne({
      select: { _count: true },
      where: { id: watcher.id },
    })

    if (!result) {
      throw new Error('Relation count aggregation failed')
    }

    return result._count
  }
}
