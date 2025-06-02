import type { CrawlerOptionsMap } from '@/crawler/crawlers'
import type { RawBoard } from '@/crawler/types/board'
import type { RawPost } from '@/crawler/types/post'
import type { RawThread } from '@/crawler/types/thread'

export abstract class BaseProvider<TName extends keyof CrawlerOptionsMap> {
  protected constructor(
    readonly name: TName,
    protected readonly options: CrawlerOptionsMap[TName],
  ) {}

  abstract getAllBoards(): Promise<RawBoard<TName>[]>

  abstract getThreadsFromBoard(
    board: RawBoard<TName>,
  ): Promise<RawThread<TName>[]>

  abstract getPostsFromThread(
    thread: RawThread<'four-chan'>,
  ): Promise<RawPost<TName>[]>
}
