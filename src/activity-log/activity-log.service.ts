import { Inject, Injectable, Logger } from '@nestjs/common'

import type {
  ActivityFinishData,
  ActivityLogCreateData,
  ActivityStartResult,
  CrawlingStatistics,
} from '@/activity-log/types/activity-log'
import { EntityBaseService } from '@/common/entity-base.service'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class ActivityLogService extends EntityBaseService<'activityLog'> {
  private readonly logger = new Logger(ActivityLogService.name)

  constructor(@Inject(PrismaService) prismaService: PrismaService) {
    super(prismaService, 'activityLog')
  }

  async createActivityLog(data: ActivityLogCreateData) {
    const { crawlingResult, ...activityLogData } = data

    const activityLog = await this.create({
      data: {
        ...activityLogData,
        crawlingResult: crawlingResult
          ? {
              create: {
                threadsCreated: crawlingResult.threadsCreated,
                postsCreated: crawlingResult.postsCreated,
                attachmentsCreated: crawlingResult.attachmentsCreated,
                boardsProcessed: crawlingResult.boardsProcessed,
                watcherResults: {
                  create: crawlingResult.watcherResults.map((result) => ({
                    watcherName: result.watcherName,
                    threadsFound: result.threadsFound,
                    postsFound: result.postsFound,
                    attachmentsFound: result.attachmentsFound,
                    isSuccessful: result.isSuccessful,
                    errorMessage: result.errorMessage,
                  })),
                },
              },
            }
          : undefined,
      },
      include: {
        crawlingResult: {
          include: {
            watcherResults: true,
          },
        },
      },
    })

    this.logger.log(
      `Created activity log: ${data.activityType} - ${data.isSuccess ? 'Success' : 'Failed'}`,
    )

    return activityLog
  }

  async startActivity(activityType: string): Promise<ActivityStartResult> {
    const startTime = new Date()

    const activityLog = await this.create({
      data: {
        activityType,
        startTime,
        isSuccess: false,
      },
    })

    this.logger.log(`Started activity: ${activityType} (ID: ${activityLog.id})`)

    return {
      id: activityLog.id,
      startTime,
    }
  }

  async finishActivity(activityId: number, data: ActivityFinishData) {
    const endTime = new Date()
    const { crawlingResult, ...updateData } = data

    const activityLog = await this.update({
      where: { id: activityId },
      data: {
        ...updateData,
        endTime,
        crawlingResult: crawlingResult
          ? {
              create: {
                threadsCreated: crawlingResult.threadsCreated,
                postsCreated: crawlingResult.postsCreated,
                attachmentsCreated: crawlingResult.attachmentsCreated,
                boardsProcessed: crawlingResult.boardsProcessed,
                watcherResults: {
                  create: crawlingResult.watcherResults.map((result) => ({
                    watcherName: result.watcherName,
                    threadsFound: result.threadsFound,
                    postsFound: result.postsFound,
                    attachmentsFound: result.attachmentsFound,
                    isSuccessful: result.isSuccessful,
                    errorMessage: result.errorMessage,
                  })),
                },
              },
            }
          : undefined,
      },
      include: {
        crawlingResult: {
          include: {
            watcherResults: true,
          },
        },
      },
    })

    this.logger.log(
      `Finished activity: ${activityLog.activityType} - ${data.isSuccess ? 'Success' : 'Failed'} (ID: ${activityId})`,
    )

    return activityLog
  }

  async findRecentCrawlingLogs(limit: number = 10) {
    return this.find({
      where: { activityType: 'crawling' },
      include: {
        crawlingResult: {
          include: {
            watcherResults: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getCrawlingStatistics(): Promise<CrawlingStatistics> {
    const recentLogs = await this.find({
      where: {
        activityType: 'crawling',
        isSuccess: true,
      },
      include: {
        crawlingResult: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    const totalThreads = recentLogs.reduce(
      (sum, log) => sum + (log.crawlingResult?.threadsCreated || 0),
      0,
    )
    const totalPosts = recentLogs.reduce(
      (sum, log) => sum + (log.crawlingResult?.postsCreated || 0),
      0,
    )
    const totalAttachments = recentLogs.reduce(
      (sum, log) => sum + (log.crawlingResult?.attachmentsCreated || 0),
      0,
    )

    return {
      avgAttachmentsPerRun:
        recentLogs.length > 0 ? totalAttachments / recentLogs.length : 0,
      avgPostsPerRun:
        recentLogs.length > 0 ? totalPosts / recentLogs.length : 0,
      avgThreadsPerRun:
        recentLogs.length > 0 ? totalThreads / recentLogs.length : 0,
      totalLogs: recentLogs.length,
    }
  }
}
