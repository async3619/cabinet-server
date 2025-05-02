import { Module } from '@nestjs/common'

import { CrawlerService } from '@/crawler/crawler.service'

@Module({
  providers: [CrawlerService],
})
export class CrawlerModule {}
