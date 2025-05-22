import { Module } from '@nestjs/common'

import { AttachmentModule } from '@/attachment/attachment.module'
import { BoardModule } from '@/board/board.module'
import { ConfigModule } from '@/config/config.module'
import { CrawlerService } from '@/crawler/crawler.service'
import { PostModule } from '@/post/post.module'
import { ThreadModule } from '@/thread/thread.module'
import { WatcherModule } from '@/watcher/watcher.module'

@Module({
  imports: [
    ConfigModule,
    WatcherModule,
    BoardModule,
    ThreadModule,
    PostModule,
    AttachmentModule,
  ],
  providers: [CrawlerService],
})
export class CrawlerModule {}
