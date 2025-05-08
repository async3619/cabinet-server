import { Inject } from '@nestjs/common'
import { Query, Resolver, Args } from '@nestjs/graphql'

import { FindManyStatisticArgs, Statistic } from '@/generated/graphql'
import { StatisticService } from '@/statistic/statistic.service'

@Resolver()
export class StatisticResolver {
  constructor(
    @Inject(StatisticService)
    private readonly statisticService: StatisticService,
  ) {}

  @Query(() => [Statistic])
  async statistics(@Args() args: FindManyStatisticArgs) {
    return this.statisticService.find(args)
  }
}
