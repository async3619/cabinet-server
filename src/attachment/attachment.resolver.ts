import { Inject } from '@nestjs/common'
import {
  Args,
  Int,
  Mutation,
  Query,
  ResolveField,
  Resolver,
  Root,
} from '@nestjs/graphql'
import { GraphQLBigInt } from 'graphql-scalars'

import { AttachmentService } from '@/attachment/attachment.service'
import {
  Attachment,
  AttachmentCount,
  FindManyAttachmentArgs,
  FindUniqueAttachmentArgs,
  Post,
  Thread,
  Watcher,
} from '@/generated/graphql'

@Resolver(() => Attachment)
export class AttachmentResolver {
  constructor(
    @Inject(AttachmentService)
    private readonly attachmentService: AttachmentService,
  ) {}

  @Query(() => Int)
  async attachmentCount(): Promise<number> {
    return this.attachmentService.count()
  }

  @Query(() => GraphQLBigInt)
  async totalSize(): Promise<number> {
    const { _sum } = await this.attachmentService.aggregate({
      _sum: {
        size: true,
      },
    })

    return _sum.size ?? 0
  }

  @Query(() => Attachment)
  async attachment(
    @Args() args: FindUniqueAttachmentArgs,
  ): Promise<Attachment | null> {
    return this.attachmentService.findOne(args)
  }

  @Query(() => [Attachment])
  async attachments(
    @Args() args: FindManyAttachmentArgs,
  ): Promise<Attachment[]> {
    return this.attachmentService.find(args)
  }

  @Mutation(() => Boolean)
  async markAttachmentAsFavorite(
    @Args('id', { type: () => String }) id: string,
    @Args('favorite', { type: () => Boolean }) favorite: boolean,
  ): Promise<boolean> {
    await this.attachmentService.update({
      where: { id },
      data: { favorite },
    })

    return true
  }

  @ResolveField(() => [Thread])
  async threads(@Root() attachment: Attachment) {
    return this.attachmentService
      .findOne({
        where: { id: attachment.id },
      })
      .threads()
  }

  @ResolveField(() => [Post])
  async posts(@Root() attachment: Attachment) {
    return this.attachmentService
      .findOne({
        where: { id: attachment.id },
      })
      .posts()
  }

  @ResolveField(() => [Watcher])
  async watchers(@Root() attachment: Attachment) {
    return this.attachmentService
      .findOne({
        where: { id: attachment.id },
      })
      .watchers()
  }

  @ResolveField(() => AttachmentCount)
  async _count(@Root() attachment: Attachment) {
    const result = await this.attachmentService.findOne({
      select: { _count: true },
      where: { id: attachment.id },
    })

    if (!result) {
      throw new Error('Relation count aggregation failed')
    }

    return result._count
  }

  @ResolveField(() => Boolean)
  async isVideo(@Root() attachment: Attachment) {
    return attachment.mime?.startsWith('video/') ?? false
  }
}
