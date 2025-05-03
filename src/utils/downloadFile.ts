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

export async function downloadFile(url: string, path: string) {
  const stream = fs.createWriteStream(path)
  const response = await fetch(url)
  if (!response.ok) {
    throw new DownloadError(await response.text(), response.status)
  }

  if (!response.body) {
    throw new Error('Invalid response body')
  }

  await finished(Readable.fromWeb(response.body as any).pipe(stream))
}
