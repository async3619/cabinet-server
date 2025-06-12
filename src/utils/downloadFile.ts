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
      'Alt-Used': parsedUrl.host,
      'Upgrade-Insecure-Requests': '1',
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

/**
 curl -i \
 -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0" \
 -H "Alt-Used: https://i.4cdn.org" \
 -H "Upgrade-Insecure-Requests: 1" \
 https://i.4cdn.org/wsg/1748784299690437.mp4
 */
