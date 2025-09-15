import { Inject } from '@nestjs/common'
import { Mutation, Query, Resolver, Subscription } from '@nestjs/graphql'

import { CrawlerService } from '@/crawler/crawler.service'

@Resolver()
export class CrawlerResolver {
  constructor(
    @Inject(CrawlerService) private readonly crawlerService: CrawlerService,
  ) {}

  @Query(() => Boolean)
  async isCrawlerRunning(): Promise<boolean> {
    return this.crawlerService.isCrawling
  }

  @Mutation(() => Boolean)
  async startCrawler() {
    this.crawlerService.doCrawl()
    return true
  }

  @Subscription(() => Boolean)
  crawlingStatusChanged() {
    return this.crawlerService.subscribe('crawlingStatusChanged')
  }
}
