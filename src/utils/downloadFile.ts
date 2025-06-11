import * as fs from 'node:fs'
import { Readable } from 'stream'
import { finished } from 'stream/promises'

export class DownloadError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message)
  }
}

export async function downloadFile(
  url: string,
  path: string,
  headers?: Record<string, string>,
) {
  const parsedUrl = new URL(url)
  const stream = fs.createWriteStream(path)
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Alt-Used': parsedUrl.host,
      ...headers,
    },
  })
  if (!response.ok) {
    throw new DownloadError(await response.text(), response.status)
  }

  if (!response.body) {
    throw new Error('Invalid response body')
  }

  await finished(Readable.fromWeb(response.body as any).pipe(stream))
}
