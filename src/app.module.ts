import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'

import { AttachmentModule } from '@/attachment/attachment.module'
import { BoardModule } from '@/board/board.module'
import { ConfigModule } from '@/config/config.module'
import { CrawlerModule } from '@/crawler/crawler.module'
import { PostModule } from '@/post/post.module'
import { PrismaModule } from '@/prisma/prisma.module'
import { ThreadModule } from '@/thread/thread.module'
import { WatcherModule } from '@/watcher/watcher.module'

// eslint-disable-next-line no-restricted-imports
import '../cabinet.config.json'

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    ConfigModule,
    CrawlerModule,
    BoardModule,
    ThreadModule,
    PostModule,
    AttachmentModule,
    WatcherModule,
  ],
})
export class AppModule {}
