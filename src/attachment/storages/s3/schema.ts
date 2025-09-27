import { z } from 'zod'

export const s3StorageOptionsSchema = z.object({
  type: z.literal('s3'),
  bypassExistsCheck: z.boolean().optional(),
  credentials: z
    .object({
      accessKeyId: z
        .string()
        .min(1, { error: 'Access key ID cannot be empty' }),
      secretAccessKey: z
        .string()
        .min(1, { error: 'Secret access key cannot be empty' }),
    })
    .optional(),
  endpoint: z
    .string()
    .url({ error: 'Endpoint must be a valid URL' })
    .optional(),
  ensureBucketExists: z.boolean().optional(),
  fileBucketUri: z
    .string()
    .min(1, { error: 'File bucket URI cannot be empty' }),
  region: z.string().optional(),
  thumbnailBucketUri: z
    .string()
    .min(1, { error: 'Thumbnail bucket URI cannot be empty' }),
})

export type S3StorageOptions = z.infer<typeof s3StorageOptionsSchema>
