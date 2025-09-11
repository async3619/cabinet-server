import { Module } from '@nestjs/common'

import { AttachmentModule } from '@/attachment/attachment.module'

import { MusicSourceResolver } from './music-source.resolver'
import { MusicSourceService } from './music-source.service'

@Module({
  imports: [AttachmentModule],
  providers: [MusicSourceService, MusicSourceResolver],
})
export class MusicSourceModule {}
