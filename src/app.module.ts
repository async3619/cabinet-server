import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'

import { ConfigModule } from '@/config/config.module'
import { CrawlerModule } from '@/crawler/crawler.module'

// eslint-disable-next-line no-restricted-imports
import '../cabinet.config.json'

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule, CrawlerModule],
})
export class AppModule {}
