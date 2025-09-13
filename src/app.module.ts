import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ScheduleModule } from '@nestjs/schedule'

import * as path from 'node:path'

import { ActivityLogModule } from '@/activity-log/activity-log.module'
import { AttachmentModule } from '@/attachment/attachment.module'
import { BoardModule } from '@/board/board.module'
import { ConfigModule } from '@/config/config.module'
import { CrawlerModule } from '@/crawler/crawler.module'
import { MusicSourceModule } from '@/music-source/music-source.module'
import { PostModule } from '@/post/post.module'
import { PrismaModule } from '@/prisma/prisma.module'
import { StatisticModule } from '@/statistic/statistic.module'
import { ThreadModule } from '@/thread/thread.module'
import { WatcherModule } from '@/watcher/watcher.module'

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: process.env.NODE_ENV !== 'production',
      graphiql: process.env.NODE_ENV !== 'production',
      autoSchemaFile:
        process.env.NODE_ENV !== 'production'
          ? path.join(process.cwd(), '..', 'cabinet-client', 'schema.gql')
          : true,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
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
    StatisticModule,
    ActivityLogModule,
    MusicSourceModule,
  ],
})
export class AppModule {}
