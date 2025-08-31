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

interface ActivitySuccessData {
  crawlingResult: CrawlingLogData
  isSuccess: true
}

interface ActivityFailureData {
  errorMessage: string
  isSuccess: false
}

export type ActivityFinishData = ActivitySuccessData | ActivityFailureData

export interface ActivityStartResult {
  id: number
  startTime: Date
}
