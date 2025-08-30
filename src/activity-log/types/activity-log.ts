export interface CrawlingLogData {
  attachmentsCreated: number
  boardsProcessed: number
  postsCreated: number
  threadsCreated: number
  watcherResults: WatcherResultData[]
}

export interface WatcherResultData {
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

export interface ActivityLogCreateData {
  activityType: string
  crawlingResult?: CrawlingLogData
  endTime?: Date
  errorMessage?: string
  isSuccess?: boolean
  startTime: Date
}

export interface ActivityFinishData {
  crawlingResult?: CrawlingLogData
  errorMessage?: string
  isSuccess: boolean
}

export interface ActivityStartResult {
  id: number
  startTime: Date
}

export interface CrawlingStatistics {
  avgAttachmentsPerRun: number
  avgPostsPerRun: number
  avgThreadsPerRun: number
  totalLogs: number
}
