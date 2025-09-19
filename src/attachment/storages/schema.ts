import { z } from 'zod'

import { fileSystemStorageOptionsSchema } from '@/attachment/storages/file-system/schema'
import { s3StorageOptionsSchema } from '@/attachment/storages/s3/schema'

export const storageOptionsSchema = z.discriminatedUnion('type', [
  fileSystemStorageOptionsSchema,
  s3StorageOptionsSchema,
])
