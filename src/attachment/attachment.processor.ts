import { Processor, WorkerHost } from '@nestjs/bullmq'
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
import { sleep } from '@/utils/sleep'

interface AttachmentProcessorJobData {
  attachment: RawAttachment<string>
}

@Processor('attachment')
export class AttachmentProcessor extends WorkerHost {
  private readonly logger = new Logger(AttachmentProcessor.name)

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(AttachmentService)
    private readonly attachmentService: AttachmentService,
  ) {
    super()
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

    const entity = await this.attachmentService.findOne({
      where: { id: uniqueId },
    })

    if (entity?.filePath && fs.existsSync(entity.filePath)) {
      return
    }

    await fs.ensureDir(this.configService.downloadPath)

    while (true) {
      try {
        await downloadFile(attachment.url, filePath)

        await this.attachmentService.update({
          where: { id: uniqueId },
          data: { filePath },
        })

        this.logger.log(`Successfully downloaded file ${fileInformation}`)

        await sleep(1000)
        break
      } catch (e) {
        if (e instanceof DownloadError && e.statusCode === 429) {
          this.logger.warn(
            `Failed to download file ${fileInformation} with error code 429 (Too Many Requests)`,
          )

          await sleep(5000)
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

  async process(job: Job<AttachmentProcessorJobData>): Promise<any> {
    if (job.name === 'download') {
      await this.processDownload(job)
    }
  }
}
