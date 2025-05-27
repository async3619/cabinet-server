import {
  Controller,
  Get,
  Headers,
  HttpStatus,
  Inject,
  Param,
  Res,
} from '@nestjs/common'
import { Response } from 'express'

import { AttachmentService } from '@/attachment/attachment.service'

@Controller('attachments')
export class AttachmentController {
  constructor(
    @Inject(AttachmentService)
    private readonly attachmentService: AttachmentService,
  ) {}

  @Get('/:uuid/thumbnail')
  async getThumbnail(@Param('uuid') uuid: string, @Res() res: Response) {
    const attachment = await this.attachmentService.findOne({
      where: { uuid },
    })

    if (!attachment) {
      return res.status(404).send('File not found')
    }

    const storage = this.attachmentService.storage
    const fileUri = attachment.thumbnailFileUri
    if (!fileUri) {
      return res.status(404).send('File not found')
    }

    const exists = await storage.exists(fileUri)
    if (!exists) {
      return res.status(404).send('File not found')
    }

    const stream = await storage.getStreamOf(fileUri)
    stream.pipe(res)
  }

  @Get('/:uuid/:filename')
  async getFile(
    @Param('uuid') uuid: string,
    @Param('filename') fileName: string,
    @Res() res: Response,
    @Headers() headers: Record<string, string>,
  ) {
    const attachment = await this.attachmentService.findOne({
      where: { uuid },
    })

    if (!attachment) {
      return res.status(404).send('File not found')
    }

    const storage = this.attachmentService.storage
    const fileUri = attachment.fileUri
    if (!fileUri) {
      return res.status(404).send('File not found')
    }

    const exists = await storage.exists(fileUri)
    if (!exists) {
      return res.status(404).send('File not found')
    }

    const expectedFileName = `${attachment.name}${attachment.extension}`
    if (fileName !== expectedFileName) {
      return res.status(404).send('File not found')
    }

    if (!attachment.mime?.startsWith('video/')) {
      const stream = await storage.getStreamOf(fileUri)
      stream.pipe(res)
    } else {
      const size = await storage.getSizeOf(fileUri)
      const videoRange = headers.range
      if (videoRange) {
        const parts = videoRange.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : size - 1
        const chunkSize = end - start + 1
        const stream = await storage.getStreamOf(fileUri)

        const head = {
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': chunkSize,
          'Content-Type': attachment.mime,
        }

        res.writeHead(HttpStatus.PARTIAL_CONTENT, head) //206
        stream.pipe(res)
      } else {
        const head = {
          'Content-Length': size,
        }
        res.writeHead(HttpStatus.OK, head)

        const stream = await storage.getStreamOf(fileUri)
        stream.pipe(res)
      }
    }
  }
}
