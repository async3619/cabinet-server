import { Module } from '@nestjs/common'

import { AttachmentModule } from '@/attachment/attachment.module'
import { ThreadResolver } from '@/thread/thread.resolver'
import { ThreadService } from '@/thread/thread.service'

@Module({
  imports: [AttachmentModule],
  providers: [ThreadService, ThreadResolver],
  exports: [ThreadService],
})
export class ThreadModule {}
