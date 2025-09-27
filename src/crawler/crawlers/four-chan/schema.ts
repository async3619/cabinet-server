import { z } from 'zod'

export const baseQueryItemSchema = z.object({
  exclude: z.boolean().optional(),
  query: z.string().min(1, { error: 'Query cannot be empty' }),
})

export const textQueryItemSchema = baseQueryItemSchema.extend({
  caseInsensitive: z.boolean().optional(),
  type: z.literal('text'),
})

export const regexQueryItemSchema = baseQueryItemSchema.extend({
  dotAll: z.boolean().optional(),
  ignoreCase: z.boolean().optional(),
  multiline: z.boolean().optional(),
  type: z.literal('regex'),
  unicode: z.boolean().optional(),
})

export const queryItemSchema = z.discriminatedUnion('type', [
  textQueryItemSchema,
  regexQueryItemSchema,
])

export const fourChanCrawlerEntrySchema = z.object({
  boards: z
    .array(z.string().min(1, { error: 'Board name cannot be empty' }))
    .min(1, { error: 'At least one board is required' }),
  queries: z
    .array(queryItemSchema)
    .min(1, { error: 'At least one query is required' }),
  searchArchive: z.boolean().optional(),
  target: z.enum(['title', 'content', 'both']),
})

export const fourChanCrawlerOptionsSchema = z.object({
  name: z.string().min(1, { error: 'Crawler name cannot be empty' }),
  type: z.literal('four-chan'),
  cloudflare: z
    .object({
      bm: z.string().optional(),
      clearance: z
        .string()
        .min(1, { error: 'Cloudflare clearance cannot be empty' }),
    })
    .optional(),
  endpoint: z.string().url({ error: 'Endpoint must be a valid URL' }),
  entries: z
    .array(fourChanCrawlerEntrySchema)
    .min(1, { error: 'At least one entry is required' }),
})

export type BaseQueryItem = z.infer<typeof baseQueryItemSchema>
export type QueryItem = z.infer<typeof queryItemSchema>
export type FourChanCrawlerOptions = z.infer<
  typeof fourChanCrawlerOptionsSchema
>
