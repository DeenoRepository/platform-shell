export interface RemoteModuleConfig {
  name: string;
  entry: string;
  routePrefix: string;
  defaultPort: number;
}

export const DEFAULT_FEDERATION_REMOTES: Record<string, RemoteModuleConfig> = Object.freeze({
  eps: {
    name: 'module_eps',
    entry: 'http://localhost:3001/assets/remoteEntry.js',
    routePrefix: '/eps',
    defaultPort: 3001
  },
  wms: {
    name: 'module_wms',
    entry: 'http://localhost:3002/assets/remoteEntry.js',
    routePrefix: '/wms',
    defaultPort: 3002
  },
  mro: {
    name: 'module_mro',
    entry: 'http://localhost:3003/assets/remoteEntry.js',
    routePrefix: '/mro',
    defaultPort: 3003
  },
  prm: {
    name: 'module_prm',
    entry: 'http://localhost:3004/assets/remoteEntry.js',
    routePrefix: '/prm',
    defaultPort: 3004
  }
});

export class FederationHostResolver {
  private remotes: Map<string, RemoteModuleConfig>;

  constructor(customRemotes?: Record<string, Partial<RemoteModuleConfig>>) {
    this.remotes = new Map();
    for (const [key, base] of Object.entries(DEFAULT_FEDERATION_REMOTES)) {
      const override = customRemotes?.[key];
      this.remotes.set(key, {
        ...base,
        ...override
      });
    }
  }

  getRemotes(): Record<string, RemoteModuleConfig> {
    return Object.fromEntries(this.remotes.entries());
  }

  getViteRemotesConfig(): Record<string, string> {
    const config: Record<string, string> = {};
    for (const [key, remote] of this.remotes) {
      config[key] = remote.entry;
    }
    return config;
  }

  getModuleByRoute(path: string): RemoteModuleConfig | null {
    for (const remote of this.remotes.values()) {
      if (path === remote.routePrefix || path.startsWith(`${remote.routePrefix}/`)) {
        return remote;
      }
    }
    return null;
  }
}
