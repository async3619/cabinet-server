import type { RawBoard } from '@/crawler/types/board'
import type { RawPost } from '@/crawler/types/post'
import type { RawThread } from '@/crawler/types/thread'
import type { WatcherThread } from '@/crawler/types/watcher-thread'
import type { Watcher } from '@/watcher/types/watcher'

export interface BaseCrawlerOptions<TName extends string> {
  name: string
  type: TName
}

export interface CrawlerResult {
  boards: RawBoard<string>[]
  posts: RawPost<string>[]
  threads: RawThread<string>[]
  watcherThreadIdMap: Record<number, string>
}

export abstract class BaseCrawler<
  TName extends string,
  TConfig extends BaseCrawlerOptions<TName>,
> {
  protected constructor(
    readonly name: TName,
    readonly config: Readonly<TConfig>,
    readonly entity: Watcher,
  ) {}

  abstract watch(watcherThreads: WatcherThread[]): Promise<CrawlerResult>

  abstract getActualUrl(url: string): string | null
}
