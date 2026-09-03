import { IEventBus } from '@deenorepository/contracts';

export interface OutboxStoreRecord {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
  published: boolean;
}

export interface IOutboxStore {
  fetchUnpublished(limit: number): Promise<OutboxStoreRecord[]>;
  markAsPublished(ids: string[]): Promise<void>;
}

export class OutboxDispatcher {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly store: IOutboxStore,
    private readonly eventBus: IEventBus,
    private readonly pollIntervalMs = 1000
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.dispatchBatch().catch(err => {
        console.error('[OutboxDispatcher] Batch dispatch error:', err);
      });
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async dispatchBatch(batchSize = 50): Promise<number> {
    const records = await this.store.fetchUnpublished(batchSize);
    if (records.length === 0) return 0;

    const publishedIds: string[] = [];
    for (const rec of records) {
      try {
        await this.eventBus.publish(rec.eventType, rec.payload, {
          correlationId: rec.id,
          producer: 'outbox-dispatcher'
        });
        publishedIds.push(rec.id);
      } catch (err) {
        console.error(`[OutboxDispatcher] Failed to publish event ${rec.id}:`, err);
        break;
      }
    }

    if (publishedIds.length > 0) {
      await this.store.markAsPublished(publishedIds);
    }

    return publishedIds.length;
  }
}
