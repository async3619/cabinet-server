import { Inject, Injectable, Logger } from '@nestjs/common'

import type {
  ActivityFinishData,
  ActivityStartResult,
  AttachmentDownloadLogData,
  CrawlingLogData,
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
    const activityLog = await this.update({
      where: { id: activityId },
      data: this.buildActivityUpdateData(data, new Date()),
      include:
        data.type === 'crawling'
          ? {
              crawlingResult: {
                include: {
                  watcherResults: true,
                },
              },
            }
          : {},
    })

    this.logger.log(
      `Finished activity: ${activityLog.activityType} - ${data.isSuccess ? 'Success' : 'Failed'} (ID: ${activityId})`,
    )

    return activityLog
  }

  private buildActivityUpdateData(data: ActivityFinishData, endTime: Date) {
    const baseData = { endTime }

    if (data.type === 'crawling') {
      if (data.isSuccess) {
        return {
          ...baseData,
          isSuccess: true,
          errorMessage: undefined,
          crawlingResult: {
            create: this.buildCrawlingResultData(data.crawlingResult),
          },
        }
      }

      return {
        ...baseData,
        isSuccess: false,
        errorMessage: data.errorMessage,
        crawlingResult: undefined,
      }
    }

    if (data.type === 'attachment-download') {
      if (data.isSuccess) {
        return {
          ...baseData,
          isSuccess: true,
          errorMessage: undefined,
          attachmentDownloadResult: {
            create: this.buildAttachmentDownloadResultData(
              data.attachmentDownloadResult,
            ),
          },
        }
      }

      return {
        ...baseData,
        isSuccess: false,
        errorMessage: data.errorMessage,
        attachmentDownloadResult: {
          create: this.buildAttachmentDownloadResultData(
            data.attachmentDownloadResult,
          ),
        },
      }
    }

    throw new Error(`Unknown activity data type: ${(data as any).type}`)
  }

  private buildCrawlingResultData(crawlingResult: CrawlingLogData) {
    return {
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
    }
  }

  private buildAttachmentDownloadResultData(
    downloadResult: AttachmentDownloadLogData,
  ) {
    return {
      attachmentId: downloadResult.attachmentId,
      name: downloadResult.name,
      width: downloadResult.width,
      height: downloadResult.height,
      extension: downloadResult.extension,
      fileSize: downloadResult.fileSize,
      mimeType: downloadResult.mimeType,
      downloadDurationMs: downloadResult.downloadDurationMs,
      fileUri: downloadResult.fileUri,
      thumbnailGenerated: downloadResult.thumbnailGenerated,
      retryCount: downloadResult.retryCount,
      httpStatusCode: downloadResult.httpStatusCode,
    }
  }
}
