import * as fs from 'fs-extra'

import * as path from 'node:path'
import type { Readable } from 'stream'

import { BaseStorage } from '@/attachment/storages/base'
import type {
  GetStreamOfOptions,
  StorageDeleteOptions,
  StorageSaveResult,
} from '@/attachment/storages/base'
import type { RawAttachment } from '@/crawler/types/attachment'
import { downloadFile } from '@/utils/downloadFile'
import { md5 } from '@/utils/hash'
import { mimeType } from '@/utils/mimetype'
import { normalizePath } from '@/utils/normalizePath'

import type { FileSystemStorageOptions } from './schema'

export class FileSystemStorage extends BaseStorage<
  'filesystem',
  FileSystemStorageOptions
> {
  private readonly fileHashMap = new Map<string, string>()

  constructor(options: FileSystemStorageOptions) {
    super('filesystem', options)
  }

  async initialize(): Promise<void> {
    const fileDirectory = normalizePath(this.options.filePath)
    const thumbnailDirectory = normalizePath(this.options.thumbnailPath)

    await fs.ensureDir(fileDirectory)
    await fs.ensureDir(thumbnailDirectory)
  }

  async save(attachment: RawAttachment<string>): Promise<StorageSaveResult> {
    const fileDirectory = normalizePath(this.options.filePath)
    const thumbnailDirectory = normalizePath(this.options.thumbnailPath)

    const filePath = path.join(
      fileDirectory,
      `${attachment.createdAt}${attachment.extension}`,
    )

    const thumbnailFilePath = path.join(
      thumbnailDirectory,
      `${attachment.createdAt}s.jpg`,
    )

    await downloadFile(attachment.url, filePath)
    if (attachment.thumbnail) {
      await downloadFile(attachment.thumbnail.url, thumbnailFilePath)
    }

    const mime = await mimeType(filePath)
    const hash = await md5(filePath)

    return {
      fileUri: filePath,
      hash,
      mime,
      thumbnailUri: attachment.thumbnail ? thumbnailFilePath : undefined,
    }
  }

  async delete({ fileUri, thumbnailUri }: StorageDeleteOptions): Promise<void> {
    if (fileUri && fs.existsSync(fileUri)) {
      await fs.remove(fileUri)
    }

    if (thumbnailUri && fs.existsSync(thumbnailUri)) {
      await fs.remove(thumbnailUri)
    }
  }

  exists(uri: string): Promise<boolean> {
    return fs.pathExists(uri)
  }

  async getHashOf(uri: string): Promise<string | null> {
    let hash: string | undefined = this.fileHashMap.get(uri)
    if (!hash) {
      hash = await md5(uri)
      this.fileHashMap.set(uri, hash)
    }

    return hash
  }

  async getStreamOf(
    uri: string,
    options: GetStreamOfOptions,
  ): Promise<Readable> {
    return fs.createReadStream(uri, options)
  }

  async getSizeOf(uri: string): Promise<number> {
    const { size } = await fs.stat(uri)

    return size
  }
}
