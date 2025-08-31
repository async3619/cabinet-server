import { Inject } from '@nestjs/common'
import { Args, Int, Query, Resolver } from '@nestjs/graphql'

import { ActivityLogService } from '@/activity-log/activity-log.service'
import {
  ActivityLog,
  FindManyActivityLogArgs,
  FindUniqueActivityLogArgs,
  ActivityLog as ActivityLogType,
  CrawlingResult as CrawlingResultType,
  WatcherResult as WatcherResultType,
} from '@/generated/graphql'

@Resolver(() => ActivityLogType)
export class ActivityLogResolver {
  constructor(
    @Inject(ActivityLogService)
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Query(() => [ActivityLogType])
  async activityLogs(
    @Args() args?: FindManyActivityLogArgs,
  ): Promise<ActivityLog[]> {
    return this.activityLogService.find({
      ...args,
      include: {
        crawlingResult: {
          include: {
            watcherResults: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  @Query(() => ActivityLogType, { nullable: true })
  async activityLog(
    @Args() args: FindUniqueActivityLogArgs,
  ): Promise<ActivityLog | null> {
    return this.activityLogService.findOne({
      ...args,
      include: {
        crawlingResult: {
          include: {
            watcherResults: true,
          },
        },
      },
    })
  }

  @Query(() => Int)
  async activityLogCount(): Promise<number> {
    return this.activityLogService.count()
  }
}

@Resolver(() => CrawlingResultType)
export class CrawlingResultResolver {}

@Resolver(() => WatcherResultType)
export class WatcherResultResolver {}
