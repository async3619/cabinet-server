export { type ConfigData } from '@/config/schema'
export { configDataSchema as ConfigDataSchema } from '@/config/schema'

import * as FileSystem from '@/attachment/storages/file-system/schema'
import * as S3 from '@/attachment/storages/s3/schema'
import * as FourChan from '@/crawler/crawlers/four-chan/schema'

export const StorageSchema = { FileSystem, S3 }
export const CrawlerSchema = { FourChan }
