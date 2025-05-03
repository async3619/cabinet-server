import type { RawBoard } from '@/crawler/types/board'
import type { RawPost } from '@/crawler/types/post'
import type { RawThread } from '@/crawler/types/thread'

export interface BaseWatcherOptions<TName extends string> {
  type: TName
}

export interface WatcherResult {
  boards: RawBoard<string>[]
  posts: RawPost<string>[]
  threads: RawThread<string>[]
}

export abstract class BaseWatcher<
  TName extends string,
  TConfig extends BaseWatcherOptions<TName>,
> {
  protected constructor(
    readonly name: TName,
    readonly config: Readonly<TConfig>,
  ) {}

  abstract watch(): Promise<WatcherResult>
}
