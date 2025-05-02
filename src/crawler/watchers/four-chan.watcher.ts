import type { BaseWatcherOptions } from '@/crawler/watchers/base.watcher'
import { BaseWatcher } from '@/crawler/watchers/base.watcher'

interface FourChanWatcherEntry {
  boards: string[]
  query: string
  target: 'title' | 'content' | 'both'
}

interface FourChanWatcherOptions extends BaseWatcherOptions<'four-chan'> {
  endpoint: string
  entries: FourChanWatcherEntry[]
}

export class FourChanWatcher extends BaseWatcher<
  'four-chan',
  FourChanWatcherOptions
> {
  constructor(options: FourChanWatcherOptions) {
    super('four-chan', options)
  }
}
