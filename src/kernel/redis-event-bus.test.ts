import { describe, it, expect, vi } from 'vitest';
import { RedisStreamsEventBus } from './redis-event-bus.js';

describe('RedisStreamsEventBus (TDD)', () => {
  it('publishes and subscribes to events with fallback', async () => {
    const bus = new RedisStreamsEventBus(null);
    let captured: any = null;

    const sub = bus.subscribe('eps.equipment.created', (event) => {
      captured = event;
    });

    await bus.publish('eps.equipment.created', { id: 'EQ-01', name: 'Pump' }, { producer: 'module-eps' });

    expect(captured).toBeDefined();
    expect(captured.type).toBe('eps.equipment.created');
    expect(captured.producer).toBe('module-eps');
    expect(captured.payload.name).toBe('Pump');

    // Test unsubscribe
    sub.unsubscribe();
    captured = null;
    await bus.publish('eps.equipment.created', { id: 'EQ-02' });
    expect(captured).toBeNull();
  });

  it('handles wildcard subscribers and subscriber errors safely', async () => {
    const bus = new RedisStreamsEventBus(null);
    let wildcardCaptured: any = null;

    bus.subscribe('*', (evt) => {
      wildcardCaptured = evt;
    });

    bus.subscribe('wms.alert', () => {
      throw new Error('Handler crashed');
    });

    await bus.publish('wms.alert', { stock: 0 });
    expect(wildcardCaptured).not.toBeNull();
    expect(wildcardCaptured.type).toBe('wms.alert');
  });

  it('publishes to redisClient when available', async () => {
    const mockRedis = {
      xadd: vi.fn().mockResolvedValue('12345-0')
    };

    const bus = new RedisStreamsEventBus(mockRedis);
    await bus.publish('test.event', { data: 123 }, { correlationId: 'c-1', producer: 'test' });

    expect(mockRedis.xadd).toHaveBeenCalledWith(
      'ems:events:stream',
      '*',
      'event',
      expect.stringContaining('"correlationId":"c-1"')
    );
  });
});
