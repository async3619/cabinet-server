import * as _ from 'lodash'

import { FourChanProvider } from '@/crawler/providers/four-chan.provider'
import type { RawPost } from '@/crawler/types/post'
import type { RawThread } from '@/crawler/types/thread'
import { getThreadUniqueId } from '@/crawler/types/thread'
import type {
  BaseWatcherOptions,
  WatcherResult,
} from '@/crawler/watchers/base.watcher'
import { BaseWatcher } from '@/crawler/watchers/base.watcher'
import type { Watcher } from '@/watcher/types/watcher'

interface FourChanWatcherEntry {
  boards: string[]
  queries: string[]
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

  constructor(options: FourChanWatcherOptions, watcher: Watcher) {
    super('four-chan', options, watcher)
    this.provider = new FourChanProvider(options)
  }

  async watch(): Promise<WatcherResult> {
    const validBoardCodes = _.chain(this.config.entries)
      .flatMap((entry) => entry.boards)
      .uniq()
      .map<[string, boolean]>((code) => [code, true])
      .fromPairs()
      .value()

    const boards = await this.provider
      .getAllBoards()
      .then((boards) => boards.filter((board) => validBoardCodes[board.code]))

    const threadMap: Record<string, RawThread<'four-chan'>> = {}
    for (const board of boards) {
      const threads = await this.provider.getThreadsFromBoard(board)
      for (const thread of threads) {
        threadMap[getThreadUniqueId(thread)] = thread
      }
    }

    const entryThreadPairs = _.chain(this.config.entries)
      .map(
        (entry) =>
          [
            entry,
            _.chain(threadMap)
              .values()
              .filter((thread) => entry.boards.includes(thread.board.code))
              .value(),
          ] as const,
      )
      .value()

    const matchedThreads: Record<string, RawThread<'four-chan'>> = {}
    for (const [{ queries, target }, threads] of entryThreadPairs) {
      const filteredThreads = threads.filter((thread) => {
        const titleMatched = queries.some((query) =>
          thread.title?.includes(query),
        )
        const contentMatched = queries.some((query) =>
          thread.content?.includes(query),
        )

        if (target === 'title') {
          return titleMatched
        } else if (target === 'content') {
          return contentMatched
        } else if (target === 'both') {
          return titleMatched || contentMatched
        }
      })

      for (const thread of filteredThreads) {
        matchedThreads[getThreadUniqueId(thread)] = thread
      }
    }

    const targetThreads = Object.values(matchedThreads)
    const posts: RawPost<'four-chan'>[] = []
    for (const thread of targetThreads) {
      const allPosts = await this.provider.getPostsFromThread(thread)
      posts.push(...allPosts)
    }

    return {
      boards,
      posts,
      threads: targetThreads,
    }
  }
}
