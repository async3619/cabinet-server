import { z } from 'zod'

export const baseQueryItemSchema = z.object({
  exclude: z.boolean().optional(),
  query: z.string(),
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
  boards: z.array(z.string()),
  queries: z.array(queryItemSchema),
  searchArchive: z.boolean().optional(),
  target: z.enum(['title', 'content', 'both']),
})

export const fourChanCrawlerOptionsSchema = z.object({
  name: z.string(),
  type: z.literal('four-chan'),
  cloudflare: z
    .object({
      bm: z.string().optional(),
      clearance: z.string(),
    })
    .optional(),
  endpoint: z.string(),
  entries: z.array(fourChanCrawlerEntrySchema),
})

export type BaseQueryItem = z.infer<typeof baseQueryItemSchema>
export type QueryItem = z.infer<typeof queryItemSchema>
export type FourChanCrawlerOptions = z.infer<
  typeof fourChanCrawlerOptionsSchema
>
