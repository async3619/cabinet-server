import { FourChanCrawler } from '@/crawler/crawlers/four-chan.crawler'
import type { Thread } from '@/generated/graphql'
import type { Watcher } from '@/watcher/types/watcher'

type CrawlerTypes = FourChanCrawler

export type CrawlerMap = {
  [TName in CrawlerTypes['name']]: Extract<CrawlerTypes, { name: TName }>
}

type CrawlerConstructorMap = {
  [TName in CrawlerTypes['name']]: {
    new (
      config: Extract<CrawlerTypes, { name: TName }>['config'],
      watcher: Watcher,
    ): Extract<CrawlerTypes, { name: TName }>

    checkIfMatched(
      config: Extract<CrawlerTypes, { name: TName }>['config'],
      thread: Thread,
    ): boolean
  }
}

export type CrawlerOptionsMap = {
  [TName in CrawlerTypes['name']]: CrawlerMap[TName]['config']
}

export const CRAWLER_CONSTRUCTOR_MAP: CrawlerConstructorMap = {
  'four-chan': FourChanCrawler,
}
