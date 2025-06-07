import { Args, Int, Query, ResolveField, Resolver, Root } from '@nestjs/graphql'

import {
  Attachment,
  Board,
  FindManyPostArgs,
  FindUniquePostArgs,
  Post,
  PostCount,
  Thread,
} from '@/generated/graphql'
import { PostService } from '@/post/post.service'

@Resolver(() => Post)
export class PostResolver {
  constructor(private readonly postService: PostService) {}

  @Query(() => Int)
  async postCount(): Promise<number> {
    return this.postService.count()
  }

  @Query(() => Post)
  async post(@Args() args: FindUniquePostArgs): Promise<Post | null> {
    return this.postService.findOne(args)
  }

  @Query(() => [Post])
  async posts(@Args() args: FindManyPostArgs): Promise<Post[]> {
    return this.postService.find(args)
  }

  @ResolveField(() => [Attachment])
  async attachments(@Root() post: Post) {
    return this.postService
      .findOne({
        where: { id: post.id },
      })
      .attachments()
  }

  @ResolveField(() => Thread)
  async thread(@Root() post: Post) {
    return this.postService
      .findOne({
        where: { id: post.id },
      })
      .thread()
  }

  @ResolveField(() => Board)
  async board(@Root() post: Post) {
    return this.postService
      .findOne({
        where: { id: post.id },
      })
      .board()
  }

  @ResolveField(() => PostCount)
  async _count(@Root() post: Post): Promise<PostCount> {
    const result = await this.postService.findOne({
      select: { _count: true },
      where: { id: post.id },
    })

    if (!result) {
      throw new Error('Relation count aggregation failed')
    }

    return result._count
  }
}
