import { describe, it, expect } from 'vitest';
import { HttpGateway } from './http-gateway.js';
import { InMemoryEventBus } from '../kernel/event-bus-impl.js';
import { LifecycleManager } from '../kernel/lifecycle-manager.js';
import { CrossModuleEventBridge } from '../kernel/cross-module-event-bridge.js';

describe('HttpGateway', () => {
  const setupGateway = () => {
    const eventBus = new InMemoryEventBus();
    const lifecycleManager = new LifecycleManager();
    const eventBridge = new CrossModuleEventBridge(eventBus);

    lifecycleManager.registerNavigation({
      id: 'eps-nav',
      title: 'Equipment Passport',
      path: '/eps',
      permission: 'eps:equipment:read'
    });

    lifecycleManager.registerNavigation({
      id: 'public-nav',
      title: 'Dashboard',
      path: '/dashboard'
    });

    const gateway = new HttpGateway({
      eventBus,
      lifecycleManager,
      eventBridge
    });

    return { gateway, eventBus, lifecycleManager, eventBridge };
  };

  it('handles /health liveness probe', async () => {
    const { gateway } = setupGateway();
    await gateway.start();

    const res = await gateway.handleRequest({
      method: 'GET',
      url: '/health',
      headers: {}
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('healthy');
  });

  it('handles /ready readiness probe', async () => {
    const { gateway } = setupGateway();

    // Not ready before start
    const notReadyRes = await gateway.handleRequest({
      method: 'GET',
      url: '/ready',
      headers: {}
    });
    expect(notReadyRes.statusCode).toBe(503);

    await gateway.start();

    const readyRes = await gateway.handleRequest({
      method: 'GET',
      url: '/ready',
      headers: {}
    });
    expect(readyRes.statusCode).toBe(200);
    const body = JSON.parse(readyRes.body);
    expect(body.status).toBe('ready');
    expect(body.modulesCount).toBe(2);

    await gateway.stop();
  });

  it('filters /api/navigation items based on RBAC permissions in headers', async () => {
    const { gateway } = setupGateway();
    await gateway.start();

    // User without permission: sees only Dashboard
    const unprivilegedRes = await gateway.handleRequest({
      method: 'GET',
      url: '/api/navigation',
      headers: {}
    });
    expect(unprivilegedRes.statusCode).toBe(200);
    const unprivBody = JSON.parse(unprivilegedRes.body);
    expect(unprivBody.items.length).toBe(1);
    expect(unprivBody.items[0].id).toBe('public-nav');

    // User with eps:equipment:read: sees Dashboard and Equipment
    const privilegedRes = await gateway.handleRequest({
      method: 'GET',
      url: '/api/navigation',
      headers: {
        'x-user-permissions': 'eps:equipment:read'
      }
    });
    const privBody = JSON.parse(privilegedRes.body);
    expect(privBody.items.length).toBe(2);
  });

  it('handles /api/events/publish authorization and error checking', async () => {
    const { gateway, eventBus } = setupGateway();
    await gateway.start();

    let receivedEvent: any = null;
    await eventBus.subscribe('mro.alert', async (evt) => {
      receivedEvent = evt;
    });

    // 403 Forbidden without permission
    const forbiddenRes = await gateway.handleRequest({
      method: 'POST',
      url: '/api/events/publish',
      headers: {},
      body: { eventType: 'mro.alert' }
    });
    expect(forbiddenRes.statusCode).toBe(403);

    // 400 Bad Request if eventType is missing
    const badReqRes = await gateway.handleRequest({
      method: 'POST',
      url: '/api/events/publish',
      headers: { 'x-user-permissions': 'events:publish' },
      body: {}
    });
    expect(badReqRes.statusCode).toBe(400);

    // 202 Accepted with valid event
    const successRes = await gateway.handleRequest({
      method: 'POST',
      url: '/api/events/publish',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-roles': 'admin'
      },
      body: {
        eventType: 'mro.alert',
        payload: { message: 'Pump overheating' }
      }
    });

    expect(successRes.statusCode).toBe(202);
    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent.payload.message).toBe('Pump overheating');
  });

  it('returns 404 for unknown routes', async () => {
    const { gateway } = setupGateway();
    const res = await gateway.handleRequest({
      method: 'GET',
      url: '/api/unknown',
      headers: {}
    });

    expect(res.statusCode).toBe(404);
  });
});
