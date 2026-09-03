import { describe, it, expect } from 'vitest';
import { FederationHostResolver } from './federation-host.js';

describe('FederationHostResolver', () => {
  it('initializes default remotes with correct ports and endpoints', () => {
    const resolver = new FederationHostResolver();
    const remotes = resolver.getRemotes();

    expect(remotes.eps.name).toBe('module_eps');
    expect(remotes.wms.name).toBe('module_wms');
    expect(remotes.mro.name).toBe('module_mro');
    expect(remotes.prm.name).toBe('module_prm');

    expect(remotes.eps.defaultPort).toBe(3001);
    expect(remotes.wms.defaultPort).toBe(3002);
    expect(remotes.mro.defaultPort).toBe(3003);
    expect(remotes.prm.defaultPort).toBe(3004);
  });

  it('generates Vite remotes config dictionary', () => {
    const resolver = new FederationHostResolver();
    const viteConfig = resolver.getViteRemotesConfig();

    expect(viteConfig.eps).toBe('http://localhost:3001/assets/remoteEntry.js');
    expect(viteConfig.wms).toBe('http://localhost:3002/assets/remoteEntry.js');
  });

  it('resolves remote module by route prefix', () => {
    const resolver = new FederationHostResolver();

    expect(resolver.getModuleByRoute('/eps')?.name).toBe('module_eps');
    expect(resolver.getModuleByRoute('/eps/passport/123')?.name).toBe('module_eps');
    expect(resolver.getModuleByRoute('/wms/inventory')?.name).toBe('module_wms');
    expect(resolver.getModuleByRoute('/mro/orders')?.name).toBe('module_mro');
    expect(resolver.getModuleByRoute('/prm/requisitions')?.name).toBe('module_prm');
    expect(resolver.getModuleByRoute('/unknown')).toBeNull();
  });

  it('allows overriding remote configuration', () => {
    const resolver = new FederationHostResolver({
      eps: {
        entry: 'https://cdn.production.ems.internal/eps/remoteEntry.js'
      }
    });

    const remotes = resolver.getRemotes();
    expect(remotes.eps.entry).toBe('https://cdn.production.ems.internal/eps/remoteEntry.js');
    expect(remotes.eps.name).toBe('module_eps'); // Preserved
  });
});
