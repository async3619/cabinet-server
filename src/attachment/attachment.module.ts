import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'

import { AttachmentProcessor } from '@/attachment/attachment.processor'
import { ConfigModule } from '@/config/config.module'

import { AttachmentService } from './attachment.service'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'attachment',
    }),
    ConfigModule,
  ],
  providers: [AttachmentService, AttachmentProcessor],
  exports: [AttachmentService],
})
export class AttachmentModule {}
