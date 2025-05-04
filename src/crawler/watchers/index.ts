import { FourChanWatcher } from '@/crawler/watchers/four-chan.watcher'
import type { Thread } from '@/generated/graphql'
import type { Watcher } from '@/watcher/types/watcher'

type WatcherTypes = FourChanWatcher

export type WatcherMap = {
  [TName in WatcherTypes['name']]: Extract<WatcherTypes, { name: TName }>
}

type WatcherConstructorMap = {
  [TName in WatcherTypes['name']]: {
    new (
      config: Extract<WatcherTypes, { name: TName }>['config'],
      watcher: Watcher,
    ): Extract<WatcherTypes, { name: TName }>

    checkIfMatched(
      config: Extract<WatcherTypes, { name: TName }>['config'],
      thread: Thread,
    ): boolean
  }
}

export type WatcherOptionsMap = {
  [TName in WatcherTypes['name']]: WatcherMap[TName]['config']
}

export const WATCHER_CONSTRUCTOR_MAP: WatcherConstructorMap = {
  'four-chan': FourChanWatcher,
}
