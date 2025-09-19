import { z } from 'zod'

import {
  FileSystemStorage,
  fileSystemStorageOptionsSchema,
} from './file-system'
import { S3Storage, s3StorageOptionsSchema } from './s3'

type StorageTypes = FileSystemStorage | S3Storage

type StorageMap = {
  [TName in StorageTypes['name']]: Extract<StorageTypes, { name: TName }>
}

export const storageOptionsSchema = z.discriminatedUnion('type', [
  fileSystemStorageOptionsSchema,
  s3StorageOptionsSchema,
])

type StorageOptionsMap = {
  [TName in StorageTypes['name']]: StorageMap[TName]['options']
}

export function createStorageInstance<T extends StorageTypes['name']>(
  options: StorageOptionsMap[T],
) {
  switch (options.type) {
    case 'filesystem':
      return new FileSystemStorage(options)

    case 's3':
      return new S3Storage(options)

    default:
      throw new Error(`Unsupported storage type: ${(options as any).type}`)
  }
}
