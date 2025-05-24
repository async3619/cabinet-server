import { Logger } from '@nestjs/common'
import * as _ from 'lodash'

import { FourChanProvider } from '@/crawler/providers/four-chan.provider'
import type { RawPost } from '@/crawler/types/post'
import type { RawThread } from '@/crawler/types/thread'
import { getThreadUniqueId } from '@/crawler/types/thread'
import type { WatcherThread } from '@/crawler/types/watcher-thread'
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

const ENDPOINT_PATHNAME_REGEX_MAP = {
  'a.4cdn.org': /^\/([a-z0-9]*?)\/thread\/(\d+)$/,
}

export class FourChanWatcher extends BaseWatcher<
  'four-chan',
  FourChanWatcherOptions
> {
  private readonly logger = new Logger(FourChanWatcher.name)
  private readonly provider: FourChanProvider
  private readonly archivedThreadCache = new Map<
    number,
    RawThread<'four-chan'> | null
  >()

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

  private parseWatcherThreadUrl(url: string) {
    const endpointUrl = new URL(this.config.endpoint)
    const targetUrl = new URL(url)

    for (const [hostname, regex] of Object.entries(
      ENDPOINT_PATHNAME_REGEX_MAP,
    )) {
      if (endpointUrl.hostname !== hostname) {
        continue
      }

      const result = regex.exec(targetUrl.pathname)
      if (!result) {
        continue
      }

      const boardCode = result[1]
      const threadId = Number(result[2])
      if (isNaN(threadId)) {
        this.logger.warn(`Invalid thread ID: ${result[2]}`)
        return null
      }

      return {
        boardCode,
        threadId,
      }
    }

    return null
  }

  async watch(watcherThreads: WatcherThread[]): Promise<WatcherResult> {
    const matchedThreads: Record<string, RawThread<'four-chan'>> = {}
    const watcherThreadMap: Record<number, string> = {}
    const allBoards = await this.provider.getAllBoards()

    if (watcherThreads.length > 0) {
      try {
        for (const watcherThread of watcherThreads) {
          const { url } = watcherThread
          const threadData = this.parseWatcherThreadUrl(url)
          if (!threadData) {
            this.logger.warn(`Failed to parse watcher thread URL: ${url}`)
            continue
          }

          const { boardCode, threadId } = threadData
          const board = allBoards.find((board) => board.code === boardCode)
          if (!board) {
            this.logger.warn(
              `Failed to find board for watcher thread: /${boardCode}/ (${url})`,
            )
            continue
          }

          const thread = await this.provider.getThreadFromId(threadId, board)
          if (!thread) {
            this.logger.warn(
              `Failed to find thread for watcher thread: ${threadId} (${url})`,
            )
            continue
          }

          const uniqueId = getThreadUniqueId(thread)
          matchedThreads[uniqueId] = thread
          watcherThreadMap[watcherThread.id] = uniqueId
        }
      } catch (e) {
        this.logger.warn(
          `Failed to get actual threads from watcher threads: ${e}`,
        )
      }
    }

    const validBoardCodes = _.chain(this.config.entries)
      .flatMap((entry) => entry.boards)
      .uniq()
      .map<[string, boolean]>((code) => [code, true])
      .fromPairs()
      .value()

    const boards = [
      ...allBoards.filter((board) => validBoardCodes[board.code]),
      ..._.chain(matchedThreads).values().map('board').value(),
    ]
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
          if (this.archivedThreadCache.has(threadId)) {
            const cachedThread = this.archivedThreadCache.get(threadId)
            if (cachedThread) {
              archivedThreadMap[getThreadUniqueId(cachedThread)] = cachedThread
            }

            continue
          }

          const thread = await this.provider.getThreadFromId(threadId, board)
          this.archivedThreadCache.set(threadId, thread)

          archivedThreadMap[getThreadUniqueId(thread)] = thread
        } catch (e) {
          this.archivedThreadCache.set(threadId, null)
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
      watcherThreadIdMap: watcherThreadMap,
    }
  }

  getActualUrl(url: string) {
    const endpointUrl = new URL(this.config.endpoint)
    const targetUrl = new URL(url)

    for (const [hostname, regex] of Object.entries(
      ENDPOINT_PATHNAME_REGEX_MAP,
    )) {
      if (endpointUrl.hostname !== hostname) {
        continue
      }

      if (regex.test(targetUrl.pathname)) {
        targetUrl.search = ''
        return targetUrl.toString()
      }
    }

    return null
  }
}
