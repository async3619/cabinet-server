import * as crypto from 'crypto'
import * as fs from 'node:fs'

export async function md5(filePath: fs.PathLike) {
  if (!fs.existsSync(filePath))
    throw new Error(
      `The specified file "${filePath}" does not exist. Please check the path and try again.`,
    )

  if (fs.statSync(filePath).isDirectory())
    throw new Error(
      `The path "${filePath}" points to a directory, not a file. Please provide a valid file path.`,
    )

  try {
    fs.accessSync(filePath, fs.constants.R_OK)
  } catch {
    throw new Error(
      `The file "${filePath}" is not readable. Please check your permissions.`,
    )
  }

  const md5Hash = await (() => {
    return new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash('md5')
      const fileStream = fs.createReadStream(filePath)

      fileStream.on('error', (err) => {
        reject(err)
      })

      fileStream.on('data', (chunk) => {
        hash.update(chunk)
      })

      fileStream.on('end', () => {
        resolve(hash.digest('hex'))
      })
    })
  })()

  const source = md5Hash.length % 2 ? md5Hash + '0' : md5Hash
  let result = ''
  for (let i = 0; i < source.length; i += 2) {
    result += String.fromCharCode(parseInt(source.slice(i, i + 2), 16))
  }

  return Buffer.from(result, 'ascii').toString('base64')
}
