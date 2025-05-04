import { Module } from '@nestjs/common'

import { ConfigModule } from '@/config/config.module'
import { ThreadModule } from '@/thread/thread.module'
import { WatcherResolver } from '@/watcher/watcher.resolver'
import { WatcherService } from '@/watcher/watcher.service'

@Module({
  imports: [ConfigModule, ThreadModule],
  providers: [WatcherService, WatcherResolver],
  exports: [WatcherService],
})
export class WatcherModule {}
