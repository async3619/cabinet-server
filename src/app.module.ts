import { Module } from '@nestjs/common'

import { ConfigModule } from '@/config/config.module'
import { CrawlerModule } from '@/crawler/crawler.module'

@Module({
  imports: [CrawlerModule, ConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
