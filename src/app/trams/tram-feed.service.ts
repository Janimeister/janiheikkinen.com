import { DestroyRef, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Deduplicator, isInside, parseHfpMessage, type TramState } from './hfp';
import { HFP_BROKER_URL, tramFilters } from './hfp-filters';
import { MqttLiteClient } from './mqtt-lite';
import type { BBox } from './tram-map.model';

export type FeedStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

/** Opens the broker socket. Tests replace it with a fake. */
export const HFP_SOCKET_FACTORY = new InjectionToken<(url: string, protocol: string) => WebSocket>(
  'HFP_SOCKET_FACTORY',
  { factory: () => (url, protocol) => new WebSocket(url, protocol) },
);

/** Publish the vehicle map at most this often, however fast messages arrive. */
export const FLUSH_MS = 500;
/** How often staleness is re-checked. */
export const TICK_MS = 15_000;
/**
 * With the level 0–3 subscription a tram only reports when it enters another map cell, and a
 * tram waiting at a stop or a light can be quiet for a minute or two.
 */
export const STALE_MS = 3 * 60_000;
export const DROP_MS = 6 * 60_000;
export const MIN_BACKOFF_MS = 1_000;
export const MAX_BACKOFF_MS = 30_000;

const decoder = new TextDecoder();

/**
 * Live tram positions from HSL's HFP feed. Provide it on the page component, so the connection
 * lives exactly as long as the page: it disconnects on destroy, while the tab is hidden and while
 * the browser is offline.
 */
@Injectable()
export class TramFeedService {
  private readonly document = inject(DOCUMENT);
  private readonly createSocket = inject(HFP_SOCKET_FACTORY);

  private readonly statusSignal = signal<FeedStatus>('offline');
  private readonly vehiclesSignal = signal<ReadonlyMap<string, TramState>>(new Map());
  private readonly nowSignal = signal(Date.now());

  readonly status = this.statusSignal.asReadonly();
  /** Trams by `oper/veh`, published at most every {@link FLUSH_MS}. */
  readonly vehicles = this.vehiclesSignal.asReadonly();
  /** The clock staleness is judged against; ticks every {@link TICK_MS}. */
  readonly now = this.nowSignal.asReadonly();

  private readonly trams = new Map<string, TramState>();
  private readonly dedupe = new Deduplicator();
  private client: MqttLiteClient | null = null;
  private bbox: BBox | null = null;
  private running = false;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private flushTimer: ReturnType<typeof setTimeout> | undefined;
  private tickTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    const view = this.document.defaultView;
    const onVisibility = () => this.reconsider();
    this.document.addEventListener('visibilitychange', onVisibility);
    view?.addEventListener('online', onVisibility);
    view?.addEventListener('offline', onVisibility);
    inject(DestroyRef).onDestroy(() => {
      this.stop();
      this.document.removeEventListener('visibilitychange', onVisibility);
      view?.removeEventListener('online', onVisibility);
      view?.removeEventListener('offline', onVisibility);
    });
  }

  /** Starts streaming trams inside `bbox`. Positions outside it are ignored. */
  start(bbox: BBox): void {
    this.bbox = bbox;
    if (this.running) return;
    this.running = true;
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
    this.reconsider();
  }

  stop(): void {
    this.running = false;
    clearInterval(this.tickTimer);
    this.disconnect();
    this.statusSignal.set('offline');
  }

  /** Connects or disconnects to match the page's visibility and the network. */
  private reconsider(): void {
    if (!this.running) return;
    const hidden = this.document.visibilityState === 'hidden';
    const offline = this.document.defaultView?.navigator.onLine === false;
    if (hidden || offline) {
      this.disconnect();
      this.statusSignal.set('offline');
    } else if (!this.client && this.reconnectTimer === undefined) {
      this.attempt = 0;
      this.connect();
    }
  }

  private connect(): void {
    this.statusSignal.set(this.attempt === 0 ? 'connecting' : 'reconnecting');
    const client = new MqttLiteClient({
      url: HFP_BROKER_URL,
      filters: tramFilters(),
      keepAlive: 30,
      createSocket: this.createSocket,
      onSubscribed: () => {
        this.attempt = 0;
        this.statusSignal.set('live');
        this.tick();
      },
      onMessage: (topic, payload) => this.receive(topic, payload),
      onClose: () => {
        this.client = null;
        this.scheduleReconnect();
      },
    });
    this.client = client;
    client.connect();
  }

  private scheduleReconnect(): void {
    if (!this.running) return;
    this.statusSignal.set('reconnecting');
    const delay = Math.min(MAX_BACKOFF_MS, MIN_BACKOFF_MS * 2 ** this.attempt);
    this.attempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay);
  }

  private disconnect(): void {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.client?.close();
    this.client = null;
  }

  private receive(topic: string, payload: Uint8Array): void {
    const event = parseHfpMessage(topic, decoder.decode(payload));
    if (!event || !this.dedupe.accept(event.dedupeKey)) return;
    if (event.kind === 'signoff') {
      if (!this.trams.delete(event.key)) return;
    } else {
      const { tram } = event;
      if (this.bbox && !isInside(tram, this.bbox)) {
        if (!this.trams.delete(tram.key)) return;
      } else {
        // Messages can overtake each other; never replace a newer fix with an older one.
        const known = this.trams.get(tram.key);
        if (known && known.tst > tram.tst) return;
        this.trams.set(tram.key, tram);
      }
    }
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== undefined) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      this.vehiclesSignal.set(new Map(this.trams));
    }, FLUSH_MS);
  }

  private tick(): void {
    const now = Date.now();
    this.nowSignal.set(now);
    let dropped = false;
    for (const [key, tram] of this.trams) {
      if (now - tram.receivedAt > DROP_MS) {
        this.trams.delete(key);
        dropped = true;
      }
    }
    if (dropped) this.scheduleFlush();
  }
}

export function isStale(tram: TramState, now: number): boolean {
  return now - tram.receivedAt > STALE_MS;
}
