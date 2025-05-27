import type { RawAttachment } from '@/crawler/types/attachment'

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

export abstract class BaseStorage<
  TName extends string,
  TOptions extends BaseStorageOptions<TName>,
> {
  protected constructor(
    readonly name: TName,
    readonly options: Readonly<TOptions>,
  ) {}

  abstract initialize(): Promise<void>

  abstract save(attachment: RawAttachment<string>): Promise<StorageSaveResult>

  abstract delete(options: StorageDeleteOptions): Promise<void>

  abstract getHashOf(uri: string): Promise<string | null>

  abstract exists(uri: string): Promise<boolean>
}
