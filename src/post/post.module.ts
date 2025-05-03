import { Module } from '@nestjs/common'

import { AttachmentModule } from '@/attachment/attachment.module'

import { PostService } from './post.service'

@Module({
  imports: [AttachmentModule],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
