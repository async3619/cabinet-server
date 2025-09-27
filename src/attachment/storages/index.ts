import { FileSystemStorage } from '@/attachment/storages/file-system'
import { S3Storage } from '@/attachment/storages/s3'

type StorageTypes = FileSystemStorage | S3Storage

type StorageMap = {
  [TName in StorageTypes['name']]: Extract<StorageTypes, { name: TName }>
}

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
