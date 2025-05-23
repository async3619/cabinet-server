import { forwardRef, Module } from '@nestjs/common'

import { AttachmentModule } from '@/attachment/attachment.module'
import { PostResolver } from '@/post/post.resolver'
import { PostService } from '@/post/post.service'

@Module({
  imports: [forwardRef(() => AttachmentModule)],
  providers: [PostService, PostResolver],
  exports: [PostService],
})
export class PostModule {}
