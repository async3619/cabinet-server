import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject, Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { filesize } from 'filesize'

import { ActivityLogService } from '@/activity-log/activity-log.service'
import type { ActivityStartResult } from '@/activity-log/types/activity-log'
import { AttachmentService } from '@/attachment/attachment.service'
import { ConfigService } from '@/config/config.service'
import {
  getAttachmentUniqueId,
  RawAttachment,
} from '@/crawler/types/attachment'
import { DownloadError } from '@/utils/downloadFile'
import { sleep } from '@/utils/sleep'

interface DownloadJobData {
  attachment: RawAttachment<string>
  type: 'download'
}

interface DeletionJobData {
  attachmentId: string
  type: 'deletion'
}

export type AttachmentJobData = DownloadJobData | DeletionJobData

@Processor('attachment')
export class AttachmentProcessor extends WorkerHost {
  private readonly logger = new Logger(AttachmentProcessor.name)

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(AttachmentService)
    private readonly attachmentService: AttachmentService,
    @Inject(ActivityLogService)
    private readonly activityLogService: ActivityLogService,
  ) {
    super()
  }

  private async checkShouldDownload(attachment: RawAttachment<string>) {
    const { hashCheck } = this.configService.attachment
    const uniqueId = getAttachmentUniqueId(attachment)
    const entity = await this.attachmentService.findOne({
      where: { id: uniqueId },
    })

    const storage = this.attachmentService.storage

    if (attachment.thumbnail?.url) {
      if (!entity?.thumbnailFileUri) {
        return true
      }

      const thumbnailExists = await storage.exists(entity?.thumbnailFileUri)
      if (!thumbnailExists) {
        return true
      }
    }

    if (!entity?.fileUri) {
      return true
    } else {
      const fileExists = await storage.exists(entity.fileUri)
      if (!fileExists) {
        return true
      }
    }

    if (hashCheck) {
      if (!entity.hash) {
        return false
      }

      const fileHash = await this.attachmentService.storage.getHashOf(
        entity.fileUri,
      )

      if (entity.hash !== fileHash) {
        return true
      }
    }

    return false
  }

  private async processDownload(job: Job<AttachmentJobData>): Promise<void> {
    if (job.data.type !== 'download') {
      throw new Error(
        `Job type mismatch: expected 'download', got '${job.data.type}'`,
      )
    }

    const { attachment } = job.data
    const uniqueId = getAttachmentUniqueId(attachment)
    const { downloadThrottle } = this.configService.attachment

    const fileInformation = [
      `'${attachment.createdAt}${attachment.extension}'`,
      attachment.size && `(${filesize(attachment.size)})`,
    ]
      .filter(Boolean)
      .join(' ')

    const shouldDownload = await this.checkShouldDownload(attachment)
    if (!shouldDownload) {
      return
    }

    let activityLog: ActivityStartResult | null = null
    const downloadStartTime = Date.now()
    let retryCount = 0

    try {
      activityLog = await this.activityLogService.startActivity(
        `attachment-download:${uniqueId}`,
      )

      while (true) {
        try {
          const {
            fileUri,
            thumbnailUri: thumbnailFileUri,
            mime,
          } = await this.attachmentService.storage.save(attachment)

          await this.attachmentService.update({
            where: { id: uniqueId },
            data: { fileUri, thumbnailFileUri, mime },
          })

          this.logger.log(`Successfully downloaded file ${fileInformation}`)

          await this.activityLogService.finishActivity(activityLog.id, {
            type: 'attachment-download',
            attachmentDownloadResult: {
              attachmentId: uniqueId,
              name: attachment.name,
              width: attachment.width,
              height: attachment.height,
              extension: attachment.extension,
              fileSize: attachment.size,
              mimeType: mime,
              downloadDurationMs: Date.now() - downloadStartTime,
              fileUri,
              thumbnailGenerated: Boolean(thumbnailFileUri),
              retryCount,
            },
            isSuccess: true,
          })

          await sleep(downloadThrottle.download)
          break
        } catch (e) {
          if (e instanceof DownloadError && e.statusCode === 429) {
            retryCount++
            this.logger.warn(
              `Failed to download file ${fileInformation} with error code 429 (Too Many Requests), retry count: ${retryCount}`,
            )

            await sleep(downloadThrottle.failover)
            continue
          }

          throw e
        }
      }
    } catch (e) {
      if (activityLog) {
        const httpStatusCode =
          typeof e === 'object' &&
          !!e &&
          'statusCode' in e &&
          typeof e.statusCode === 'number'
            ? e.statusCode
            : undefined

        await this.activityLogService.finishActivity(activityLog.id, {
          type: 'attachment-download',
          attachmentDownloadResult: {
            attachmentId: uniqueId,
            name: attachment.name,
            width: attachment.width,
            height: attachment.height,
            extension: attachment.extension,
            fileSize: attachment.size,
            mimeType: undefined,
            downloadDurationMs: Date.now() - downloadStartTime,
            fileUri: undefined,
            thumbnailGenerated: false,
            retryCount,
            httpStatusCode,
          },
          errorMessage: e instanceof Error ? e.message : String(e),
          isSuccess: false,
        })
      }

      if (e instanceof Error) {
        this.logger.error('Downloading attachment failed with error:')
        this.logger.error(e)
      }

      throw e
    }
  }

  private async processDeletion(job: Job<AttachmentJobData>): Promise<void> {
    if (job.data.type !== 'deletion') {
      throw new Error(
        `Job type mismatch: expected 'deletion', got '${job.data.type}'`,
      )
    }

    const { attachmentId: id } = job.data
    const entity = await this.attachmentService.findOne({ where: { id } })
    if (!entity) {
      return
    }

    await this.attachmentService.storage.delete({
      fileUri: entity.fileUri,
      thumbnailUri: entity.thumbnailFileUri,
    })

    await this.attachmentService.delete({ where: { id } })

    this.logger.log(`Successfully deleted attachment: ${id}`)
  }

  @OnWorkerEvent('failed')
  onError(job: Job<AttachmentJobData>, error: Error) {
    this.logger.error('Attachment processing task was failed by error: ')
    this.logger.error(error)
  }

  async process(job: Job<AttachmentJobData>): Promise<any> {
    switch (job.name) {
      case 'download':
        await this.processDownload(job)
        break

      case 'deletion':
        await this.processDeletion(job)
        break

      default:
        throw new Error(`Unsupported job: ${job.name}`)
    }
  }
}
