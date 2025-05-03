import { BaseProvider } from '@/crawler/providers/base.provider'
import type { FourChanAPIEndpoints } from '@/crawler/providers/four-chan.provider.types'
import type { RawBoard } from '@/crawler/types/board'
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
}
