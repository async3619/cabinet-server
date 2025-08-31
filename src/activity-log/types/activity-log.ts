export interface CrawlingLogData {
  attachmentsCreated: number
  boardsProcessed: number
  postsCreated: number
  threadsCreated: number
  watcherResults: WatcherResultData[]
}

interface WatcherResultData {
  attachmentsFound: number
  errorMessage?: string
  isSuccessful: boolean
  postsFound: number
  threadsFound: number
  watcherName: string
}

export interface WatcherResult {
  attachmentsFound: number
  errorMessage?: string
  isSuccessful: boolean
  postsFound: number
  threadsFound: number
}

interface CrawlingSuccessData {
  crawlingResult: CrawlingLogData
  isSuccess: true
  type: 'crawling'
}

interface CrawlingFailureData {
  errorMessage: string
  isSuccess: false
  type: 'crawling'
}

interface AttachmentDownloadSuccessData {
  attachmentDownloadResult: AttachmentDownloadLogData
  isSuccess: true
  type: 'attachment-download'
}

interface AttachmentDownloadFailureData {
  attachmentDownloadResult: AttachmentDownloadLogData
  errorMessage: string
  isSuccess: false
  type: 'attachment-download'
}

export type ActivityFinishData =
  | CrawlingSuccessData
  | CrawlingFailureData
  | AttachmentDownloadSuccessData
  | AttachmentDownloadFailureData

export interface AttachmentDownloadLogData {
  attachmentId: string
  downloadDurationMs?: number
  extension: string
  fileSize?: number
  fileUri?: string
  height: number
  httpStatusCode?: number
  mimeType?: string
  name: string
  retryCount: number
  thumbnailGenerated: boolean
  width: number
}

export interface ActivityStartResult {
  id: number
  startTime: Date
}
