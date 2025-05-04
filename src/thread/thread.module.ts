import { Module } from '@nestjs/common'

import { AttachmentModule } from '@/attachment/attachment.module'
import { ThreadService } from '@/thread/thread.service'

@Module({
  imports: [AttachmentModule],
  providers: [ThreadService],
  exports: [ThreadService],
})
export class ThreadModule {}
