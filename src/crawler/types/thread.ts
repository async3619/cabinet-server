import type { RawAttachment } from '@/crawler/types/attachment'
import type { RawBoard } from '@/crawler/types/board'
import { getBoardUniqueId } from '@/crawler/types/board'

export interface RawThread<TProviderName extends string> {
  attachments: RawAttachment<TProviderName>[]
  author: string
  board: RawBoard<TProviderName>
  content?: string
  createdAt: number
  no: number
  title?: string
}

export function getThreadUniqueId({ board, no }: RawThread<string>) {
  return [getBoardUniqueId(board), no].filter(Boolean).join('::')
}
