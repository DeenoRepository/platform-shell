import { describe, it, expect } from 'vitest';
import { OutboxDispatcher, IOutboxStore, OutboxStoreRecord } from './outbox-dispatcher.js';
import { InMemoryEventBus } from './event-bus-impl.js';

class MockOutboxStore implements IOutboxStore {
  records: OutboxStoreRecord[] = [
    { id: '1', aggregateId: 'A1', eventType: 'test.evt', payload: { x: 1 }, createdAt: '', published: false },
    { id: '2', aggregateId: 'A2', eventType: 'test.evt', payload: { x: 2 }, createdAt: '', published: false }
  ];

  async fetchUnpublished(limit: number): Promise<OutboxStoreRecord[]> {
    return this.records.filter(r => !r.published).slice(0, limit);
  }

  async markAsPublished(ids: string[]): Promise<void> {
    for (const r of this.records) {
      if (ids.includes(r.id)) r.published = true;
    }
  }
}

describe('OutboxDispatcher (TDD)', () => {
  it('dispatches unpublished records through EventBus and marks them published', async () => {
    const store = new MockOutboxStore();
    const eventBus = new InMemoryEventBus();
    const received: any[] = [];

    eventBus.subscribe('test.evt', (e) => {
      received.push(e);
    });

    const dispatcher = new OutboxDispatcher(store, eventBus);
    const count = await dispatcher.dispatchBatch();

    expect(count).toBe(2);
    expect(received).toHaveLength(2);
    expect(store.records.every(r => r.published)).toBe(true);
  });
});
