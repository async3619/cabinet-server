export type EventMap = {
  [event: string]: (...args: any[]) => void
}

export class EventEmitter<TEventMap extends EventMap> {
  private readonly listeners: { [K in keyof TEventMap]?: Array<TEventMap[K]> } =
    {}

  on<K extends keyof TEventMap>(event: K, listener: TEventMap[K]) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event]!.push(listener)
  }

  off<K extends keyof TEventMap>(event: K, listener: TEventMap[K]) {
    const listeners = this.listeners[event]
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }

  once<K extends keyof TEventMap>(event: K, listener: TEventMap[K]) {
    const wrappedListener = ((...args: Parameters<TEventMap[K]>) => {
      this.off(event, wrappedListener)
      listener(...args)
    }) as TEventMap[K]

    this.on(event, wrappedListener)
  }

  emit<K extends keyof TEventMap>(event: K, ...args: Parameters<TEventMap[K]>) {
    const listeners = this.listeners[event]
    if (listeners) {
      for (const listener of listeners) {
        listener(...args)
      }
    }
  }
}
