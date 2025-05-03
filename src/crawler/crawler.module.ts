import { Module } from '@nestjs/common'

import { BoardModule } from '@/board/board.module'
import { ConfigModule } from '@/config/config.module'
import { CrawlerService } from '@/crawler/crawler.service'
import { PostModule } from '@/post/post.module'
import { ThreadModule } from '@/thread/thread.module'

@Module({
  imports: [ConfigModule, BoardModule, ThreadModule, PostModule],
  providers: [CrawlerService],
})
export class CrawlerModule {}
