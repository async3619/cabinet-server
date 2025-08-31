import { Module } from '@nestjs/common'

import {
  ActivityLogResolver,
  CrawlingResultResolver,
  WatcherResultResolver,
} from '@/activity-log/activity-log.resolver'
import { ActivityLogService } from '@/activity-log/activity-log.service'

@Module({
  providers: [
    ActivityLogService,
    ActivityLogResolver,
    CrawlingResultResolver,
    WatcherResultResolver,
  ],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
