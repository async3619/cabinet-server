import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject, Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { filesize } from 'filesize'
import * as fs from 'fs-extra'

import { AttachmentService } from '@/attachment/attachment.service'
import { ConfigService } from '@/config/config.service'
import {
  getAttachmentUniqueId,
  RawAttachment,
} from '@/crawler/types/attachment'
import { DownloadError } from '@/utils/downloadFile'
import { md5 } from '@/utils/hash'
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
  private readonly fileHashMap = new Map<string, string>()

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(AttachmentService)
    private readonly attachmentService: AttachmentService,
  ) {
    super()
  }

  private async getHashFromFile(filePath: string) {
    let hash: string | undefined = this.fileHashMap.get(filePath)
    if (!hash) {
      hash = await md5(filePath)
      this.fileHashMap.set(filePath, hash)
    }

    return hash
  }

  private async checkShouldDownload(attachment: RawAttachment<string>) {
    const { hashCheck } = this.configService.attachment
    const uniqueId = getAttachmentUniqueId(attachment)
    const entity = await this.attachmentService.findOne({
      where: { id: uniqueId },
    })

    if (attachment.thumbnail?.url) {
      if (
        !entity?.thumbnailFileUri ||
        !fs.existsSync(entity.thumbnailFileUri)
      ) {
        return true
      }
    }

    if (!entity?.fileUri || !fs.existsSync(entity.fileUri)) {
      return true
    }

    if (hashCheck) {
      if (!entity.hash) {
        return false
      }

      const fileHash = await this.getHashFromFile(entity.fileUri)
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

        await sleep(downloadThrottle.download)
        break
      } catch (e) {
        if (e instanceof DownloadError && e.statusCode === 429) {
          this.logger.warn(
            `Failed to download file ${fileInformation} with error code 429 (Too Many Requests)`,
          )

          await sleep(downloadThrottle.failover)
          continue
        }

        if (e instanceof Error) {
          this.logger.error('Downloading attachment failed with error:')
          this.logger.error(e)
        }

        throw e
      }
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
