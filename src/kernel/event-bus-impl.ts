type Handler<T = any> = (event: T) => Promise<void> | void;

export class InMemoryEventBus {
  private subscribers = new Map<string, Set<Handler>>();

  publish<T>(type: string, payload: T, metadata: { correlationId?: string; producer?: string } = {}): Promise<void> {
    const envelope = {
      id: crypto.randomUUID(),
      type,
      producer: metadata.producer || 'shell',
      timestamp: new Date().toISOString(),
      correlationId: metadata.correlationId || crypto.randomUUID(),
      version: 1,
      payload
    };

    const handlers = this.subscribers.get(type) || new Set();
    const wildcards = this.subscribers.get('*') || new Set();

    const promises: Promise<void>[] = [];
    for (const h of [...handlers, ...wildcards]) {
      try {
        const res = h(envelope);
        if (res instanceof Promise) {
          promises.push(res.catch(err => {
            console.error(`[EventBus] Subscriber failed for ${type}:`, err);
          }));
        }
      } catch (err) {
        console.error(`[EventBus] Synchronous error for ${type}:`, err);
      }
    }

    return Promise.all(promises).then(() => {});
  }

  subscribe<T>(type: string, handler: Handler<T>): { unsubscribe: () => void } {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(handler);

    return {
      unsubscribe: () => {
        this.subscribers.get(type)?.delete(handler);
      }
    };
  }
}
