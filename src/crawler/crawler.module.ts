import { Module } from '@nestjs/common'

import { ConfigModule } from '@/config/config.module'
import { CrawlerService } from '@/crawler/crawler.service'

@Module({
  imports: [ConfigModule],
  providers: [CrawlerService],
})
export class CrawlerModule {}
