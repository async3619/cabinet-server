export interface StorageSaveResult {
  fileUri: string
  hash: string
  mime: string
  thumbnailUri?: string
}

export interface StorageDeleteOptions {
  fileUri?: string | null
  thumbnailUri?: string | null
}

export interface BaseStorageOptions<TName extends string> {
  type: TName
}

export interface GetStreamOfOptions {
  end?: number
  highWaterMark?: number
  start?: number
}
