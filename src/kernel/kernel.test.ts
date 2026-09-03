import { describe, it, expect } from 'vitest';
import { InMemoryEventBus } from './event-bus-impl.js';
import { RbacGuard } from '../security/rbac-guard.js';

describe('Shell Kernel Tests (TDD)', () => {
  it('dispatches events asynchronously without breaking on subscriber error', async () => {
    const bus = new InMemoryEventBus();
    let received = false;

    bus.subscribe('test.event', (e: any) => {
      received = true;
      expect(e.payload.val).toBe(42);
    });

    bus.subscribe('test.event', () => {
      throw new Error('Failing subscriber');
    });

    await bus.publish('test.event', { val: 42 });
    expect(received).toBe(true);
  });

  it('enforces RBAC permissions correctly', () => {
    const rbac = new RbacGuard();
    expect(rbac.hasAccess(['admin'], [], 'wms:stock:write')).toBe(true);
    expect(rbac.hasAccess(['user'], ['wms:stock:read'], 'wms:stock:read')).toBe(true);
    expect(rbac.hasAccess(['user'], ['wms:stock:read'], 'wms:stock:write')).toBe(false);
  });
});
