export interface BaseWatcherOptions {}

export abstract class BaseWatcher<
  TName extends string,
  TConfig extends BaseWatcherOptions,
> {
  protected constructor(
    readonly name: TName,
    readonly config: Readonly<TConfig>,
  ) {}
}
