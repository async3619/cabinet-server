import type { RawBoard } from '@/crawler/types/board'
import type { WatcherOptionsMap } from '@/crawler/watchers'

export abstract class BaseProvider<TName extends keyof WatcherOptionsMap> {
  protected constructor(
    readonly name: TName,
    protected readonly options: WatcherOptionsMap[TName],
  ) {}

  abstract getAllBoards(): Promise<RawBoard<TName>[]>
}
