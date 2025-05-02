import { FourChanWatcher } from '@/crawler/watchers/four-chan.watcher'

type WatcherTypes = FourChanWatcher

export type WatcherMap = {
  [TName in WatcherTypes['name']]: Extract<WatcherTypes, { name: TName }>
}

type WatcherConstructorMap = {
  [TName in WatcherTypes['name']]: {
    new (
      config: Extract<WatcherTypes, { name: TName }>['config'],
    ): Extract<WatcherTypes, { name: TName }>
  }
}

export const WATCHER_CONSTRUCTOR_MAP: WatcherConstructorMap = {
  'four-chan': FourChanWatcher,
}
