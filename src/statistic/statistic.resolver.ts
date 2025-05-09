import { Inject } from '@nestjs/common'
import { Query, Resolver, Args, ResolveField, Root } from '@nestjs/graphql'
import { GraphQLBigInt } from 'graphql-scalars'

import { FindManyStatisticArgs, Statistic } from '@/generated/graphql'
import { StatisticService } from '@/statistic/statistic.service'

@Resolver(() => Statistic)
export class StatisticResolver {
  constructor(
    @Inject(StatisticService)
    private readonly statisticService: StatisticService,
  ) {}

  @Query(() => [Statistic])
  async statistics(@Args() args: FindManyStatisticArgs) {
    return this.statisticService.find(args)
  }

  @ResolveField(() => GraphQLBigInt)
  async totalSize(@Root() statistic: Statistic) {
    return statistic.totalSize
  }
}
