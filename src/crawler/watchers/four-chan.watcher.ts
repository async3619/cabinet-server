import { Logger } from '@nestjs/common'
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
import type { Thread } from '@/generated/graphql'
import type { Watcher } from '@/watcher/types/watcher'

interface FourChanWatcherEntry {
  boards: string[]
  caseInsensitive?: boolean
  queries: string[]
  searchArchive?: boolean
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
  private readonly logger = new Logger(FourChanWatcher.name)
  private readonly provider: FourChanProvider

  static checkIfMatched(options: FourChanWatcherOptions, thread: Thread) {
    if (!thread.board) {
      throw new Error("Given thread doesn't have board data")
    }

    for (const { boards, target, queries } of options.entries) {
      if (!boards.includes(thread.board.code)) {
        continue
      }

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
    }

    return false
  }

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

    const archivedThreadMap: Record<string, RawThread<'four-chan'>> = {}
    const allSearchArchiveTargetBoards = _.chain(this.config.entries)
      .filter((entry) => entry.searchArchive ?? false)
      .flatMap((entry) => entry.boards)
      .uniq()
      .value()

    for (const boardCode of allSearchArchiveTargetBoards) {
      const board = boards.find((board) => board.code === boardCode)
      if (!board) {
        throw new Error(`Could not find board for search archive: ${boardCode}`)
      }

      const threadIds = await this.provider.getArchivedThreadIds(board)
      for (const threadId of threadIds) {
        try {
          const thread = await this.provider.getThreadFromId(threadId, board)
          if (!thread) {
            throw new Error(
              `Could not find thread for search archive: ${threadId}`,
            )
          }

          archivedThreadMap[getThreadUniqueId(thread)] = thread
        } catch (e) {
          this.logger.error(
            `Failed to get archived thread ${threadId} from board ${boardCode}: ${e}`,
          )
        }
      }
    }

    const entryThreadPairs = _.chain(this.config.entries)
      .map(
        (entry) =>
          [
            entry,
            [
              ..._.chain(threadMap)
                .values()
                .filter((thread) => entry.boards.includes(thread.board.code))
                .value(),
              ..._.chain(archivedThreadMap)
                .values()
                .filter(
                  (thread) =>
                    (entry.searchArchive ?? false) &&
                    entry.boards.includes(thread.board.code),
                )
                .value(),
            ],
          ] as const,
      )
      .value()

    const matchedThreads: Record<string, RawThread<'four-chan'>> = {}
    for (const [entry, threads] of entryThreadPairs) {
      const filteredThreads = threads.filter((thread) => {
        const { target, caseInsensitive } = entry
        let title = thread.title
        let content = thread.content
        let queries = entry.queries
        if (caseInsensitive) {
          title = title?.toLowerCase()
          content = content?.toLowerCase()
          queries = queries.map((query) => query.toLowerCase())
        }

        const titleMatched = queries.some((query) => title?.includes(query))
        const contentMatched = queries.some((query) => content?.includes(query))

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
