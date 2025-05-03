import { Module } from '@nestjs/common'

import { ConfigModule } from '@/config/config.module'
import { WatcherService } from '@/watcher/watcher.service'

@Module({
  imports: [ConfigModule],
  providers: [WatcherService],
  exports: [WatcherService],
})
export class WatcherModule {}
