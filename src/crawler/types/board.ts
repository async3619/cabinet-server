export interface RawBoard<TProviderName extends string> {
  code: string
  description: string
  namespace: string
  provider: TProviderName
  title: string
}

export function getBoardUniqueId({
  namespace,
  provider,
  code,
}: RawBoard<string>): string {
  return [namespace, provider, code].filter(Boolean).join('::')
}
