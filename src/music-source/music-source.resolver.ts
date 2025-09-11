import { Inject } from '@nestjs/common'
import { Args, Mutation, ResolveField, Resolver, Root } from '@nestjs/graphql'

import { Attachment, MusicSource } from '@/generated/graphql'
import { MusicSourceService } from '@/music-source/music-source.service'

@Resolver(() => MusicSource)
export class MusicSourceResolver {
  constructor(
    @Inject(MusicSourceService)
    private readonly musicSourceService: MusicSourceService,
  ) {}

  @Mutation(() => [MusicSource])
  findMusicSource(
    @Args('attachmentId', { type: () => String }) attachmentId: string,
  ) {
    return this.musicSourceService.findSourceOf(attachmentId)
  }

  @ResolveField(() => Attachment)
  async attachment(@Root() musicSource: MusicSource) {
    return this.musicSourceService
      .findOne({
        where: { id: musicSource.id },
      })
      .attachment()
  }
}
