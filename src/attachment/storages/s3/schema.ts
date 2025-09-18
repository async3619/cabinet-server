import { z } from 'zod'

export const s3StorageOptionsSchema = z.object({
  type: z.literal('s3'),
  bypassExistsCheck: z.boolean().optional(),
  credentials: z
    .object({
      accessKeyId: z.string(),
      secretAccessKey: z.string(),
    })
    .optional(),
  endpoint: z.string().optional(),
  ensureBucketExists: z.boolean().optional(),
  fileBucketUri: z.string(),
  region: z.string().optional(),
  thumbnailBucketUri: z.string(),
})

export type S3StorageOptions = z.infer<typeof s3StorageOptionsSchema>
