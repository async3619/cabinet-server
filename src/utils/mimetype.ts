import {
  fileTypeFromBuffer,
  fileTypeFromStream,
  type FileTypeResult,
} from 'file-type'

import * as fs from 'node:fs'

export async function mimeType(target: string | Buffer) {
  let data: FileTypeResult | undefined
  if (typeof target === 'string') {
    if (!fs.existsSync(target)) {
      throw new Error(`The specified file "${target}" does not exist.`)
    }

    if (fs.statSync(target).isDirectory()) {
      throw new Error(`The path "${target}" points to a directory, not a file.`)
    }

    try {
      fs.accessSync(target, fs.constants.R_OK)
    } catch {
      throw new Error(`The file "${target}" is not readable.`)
    }

    const stream = fs.createReadStream(target)
    data = await fileTypeFromStream(stream)
  } else if (Buffer.isBuffer(target)) {
    data = await fileTypeFromBuffer(target)
  }

  if (!data) {
    return 'application/octet-stream'
  }

  return data.mime
}
