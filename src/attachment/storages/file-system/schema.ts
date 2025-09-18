import { z } from 'zod'

export const fileSystemStorageOptionsSchema = z.object({
  type: z.literal('filesystem'),
  filePath: z.string(),
  thumbnailPath: z.string(),
})

export type FileSystemStorageOptions = z.infer<
  typeof fileSystemStorageOptionsSchema
>
