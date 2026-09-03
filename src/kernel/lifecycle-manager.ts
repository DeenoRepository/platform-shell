export interface NavigationItem {
  id: string;
  title: string;
  path: string;
  permission?: string;
}

export class LifecycleManager {
  private modules = new Map<string, any>();
  private navigationItems: NavigationItem[] = [];

  registerNavigation(item: NavigationItem): void {
    this.navigationItems.push(item);
  }

  getNavigation(): readonly NavigationItem[] {
    return this.navigationItems;
  }

  async loadModule(module: any, context: any): Promise<void> {
    await module.onInit(context);
    await module.onStart();
    this.modules.set(module.id, module);
  }

  async unloadAll(): Promise<void> {
    for (const [_, mod] of this.modules) {
      if (typeof mod.onStop === 'function') {
        await mod.onStop();
      }
    }
    this.modules.clear();
    this.navigationItems = [];
  }
}
