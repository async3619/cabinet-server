import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import * as ffmpeg from 'fluent-ffmpeg'
import * as fs from 'fs-extra'

import { randomUUID } from 'crypto'
import { openAsBlob } from 'fs'
import * as path from 'node:path'
import { pipeline } from 'node:stream/promises'

import { AttachmentService } from '@/attachment/attachment.service'
import { EntityBaseService } from '@/common/entity-base.service'
import { MusicSource } from '@/generated/graphql'
import { PrismaService } from '@/prisma/prisma.service'

interface AudDResponse {
  execution_time: string
  result: Array<{
    offset: string
    songs: Array<{
      album: string
      artist: string
      label: string
      release_date: string
      song_link: string
      timecode: string
      title: string
    }>
  }>
  status: string
}

@Injectable()
export class MusicSourceService
  extends EntityBaseService<'musicSource'>
  implements OnModuleInit
{
  private static readonly TEMP_FILE_PATH = path.join(process.cwd(), 'temp')

  private readonly logger = new Logger(MusicSourceService.name)

  constructor(
    @Inject(PrismaService) prismaService: PrismaService,
    @Inject(AttachmentService)
    private readonly attachmentService: AttachmentService,
  ) {
    super(prismaService, 'musicSource')
  }

  async onModuleInit() {
    await fs.ensureDir(MusicSourceService.TEMP_FILE_PATH)
  }

  async findSourceOf(attachmentId: string) {
    const attachment = await this.attachmentService.findOne({
      where: { id: attachmentId },
    })

    if (!attachment) {
      throw new Error(`Attachment with given id '${attachmentId}' not found`)
    }

    const fileUri = attachment.fileUri
    if (!fileUri) {
      throw new Error('fileUri does not exist')
    }

    const items = await this.find({
      where: { attachmentId },
    })

    if (items.length > 0) {
      return items
    }

    const { videoFilePath, audioFilePath } = await this.convertVideoToAudio(
      fileUri,
      attachment.extension,
    )

    try {
      const response = await this.sendRecognitionRequest(audioFilePath)
      if (response.status !== 'success' || response.result.length === 0) {
        return []
      }

      const result: MusicSource[] = []
      for (const { songs, offset } of response.result) {
        for (const song of songs) {
          this.logger.log(
            `Found music source: ${song.artist} - ${song.title} (offset: ${offset})`,
          )

          const musicSource = await this.prisma.musicSource.create({
            data: {
              title: song.title,
              artist: song.artist,
              album: song.album,
              label: song.label,
              releaseDate: song.release_date,
              timeCode: song.timecode,
              offset,
              attachment: { connect: { id: attachmentId } },
            },
          })

          result.push(musicSource)
        }
      }

      return result
    } finally {
      await fs.remove(videoFilePath)
      await fs.remove(audioFilePath)
    }
  }

  private async convertVideoToAudio(fileUri: string, extension: string) {
    const storage = this.attachmentService.storage
    const fileStream = await storage.getStreamOf(fileUri)
    const videoFilePath = this.getTemporaryFilePath(extension)
    const videoFileStream = fs.createWriteStream(videoFilePath)

    await pipeline(fileStream, videoFileStream)

    const audioFilePath = this.getTemporaryFilePath('.mp3')

    await new Promise((resolve, reject) => {
      ffmpeg(videoFilePath)
        .outputOptions('-vn', '-ab', '128k', '-ar', '44100')
        .toFormat('mp3')
        .save(audioFilePath)
        .on('error', (err) => reject(err))
        .on('end', () => resolve(audioFilePath))
    })

    return { videoFilePath, audioFilePath }
  }

  private async sendRecognitionRequest(
    audioFilePath: string,
  ): Promise<AudDResponse> {
    const audioFileBlob = await openAsBlob(audioFilePath)

    const formData = new FormData()
    formData.append('file', audioFileBlob)
    formData.append('api_token', 'c3c1742c226020546ffcbb2d490b1a79')

    return fetch('https://enterprise.audd.io/', {
      method: 'POST',
      body: formData,
    }).then((res) => res.json())
  }

  private getTemporaryFilePath(extension: string) {
    const fileName = `${randomUUID()}${extension}`

    return path.join(MusicSourceService.TEMP_FILE_PATH, fileName)
  }
}
