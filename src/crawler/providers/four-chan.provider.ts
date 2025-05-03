import { BaseProvider } from '@/crawler/providers/base.provider'
import type { FourChanAPIEndpoints } from '@/crawler/providers/four-chan.provider.types'
import type { RawBoard } from '@/crawler/types/board'
import type { RawPost } from '@/crawler/types/post'
import type { RawThread } from '@/crawler/types/thread'
import type { FourChanWatcherOptions } from '@/crawler/watchers/four-chan.watcher'
import { HTTPClient } from '@/utils/fetcher'

export class FourChanProvider extends BaseProvider<'four-chan'> {
  private readonly fetcher: HTTPClient<FourChanAPIEndpoints>

  constructor(options: Readonly<FourChanWatcherOptions>) {
    super('four-chan', options)
    this.fetcher = new HTTPClient<FourChanAPIEndpoints>(options.endpoint)
  }

  async getAllBoards(): Promise<RawBoard<'four-chan'>[]> {
    const { boards } = await this.fetcher.get('/boards.json')

    return boards.map((board) => ({
      namespace: new URL(this.options.endpoint).host,
      provider: this.name,
      code: board.board,
      title: board.title,
      description: board.meta_description,
    }))
  }

  async getThreadsFromBoard(
    board: RawBoard<'four-chan'>,
  ): Promise<RawThread<'four-chan'>[]> {
    const allPages = await this.fetcher.get('/:code/catalog.json', {
      params: { code: board.code },
    })

    return allPages
      .flatMap((page) => page.threads)
      .map((thread) => ({
        board,
        no: thread.no,
        title: thread.sub,
        content: thread.com,
        author: thread.name,
        createdAt: thread.time,
      }))
  }

  async getPostsFromThread(
    thread: RawThread<'four-chan'>,
  ): Promise<RawPost<'four-chan'>[]> {
    const { posts } = await this.fetcher.get('/:code/thread/:no.json', {
      params: {
        code: thread.board.code,
        no: thread.no.toString(),
      },
    })

    return posts.map((post) => ({
      thread,
      board: thread.board,
      no: post.no,
      title: post.sub,
      content: post.com,
      author: post.name,
      createdAt: post.time,
    }))
  }
}
