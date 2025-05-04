import { Inject } from '@nestjs/common'
import { Resolver, Query, Args, ResolveField, Root } from '@nestjs/graphql'

import {
  Attachment,
  FindFirstWatcherArgs,
  FindManyWatcherArgs,
  Thread,
  Watcher,
} from '@/generated/graphql'
import { WatcherService } from '@/watcher/watcher.service'

@Resolver(() => Watcher)
export class WatcherResolver {
  constructor(
    @Inject(WatcherService) private readonly watcherService: WatcherService,
  ) {}

  @Query(() => Watcher, { nullable: true })
  async watcher(@Args() args: FindFirstWatcherArgs): Promise<Watcher | null> {
    return this.watcherService.findOne(args)
  }

  @Query(() => [Watcher])
  async watchers(@Args() args: FindManyWatcherArgs): Promise<Watcher[]> {
    return this.watcherService.find(args)
  }

  @ResolveField(() => [Thread])
  async threads(@Root() watcher: Watcher) {
    return this.watcherService
      .findOne({
        where: { id: watcher.id },
      })
      .threads()
  }

  @ResolveField(() => [Attachment])
  async attachments(@Root() watcher: Watcher) {
    return this.watcherService
      .findOne({
        where: { id: watcher.id },
      })
      .attachments()
  }
}
