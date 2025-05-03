import type { RawBoard } from '@/crawler/types/board'
import type { RawPost } from '@/crawler/types/post'
import type { RawThread } from '@/crawler/types/thread'
import type { WatcherOptionsMap } from '@/crawler/watchers'

export abstract class BaseProvider<TName extends keyof WatcherOptionsMap> {
  protected constructor(
    readonly name: TName,
    protected readonly options: WatcherOptionsMap[TName],
  ) {}

  abstract getAllBoards(): Promise<RawBoard<TName>[]>

  abstract getThreadsFromBoard(
    board: RawBoard<TName>,
  ): Promise<RawThread<TName>[]>

  abstract getPostsFromThread(
    thread: RawThread<'four-chan'>,
  ): Promise<RawPost<TName>[]>
}
