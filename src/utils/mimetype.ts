import { fileTypeFromStream } from 'file-type'

import * as fs from 'node:fs'

export async function mimeType(filePath: string) {
  const stream = fs.createReadStream(filePath)
  const data = await fileTypeFromStream(stream)
  if (!data) {
    return 'application/octet-stream'
  }

  return data.mime
}
