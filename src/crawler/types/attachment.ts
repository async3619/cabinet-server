import type { RawBoard } from '@/crawler/types/board'
import { getBoardUniqueId } from '@/crawler/types/board'

export interface RawAttachment<TProviderName extends string> {
  board: RawBoard<TProviderName>
  createdAt: number
  extension: string
  hash?: string
  height: number
  name: string
  size?: number
  thumbnail?: RawAttachment<TProviderName>
  width: number
}

export function getAttachmentUniqueId(
  attachment: RawAttachment<string>,
): string {
  return (
    attachment.hash ??
    [getBoardUniqueId(attachment.board), attachment.name].join('::')
  )
}
