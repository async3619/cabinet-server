import { ResolveField, Resolver, Root } from '@nestjs/graphql'

import { Attachment, Post } from '@/generated/graphql'
import { PostService } from '@/post/post.service'

@Resolver(() => Post)
export class PostResolver {
  constructor(private readonly postService: PostService) {}

  @ResolveField(() => [Attachment])
  async attachments(@Root() post: Post) {
    return this.postService
      .findOne({
        where: { id: post.id },
      })
      .attachments()
  }
}
