import { IEventBus, ISubscription, EventHandler, DomainEventEnvelope, IRedisStreamsOptions } from '@deenorepository/contracts';

export class RedisStreamsEventBus implements IEventBus {
  private inMemoryFallback: Map<string, Set<EventHandler>> = new Map();

  constructor(
    private readonly redisClient: any,
    private readonly options: IRedisStreamsOptions = {
      streamKey: 'ems:events:stream',
      consumerGroup: 'ems-platform-group',
      consumerName: 'shell-consumer'
    }
  ) {}

  async publish<T>(type: string, payload: T, metadata: { correlationId?: string; producer?: string } = {}): Promise<void> {
    const envelope: DomainEventEnvelope<T> = {
      id: crypto.randomUUID(),
      type,
      producer: metadata.producer || 'shell',
      timestamp: new Date().toISOString(),
      correlationId: metadata.correlationId || crypto.randomUUID(),
      version: 1,
      payload
    };

    if (this.redisClient && typeof this.redisClient.xadd === 'function') {
      await this.redisClient.xadd(
        this.options.streamKey,
        '*',
        'event',
        JSON.stringify(envelope)
      );
    } else {
      // Local fallback for in-process dispatch
      const handlers = this.inMemoryFallback.get(type) || new Set();
      const wildcards = this.inMemoryFallback.get('*') || new Set();
      for (const h of [...handlers, ...wildcards]) {
        await Promise.resolve(h(envelope)).catch(err => {
          console.error(`[RedisEventBus Fallback] Error in subscriber for ${type}:`, err);
        });
      }
    }
  }

  subscribe<T>(type: string, handler: EventHandler<T>): ISubscription {
    if (!this.inMemoryFallback.has(type)) {
      this.inMemoryFallback.set(type, new Set());
    }
    this.inMemoryFallback.get(type)!.add(handler as EventHandler);

    return {
      unsubscribe: () => {
        this.inMemoryFallback.get(type)?.delete(handler as EventHandler);
      }
    };
  }
}
