import { Module } from '@nestjs/common'

import { AttachmentModule } from '@/attachment/attachment.module'
import { PostModule } from '@/post/post.module'
import { StatisticResolver } from '@/statistic/statistic.resolver'
import { StatisticService } from '@/statistic/statistic.service'
import { ThreadModule } from '@/thread/thread.module'

@Module({
  imports: [ThreadModule, PostModule, AttachmentModule],
  providers: [StatisticService, StatisticResolver],
})
export class StatisticModule {}
