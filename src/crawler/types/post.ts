import type { RawBoard } from '@/crawler/types/board'
import type { RawThread } from '@/crawler/types/thread'
import { getThreadUniqueId } from '@/crawler/types/thread'

export interface RawPost<TProviderName extends string> {
  author: string
  board: RawBoard<TProviderName>
  content?: string
  createdAt: number
  no: number
  thread: RawThread<TProviderName>
  title?: string
}

export function getPostUniqueId({ thread, no }: RawPost<string>) {
  return [getThreadUniqueId(thread), no].join('::')
}
