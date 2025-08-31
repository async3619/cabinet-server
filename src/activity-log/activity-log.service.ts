import { Inject, Injectable, Logger } from '@nestjs/common'

import type {
  ActivityFinishData,
  ActivityStartResult,
} from '@/activity-log/types/activity-log'
import { EntityBaseService } from '@/common/entity-base.service'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class ActivityLogService extends EntityBaseService<'activityLog'> {
  private readonly logger = new Logger(ActivityLogService.name)

  constructor(@Inject(PrismaService) prismaService: PrismaService) {
    super(prismaService, 'activityLog')
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
}
