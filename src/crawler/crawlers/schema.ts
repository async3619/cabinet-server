import { z } from 'zod'

import { fourChanCrawlerOptionsSchema } from '@/crawler/crawlers/four-chan/schema'

export const crawlerOptionsSchema = z.discriminatedUnion('type', [
  fourChanCrawlerOptionsSchema,
])
