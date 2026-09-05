import http, { IncomingMessage, ServerResponse } from 'node:http';
import { InMemoryEventBus } from './kernel/event-bus-impl.js';
import { RedisStreamsEventBus } from './kernel/redis-event-bus.js';
import { LifecycleManager } from './kernel/lifecycle-manager.js';
import { RbacGuard } from './security/rbac-guard.js';
import { CrossModuleEventBridge } from './kernel/cross-module-event-bridge.js';
import { HttpGateway } from './http/http-gateway.js';

export function createPlatformServer(port = Number(process.env.PORT || 3000)) {
  const eventBus = process.env.REDIS_URL
    ? new RedisStreamsEventBus(null)
    : new InMemoryEventBus();

  const lifecycleManager = new LifecycleManager();
  const rbacGuard = new RbacGuard();
  const eventBridge = new CrossModuleEventBridge(eventBus);

  // Register Navigation for Domain Microfrontends
  lifecycleManager.registerNavigation({
    id: 'eps-nav',
    title: 'Equipment Passports',
    path: '/eps',
    permission: 'eps:equipment:read'
  });

  lifecycleManager.registerNavigation({
    id: 'wms-nav',
    title: 'Warehouse & Stock',
    path: '/wms',
    permission: 'wms:stock:read'
  });

  lifecycleManager.registerNavigation({
    id: 'mro-nav',
    title: 'Maintenance & Repairs',
    path: '/mro',
    permission: 'mro:work_order:read'
  });

  lifecycleManager.registerNavigation({
    id: 'prm-nav',
    title: 'Procurement & Orders',
    path: '/prm',
    permission: 'prm:order:read'
  });

  const gateway = new HttpGateway({
    eventBus,
    lifecycleManager,
    rbacGuard,
    eventBridge
  });

  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    let bodyData = '';
    req.on('data', (chunk: any) => {
      bodyData += chunk;
    });

    req.on('end', async () => {
      let parsedBody: any;
      if (bodyData) {
        try {
          parsedBody = JSON.parse(bodyData);
        } catch {
          parsedBody = bodyData;
        }
      }

      const response = await gateway.handleRequest({
        method: req.method || 'GET',
        url: req.url || '/',
        headers: req.headers,
        body: parsedBody
      });

      res.writeHead(response.statusCode, response.headers);
      res.end(response.body);
    });
  });

  return { server, gateway, port };
}

if (process.argv[1]?.includes('server')) {
  const { server, gateway, port } = createPlatformServer();
  gateway.start().then(() => {
    server.listen(port, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`  🚀 EMS Platform Shell Gateway running on port ${port}`);
      console.log(`  - Health Probe : http://localhost:${port}/health`);
      console.log(`  - Ready Probe  : http://localhost:${port}/ready`);
      console.log(`  - Navigation   : http://localhost:${port}/api/navigation`);
      console.log(`  - Event Publish: http://localhost:${port}/api/events/publish`);
      console.log(`=======================================================`);
    });
  });
}
