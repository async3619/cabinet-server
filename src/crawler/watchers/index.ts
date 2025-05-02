import type { FourChanWatcher } from '@/crawler/watchers/four-chan.watcher'

type WatcherTypes = FourChanWatcher

export type WatcherMap = {
  [TName in WatcherTypes['name']]: Extract<WatcherTypes, { name: TName }>
}
