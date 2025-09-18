import { PubSub } from 'graphql-subscriptions'

export type SubscriptionDataMap = Record<string, unknown>

export abstract class SubscribableService<TMap extends SubscriptionDataMap> {
  private readonly pubSub = new PubSub()

  protected publish<TKey extends Exclude<keyof TMap, number | symbol>>(
    eventName: TKey,
    data: TMap[TKey],
  ) {
    this.pubSub.publish(eventName, { [eventName]: data })
  }

  subscribe<TKey extends Exclude<keyof TMap, number | symbol>>(
    eventName: TKey,
  ) {
    return this.pubSub.asyncIterableIterator(eventName)
  }
}
