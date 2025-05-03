import { FourChanProvider } from '@/crawler/providers/four-chan.provider'
import type { RawBoard } from '@/crawler/types/board'
import type { BaseWatcherOptions } from '@/crawler/watchers/base.watcher'
import { BaseWatcher } from '@/crawler/watchers/base.watcher'

interface FourChanWatcherEntry {
  boards: string[]
  query: string
  target: 'title' | 'content' | 'both'
}

export interface FourChanWatcherOptions
  extends BaseWatcherOptions<'four-chan'> {
  endpoint: string
  entries: FourChanWatcherEntry[]
}

export class FourChanWatcher extends BaseWatcher<
  'four-chan',
  FourChanWatcherOptions
> {
  private readonly provider: FourChanProvider

  constructor(options: FourChanWatcherOptions) {
    super('four-chan', options)
    this.provider = new FourChanProvider(options)
  }

  async watch(): Promise<RawBoard<'four-chan'>[]> {
    const boards = await this.provider.getAllBoards()

    return boards
  }
}
