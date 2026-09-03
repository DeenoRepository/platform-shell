import { IEventBus } from '@deenorepository/contracts';
import { IOutboxStore, OutboxDispatcher } from './outbox-dispatcher.js';

export interface ModuleOutboxRegistration {
  moduleName: string;
  schema: string;
  store: IOutboxStore;
  dispatcher?: OutboxDispatcher;
}

export class CrossModuleEventBridge {
  private moduleStores = new Map<string, ModuleOutboxRegistration>();
  private isRunning = false;

  constructor(
    private readonly eventBus: IEventBus,
    private readonly pollIntervalMs = 1000
  ) {}

  registerModule(registration: ModuleOutboxRegistration): void {
    const dispatcher = registration.dispatcher ?? new OutboxDispatcher(
      registration.store,
      this.eventBus,
      this.pollIntervalMs
    );

    this.moduleStores.set(registration.moduleName, {
      ...registration,
      dispatcher
    });

    if (this.isRunning) {
      dispatcher.start();
    }
  }

  getRegisteredModules(): string[] {
    return Array.from(this.moduleStores.keys());
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    for (const reg of this.moduleStores.values()) {
      reg.dispatcher?.start();
    }
  }

  stop(): void {
    this.isRunning = false;
    for (const reg of this.moduleStores.values()) {
      reg.dispatcher?.stop();
    }
  }

  async pollAllOnce(batchSize = 50): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (const [moduleName, reg] of this.moduleStores) {
      if (reg.dispatcher) {
        results[moduleName] = await reg.dispatcher.dispatchBatch(batchSize);
      } else {
        results[moduleName] = 0;
      }
    }

    return results;
  }
}
