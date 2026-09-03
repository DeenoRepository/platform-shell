import { describe, it, expect } from 'vitest';
import { RedisStreamsEventBus } from './redis-event-bus.js';

describe('RedisStreamsEventBus (TDD)', () => {
  it('publishes and subscribes to events with fallback', async () => {
    const bus = new RedisStreamsEventBus(null);
    let captured: any = null;

    bus.subscribe('eps.equipment.created', (event) => {
      captured = event;
    });

    await bus.publish('eps.equipment.created', { id: 'EQ-01', name: 'Pump' }, { producer: 'module-eps' });

    expect(captured).toBeDefined();
    expect(captured.type).toBe('eps.equipment.created');
    expect(captured.producer).toBe('module-eps');
    expect(captured.payload.name).toBe('Pump');
  });
});
