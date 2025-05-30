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

import { Readable } from 'stream'

import { AttachmentService } from '@/attachment/attachment.service'
import { NotFoundError } from '@/utils/errors/not-found'

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
    let isClosed = false
    res.on('close', () => {
      isClosed = true
    })

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

    if (isClosed) {
      return
    }

    try {
      let stream: Readable | null
      if (!attachment.mime?.startsWith('video/')) {
        stream = await storage.getStreamOf(fileUri)
        stream.pipe(res)
      } else {
        const size = await storage.getSizeOf(fileUri)
        const videoRange = headers.range
        if (videoRange) {
          const parts = videoRange.replace(/bytes=/, '').split('-')
          const start = parseInt(parts[0], 10)
          const end = parts[1] ? parseInt(parts[1], 10) : size - 1
          const chunkSize = end - start + 1

          stream = await storage.getStreamOf(fileUri, {
            start,
            end,
            highWaterMark: 60,
          })

          res.writeHead(HttpStatus.PARTIAL_CONTENT, {
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Content-Length': chunkSize,
            'Content-Type': attachment.mime,
          })
          stream.pipe(res)
        } else {
          stream = await storage.getStreamOf(fileUri)

          res.writeHead(HttpStatus.OK, {
            'Content-Length': size,
          })
          stream.pipe(res)
        }
      }

      if (isClosed) {
        stream.destroy()
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).send('File not found')
      }

      throw error
    }
  }
}
