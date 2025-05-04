import { Module } from '@nestjs/common'

import { AttachmentModule } from '@/attachment/attachment.module'
import { PostResolver } from '@/post/post.resolver'
import { PostService } from '@/post/post.service'

@Module({
  imports: [AttachmentModule],
  providers: [PostService, PostResolver],
  exports: [PostService],
})
export class PostModule {}
