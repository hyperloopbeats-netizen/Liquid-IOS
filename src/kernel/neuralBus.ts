import type { BusChannel, NeuralBusEvent } from '../types/os';

type BusListener = (events: NeuralBusEvent[], latest?: NeuralBusEvent) => void;

class NeuralBusService {
  private events: NeuralBusEvent[] = [];
  private listeners = new Set<BusListener>();
  private maxEvents = 180;

  constructor() {
    this.publish('SYSTEM', 'KERNEL_BOOT', 'Aether OS Cognitive Kernel initialized. Pub/Sub bus online.');
  }

  publish(
    channel: BusChannel,
    type: string,
    summary: string,
    payload?: Record<string, unknown>
  ): NeuralBusEvent {
    const now = new Date();
    const evt: NeuralBusEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now.toTimeString().split(' ')[0],
      epochMs: now.getTime(),
      channel,
      type,
      summary,
      payload,
    };
    this.events = [evt, ...this.events].slice(0, this.maxEvents);
    this.listeners.forEach((cb) => cb(this.events, evt));
    return evt;
  }

  getEvents(): NeuralBusEvent[] {
    return this.events;
  }

  getRecentPulseRate(): number {
    const cutoff = Date.now() - 10_000;
    return this.events.filter((e) => e.epochMs >= cutoff).length;
  }

  subscribe(listener: BusListener): () => void {
    this.listeners.add(listener);
    listener(this.events);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear(): void {
    this.events = [];
    this.publish('SYSTEM', 'BUS_CLEARED', 'Neural Ledger event buffer cleared by operator.');
  }
}

export const neuralBus = new NeuralBusService();
