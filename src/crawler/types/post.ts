import type { RawThread } from '@/crawler/types/thread'
import { getThreadUniqueId } from '@/crawler/types/thread'

export interface RawPost<TProviderName extends string>
  extends RawThread<TProviderName> {
  thread: RawThread<TProviderName>
}

export function getPostUniqueId({ thread, no }: RawPost<string>) {
  return [getThreadUniqueId(thread), no].join('::')
}
