export interface BaseWatcherOptions<TName extends string> {
  type: TName
}

export abstract class BaseWatcher<
  TName extends string,
  TConfig extends BaseWatcherOptions<TName>,
> {
  protected constructor(
    readonly name: TName,
    readonly config: Readonly<TConfig>,
  ) {}
}
