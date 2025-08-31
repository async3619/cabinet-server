import { BullModule } from '@nestjs/bullmq'
import { forwardRef, Module } from '@nestjs/common'

import { ActivityLogModule } from '@/activity-log/activity-log.module'
import { AttachmentController } from '@/attachment/attachment.controller'
import { AttachmentProcessor } from '@/attachment/attachment.processor'
import { AttachmentResolver } from '@/attachment/attachment.resolver'
import { AttachmentService } from '@/attachment/attachment.service'
import { ConfigModule } from '@/config/config.module'
import { PostModule } from '@/post/post.module'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'attachment',
    }),
    ConfigModule,
    ActivityLogModule,
    forwardRef(() => PostModule),
  ],
  providers: [AttachmentService, AttachmentProcessor, AttachmentResolver],
  exports: [AttachmentService],
  controllers: [AttachmentController],
})
export class AttachmentModule {}
