import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'

import { AttachmentController } from '@/attachment/attachment.controller'
import { AttachmentProcessor } from '@/attachment/attachment.processor'
import { AttachmentResolver } from '@/attachment/attachment.resolver'
import { AttachmentService } from '@/attachment/attachment.service'
import { ConfigModule } from '@/config/config.module'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'attachment',
    }),
    ConfigModule,
  ],
  providers: [AttachmentService, AttachmentProcessor, AttachmentResolver],
  exports: [AttachmentService],
  controllers: [AttachmentController],
})
export class AttachmentModule {}
