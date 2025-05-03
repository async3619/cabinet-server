import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject, Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { filesize } from 'filesize'
import * as fs from 'fs-extra'

import * as path from 'node:path'

import { AttachmentService } from '@/attachment/attachment.service'
import { ConfigService } from '@/config/config.service'
import {
  getAttachmentUniqueId,
  RawAttachment,
} from '@/crawler/types/attachment'
import { DownloadError, downloadFile } from '@/utils/downloadFile'
import { md5 } from '@/utils/hash'
import { sleep } from '@/utils/sleep'

interface AttachmentProcessorJobData {
  attachment: RawAttachment<string>
}

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
    const uniqueId = getAttachmentUniqueId(attachment)
    const entity = await this.attachmentService.findOne({
      where: { id: uniqueId },
    })

    if (!entity?.thumbnailFilePath && attachment.thumbnail?.url) {
      return true
    }

    if (!entity?.filePath) {
      return true
    }

    if (fs.existsSync(entity.filePath)) {
      if (!entity.hash) {
        return false
      }

      const fileHash = await this.getHashFromFile(entity.filePath)
      if (entity.hash === fileHash) {
        return false
      }
    }

    return true
  }

  private async processDownload(
    job: Job<AttachmentProcessorJobData>,
  ): Promise<void> {
    const { attachment } = job.data
    const uniqueId = getAttachmentUniqueId(attachment)

    const fileInformation = [
      `'${attachment.createdAt}${attachment.extension}'`,
      attachment.size && `(${filesize(attachment.size)})`,
    ]
      .filter(Boolean)
      .join(' ')

    const filePath = path.join(
      this.configService.downloadPath,
      `${attachment.createdAt}${attachment.extension}`,
    )

    const thumbnailPath = path.join(
      this.configService.thumbnailPath,
      `${attachment.createdAt}s.jpg`,
    )

    const shouldDownload = await this.checkShouldDownload(attachment)
    if (!shouldDownload) {
      return
    }

    await fs.ensureDir(this.configService.downloadPath)
    await fs.ensureDir(this.configService.thumbnailPath)

    while (true) {
      try {
        await downloadFile(attachment.url, filePath)
        if (attachment.thumbnail) {
          await downloadFile(attachment.thumbnail.url, thumbnailPath)
        }

        const fileHash = await md5(filePath)
        this.fileHashMap.set(filePath, fileHash)

        await this.attachmentService.update({
          where: { id: uniqueId },
          data: { filePath, thumbnailFilePath: thumbnailPath },
        })

        this.logger.log(`Successfully downloaded file ${fileInformation}`)

        await sleep(1000)
        break
      } catch (e) {
        if (e instanceof DownloadError && e.statusCode === 429) {
          this.logger.warn(
            `Failed to download file ${fileInformation} with error code 429 (Too Many Requests)`,
          )

          await sleep(1000)
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

  @OnWorkerEvent('failed')
  onError(job: Job<AttachmentProcessorJobData>, error: Error) {
    this.logger.error('Attachment processing task was failed by error: ')
    this.logger.error(error)
  }

  async process(job: Job<AttachmentProcessorJobData>): Promise<any> {
    if (job.name === 'download') {
      await this.processDownload(job)
    }
  }
}
