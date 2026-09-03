import { describe, it, expect, vi } from 'vitest';
import { CrossModuleEventBridge } from './cross-module-event-bridge.js';
import { InMemoryEventBus } from './event-bus-impl.js';
import { IOutboxStore, OutboxStoreRecord } from './outbox-dispatcher.js';

describe('CrossModuleEventBridge', () => {
  const createMockStore = (records: OutboxStoreRecord[]): IOutboxStore => {
    let unpub = [...records];
    return {
      fetchUnpublished: vi.fn(async (limit: number) => unpub.slice(0, limit)),
      markAsPublished: vi.fn(async (ids: string[]) => {
        unpub = unpub.filter(r => !ids.includes(r.id));
      })
    };
  };

  it('registers module outbox stores and dispatches cross-module batches', async () => {
    const eventBus = new InMemoryEventBus();
    const bridge = new CrossModuleEventBridge(eventBus);

    const epsStore = createMockStore([
      {
        id: 'eps-1',
        aggregateId: 'eq-1',
        eventType: 'eps.equipment.created',
        payload: { name: 'Pump' },
        createdAt: new Date().toISOString(),
        published: false
      }
    ]);

    const wmsStore = createMockStore([
      {
        id: 'wms-1',
        aggregateId: 'item-1',
        eventType: 'wms.stock.reserved',
        payload: { sku: 'BEARING' },
        createdAt: new Date().toISOString(),
        published: false
      }
    ]);

    bridge.registerModule({
      moduleName: 'eps',
      schema: 'eps',
      store: epsStore
    });

    bridge.registerModule({
      moduleName: 'wms',
      schema: 'wms',
      store: wmsStore
    });

    expect(bridge.getRegisteredModules()).toEqual(['eps', 'wms']);

    const dispatched = await bridge.pollAllOnce(10);
    expect(dispatched.eps).toBe(1);
    expect(dispatched.wms).toBe(1);

    expect(epsStore.markAsPublished).toHaveBeenCalledWith(['eps-1']);
    expect(wmsStore.markAsPublished).toHaveBeenCalledWith(['wms-1']);
  });

  it('handles start and stop lifecycle for dispatchers', () => {
    const eventBus = new InMemoryEventBus();
    const bridge = new CrossModuleEventBridge(eventBus);
    const store = createMockStore([]);

    bridge.registerModule({
      moduleName: 'mro',
      schema: 'mro',
      store
    });

    bridge.start();
    bridge.start(); // idempotent

    bridge.registerModule({
      moduleName: 'prm',
      schema: 'prm',
      store
    });

    bridge.stop();
  });
});
