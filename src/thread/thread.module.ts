import { forwardRef, Module } from '@nestjs/common'

import { AttachmentModule } from '@/attachment/attachment.module'
import { ThreadMigrationService } from '@/thread/thread-migration.service'
import { ThreadResolver } from '@/thread/thread.resolver'
import { ThreadService } from '@/thread/thread.service'

@Module({
  imports: [forwardRef(() => AttachmentModule)],
  providers: [ThreadService, ThreadResolver, ThreadMigrationService],
  exports: [ThreadService],
})
export class ThreadModule {}
