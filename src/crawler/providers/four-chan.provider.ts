import type { FourChanCrawlerOptions } from '@/crawler/crawlers/four-chan.crawler'
import { BaseProvider } from '@/crawler/providers/base.provider'
import type { FourChanAPIEndpoints } from '@/crawler/providers/four-chan.provider.types'
import type { RawAttachment } from '@/crawler/types/attachment'
import type { RawBoard } from '@/crawler/types/board'
import type { RawPost } from '@/crawler/types/post'
import type { RawThread } from '@/crawler/types/thread'
import { HTTPClient } from '@/utils/fetcher'

export class FourChanProvider extends BaseProvider<'four-chan'> {
  private readonly fetcher: HTTPClient<FourChanAPIEndpoints>

  constructor(options: Readonly<FourChanCrawlerOptions>) {
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
        attachments:
          'md5' in thread
            ? [
                {
                  board,
                  name: thread.filename,
                  width: thread.w,
                  height: thread.h,
                  extension: thread.ext,
                  hash: thread.md5,
                  createdAt: thread.tim,
                  size: thread.fsize,
                  url: `https://i.4cdn.org/${board.code}/${thread.tim}${thread.ext}`,
                  thumbnail: {
                    board,
                    name: `${thread.tim}s`,
                    extension: '.jpg',
                    width: thread.tn_w,
                    height: thread.tn_h,
                    createdAt: thread.tim,
                    url: `https://i.4cdn.org/${board.code}/${thread.tim}s.jpg`,
                  },
                } satisfies RawAttachment<'four-chan'>,
              ]
            : [],
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
      attachments:
        'md5' in post
          ? [
              {
                board: thread.board,
                name: post.filename,
                width: post.w,
                height: post.h,
                extension: post.ext,
                hash: post.md5,
                createdAt: post.tim,
                size: post.fsize,
                url: `https://i.4cdn.org/${thread.board.code}/${post.tim}${post.ext}`,
                thumbnail: {
                  board: thread.board,
                  name: `${post.tim}s`,
                  extension: '.jpg',
                  width: post.tn_w,
                  height: post.tn_h,
                  createdAt: post.tim,
                  url: `https://i.4cdn.org/${thread.board.code}/${post.tim}s.jpg`,
                },
              } satisfies RawAttachment<'four-chan'>,
            ]
          : [],
    }))
  }

  async getThreadFromId(
    threadId: number,
    board: RawBoard<'four-chan'>,
  ): Promise<RawThread<'four-chan'>> {
    const { posts } = await this.fetcher.get('/:code/thread/:no.json', {
      params: {
        code: board.code,
        no: threadId.toString(),
      },
    })

    const rawThread = posts[0]
    return {
      board,
      no: rawThread.no,
      title: rawThread.sub,
      content: rawThread.com,
      author: rawThread.name,
      createdAt: rawThread.time,
      attachments:
        'md5' in rawThread
          ? [
              {
                board,
                name: rawThread.filename,
                width: rawThread.w,
                height: rawThread.h,
                extension: rawThread.ext,
                hash: rawThread.md5,
                createdAt: rawThread.tim,
                size: rawThread.fsize,
                url: `https://i.4cdn.org/${board.code}/${rawThread.tim}${rawThread.ext}`,
                thumbnail: {
                  board,
                  name: `${rawThread.tim}s`,
                  extension: '.jpg',
                  width: rawThread.tn_w,
                  height: rawThread.tn_h,
                  createdAt: rawThread.tim,
                  url: `https://i.4cdn.org/${board.code}/${rawThread.tim}s.jpg`,
                },
              } satisfies RawAttachment<'four-chan'>,
            ]
          : [],
    }
  }

  async getArchivedThreadIds(board: RawBoard<'four-chan'>): Promise<number[]> {
    return this.fetcher.get(`/:code/archive.json`, {
      params: { code: board.code },
    })
  }
}
