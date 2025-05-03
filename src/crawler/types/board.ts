export interface RawBoard<TProviderName extends string> {
  code: string
  description: string
  provider: TProviderName
  title: string
}
