import { forwardRef, Module } from '@nestjs/common'

import { ConfigModule } from '@/config/config.module'
import { CrawlerModule } from '@/crawler/crawler.module'
import { ThreadModule } from '@/thread/thread.module'
import { WatcherResolver } from '@/watcher/watcher.resolver'
import { WatcherService } from '@/watcher/watcher.service'

@Module({
  imports: [ConfigModule, ThreadModule, forwardRef(() => CrawlerModule)],
  providers: [WatcherService, WatcherResolver],
  exports: [WatcherService],
})
export class WatcherModule {}
