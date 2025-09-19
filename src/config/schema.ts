import { z } from 'zod'

import { storageOptionsSchema } from '@/attachment/storages/schema'
import { crawlerOptionsSchema } from '@/crawler/crawlers/schema'

export const configDataSchema = z
  .object({
    attachment: z.object({
      downloadThrottle: z.object({
        download: z.number(),
        failover: z.number(),
      }),
      hashCheck: z.boolean().optional(),
    }),
    crawling: z.object({
      deleteObsolete: z.boolean().optional(),
      interval: z.union([z.number(), z.string()]),
    }),
    storage: storageOptionsSchema,
    watchers: z.array(crawlerOptionsSchema),
  })
  .describe("The application's main configuration schema.")

export type ConfigData = z.infer<typeof configDataSchema>
