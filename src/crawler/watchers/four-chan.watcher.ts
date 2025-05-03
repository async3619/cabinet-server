import type { FourChanAPIEndpoints } from '@/crawler/providers/four-chan.provider.types'
import type { BaseWatcherOptions } from '@/crawler/watchers/base.watcher'
import { BaseWatcher } from '@/crawler/watchers/base.watcher'
import { HTTPClient } from '@/utils/fetcher'

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
  private readonly fetcher: HTTPClient<FourChanAPIEndpoints>

  constructor(options: FourChanWatcherOptions) {
    super('four-chan', options)
    this.fetcher = new HTTPClient<FourChanAPIEndpoints>(options.endpoint)
  }
}
