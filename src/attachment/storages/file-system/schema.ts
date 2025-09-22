import { z } from 'zod'

export const fileSystemStorageOptionsSchema = z.object({
  type: z.literal('filesystem'),
  filePath: z.string().min(1, { error: 'File path cannot be empty' }),
  thumbnailPath: z.string().min(1, { error: 'Thumbnail path cannot be empty' }),
})

export type FileSystemStorageOptions = z.infer<
  typeof fileSystemStorageOptionsSchema
>
