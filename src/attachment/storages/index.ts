import { FileSystemStorage } from '@/attachment/storages/file-system.storage'

type StorageTypes = FileSystemStorage

type StorageMap = {
  [TName in StorageTypes['name']]: Extract<StorageTypes, { name: TName }>
}

type StorageConstructorMap = {
  [TName in StorageTypes['name']]: {
    new (
      options: Extract<StorageTypes, { name: TName }>['options'],
    ): Extract<StorageTypes, { name: TName }>
  }
}

export type StorageOptionsMap = {
  [TName in StorageTypes['name']]: StorageMap[TName]['options']
}

export const STORAGE_CONSTRUCTOR_MAP: StorageConstructorMap = {
  filesystem: FileSystemStorage,
}
