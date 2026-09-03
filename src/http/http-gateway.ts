import { IEventBus } from '@deenorepository/contracts';
import { RbacGuard, UserSecurityContext } from '../security/rbac-guard.js';
import { LifecycleManager, NavigationItem } from '../kernel/lifecycle-manager.js';
import { CrossModuleEventBridge } from '../kernel/cross-module-event-bridge.js';

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface HttpGatewayOptions {
  eventBus: IEventBus;
  lifecycleManager: LifecycleManager;
  rbacGuard?: RbacGuard;
  eventBridge?: CrossModuleEventBridge;
}

export class HttpGateway {
  private readonly eventBus: IEventBus;
  private readonly lifecycleManager: LifecycleManager;
  private readonly rbacGuard: RbacGuard;
  private readonly eventBridge?: CrossModuleEventBridge;
  private isStarted = false;
  private startTime = Date.now();

  constructor(options: HttpGatewayOptions) {
    this.eventBus = options.eventBus;
    this.lifecycleManager = options.lifecycleManager;
    this.rbacGuard = options.rbacGuard ?? new RbacGuard();
    this.eventBridge = options.eventBridge;
  }

  async start(): Promise<void> {
    this.isStarted = true;
    this.startTime = Date.now();
    this.eventBridge?.start();
  }

  async stop(): Promise<void> {
    this.isStarted = false;
    this.eventBridge?.stop();
    await this.lifecycleManager.unloadAll();
  }

  async handleRequest(req: HttpRequest): Promise<HttpResponse> {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const method = req.method.toUpperCase();

    // Health liveness probe
    if (method === 'GET' && path === '/health') {
      return this.jsonResponse(200, {
        status: 'healthy',
        uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
        timestamp: new Date().toISOString()
      });
    }

    // Readiness probe
    if (method === 'GET' && path === '/ready') {
      if (!this.isStarted) {
        return this.jsonResponse(503, { status: 'not_ready', reason: 'Gateway not started' });
      }
      return this.jsonResponse(200, {
        status: 'ready',
        modulesCount: this.lifecycleManager.getNavigation().length,
        registeredBridges: this.eventBridge?.getRegisteredModules() ?? []
      });
    }

    // Navigation items filtered by RBAC
    if (method === 'GET' && path === '/api/navigation') {
      const user = this.rbacGuard.extractContextFromHeaders(req.headers);
      const allNav = this.lifecycleManager.getNavigation();

      const allowedNav = allNav.filter(item => {
        if (!item.permission) return true;
        return this.rbacGuard.hasAccess(user.roles, user.permissions, item.permission);
      });

      return this.jsonResponse(200, { items: allowedNav });
    }

    // Publish event endpoint (protected by permission event:publish or admin)
    if (method === 'POST' && path === '/api/events/publish') {
      const user = this.rbacGuard.extractContextFromHeaders(req.headers);
      const hasPermission = this.rbacGuard.hasAccess(user.roles, user.permissions, 'events:publish');

      if (!hasPermission) {
        return this.jsonResponse(403, {
          error: 'Forbidden',
          message: 'User does not possess required permission "events:publish"'
        });
      }

      const { eventType, payload } = req.body ?? {};
      if (!eventType || typeof eventType !== 'string') {
        return this.jsonResponse(400, {
          error: 'BadRequest',
          message: 'Missing or invalid "eventType"'
        });
      }

      await this.eventBus.publish(eventType, payload ?? {}, {
        producer: `user:${user.userId}`
      });

      return this.jsonResponse(202, {
        status: 'accepted',
        eventType,
        publishedAt: new Date().toISOString()
      });
    }

    return this.jsonResponse(404, {
      error: 'NotFound',
      message: `Route ${method} ${path} not found`
    });
  }

  private jsonResponse(statusCode: number, data: any): HttpResponse {
    return {
      statusCode,
      headers: {
        'content-type': 'application/json',
        'x-platform-runtime': 'fastify-shell-host'
      },
      body: JSON.stringify(data)
    };
  }
}
