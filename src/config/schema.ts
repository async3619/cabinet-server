import { z } from 'zod'

import { storageOptionsSchema } from '@/attachment/storages/schema'
import { crawlerOptionsSchema } from '@/crawler/crawlers/schema'

export const configDataSchema = z
  .object({
    attachment: z.object({
      downloadThrottle: z.object({
        download: z
          .number({ error: 'Download throttle value must be a number' })
          .min(0, { error: 'Download throttle value must be non-negative' }),
        failover: z
          .number({ error: 'Failover throttle value must be a number' })
          .min(0, { error: 'Failover throttle value must be non-negative' }),
      }),
      hashCheck: z
        .boolean({ error: 'Hash check must be a boolean' })
        .optional(),
    }),
    crawling: z.object({
      deleteObsolete: z
        .boolean({ error: 'Delete obsolete must be a boolean' })
        .optional(),
      interval: z.union(
        [
          z.number({ error: 'Crawling interval must be a number' }).positive({
            error: 'Crawling interval must be positive when numeric',
          }),
          z
            .string({ error: 'Crawling interval must be a string' })
            .min(1, { error: 'Crawling interval cannot be empty when string' }),
        ],
        { error: 'Crawling interval must be a number or string' },
      ),
    }),
    storage: storageOptionsSchema,
    watchers: z
      .array(crawlerOptionsSchema)
      .min(1, { error: 'At least one watcher must be configured' }),
  })
  .describe("The application's main configuration schema.")

export type ConfigData = z.infer<typeof configDataSchema>
