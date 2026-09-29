import { DestroyRef, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  compareLines,
  Deduplicator,
  isInside,
  lineOf,
  parseHfpMessage,
  type TramState,
} from './hfp';
import {
  ALL_LEVELS,
  CELL_CHANGE_LEVELS,
  HFP_BROKER_URL,
  routeIdForLine,
  tramFilters,
} from './hfp-filters';
import { MqttLiteClient } from './mqtt-lite';
import { followOn } from './tram-motion';
import type { BBox } from './tram-map.model';

export type FeedStatus = 'connecting' | 'live' | 'reconnecting' | 'offline' | 'paused';

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
/** In smooth mode every tram reports about once a second, moving or not, so silence means more. */
export const SMOOTH_TICK_MS = 5_000;
export const SMOOTH_STALE_MS = 15_000;
export const SMOOTH_DROP_MS = 60_000;
export const MIN_BACKOFF_MS = 1_000;
export const MAX_BACKOFF_MS = 30_000;

const decoder = new TextDecoder();

/**
 * Live tram positions from HSL's HFP feed. Provide it on the page component, so the connection
 * lives exactly as long as the page: it disconnects on destroy, while paused, while the tab is
 * hidden and while the browser is offline.
 */
@Injectable()
export class TramFeedService {
  private readonly document = inject(DOCUMENT);
  private readonly createSocket = inject(HFP_SOCKET_FACTORY);

  private readonly statusSignal = signal<FeedStatus>('offline');
  private readonly vehiclesSignal = signal<ReadonlyMap<string, TramState>>(new Map());
  private readonly nowSignal = signal(Date.now());
  private readonly pausedSignal = signal(false);
  private readonly smoothSignal = signal(false);

  readonly status = this.statusSignal.asReadonly();
  /** Trams by `oper/veh`, published at most every {@link FLUSH_MS}. */
  readonly vehicles = this.vehiclesSignal.asReadonly();
  /** The clock staleness is judged against; ticks every {@link TICK_MS}. */
  readonly now = this.nowSignal.asReadonly();
  readonly paused = this.pausedSignal.asReadonly();
  /** Every position instead of cell changes only. See {@link setSmooth}. */
  readonly smooth = this.smoothSignal.asReadonly();

  private readonly trams = new Map<string, TramState>();
  private readonly dedupe = new Deduplicator();
  private client: MqttLiteClient | null = null;
  private bbox: BBox | null = null;
  /** The lines to follow, or null for every line including depot runs. */
  private lines: ReadonlySet<string> | null = null;
  /**
   * Route ids seen per line, like `1004H` or `1004 4` for line 4. A per-line filter only matches
   * its exact route id, so following a line also subscribes to the variants seen so far.
   */
  private readonly routeIds = new Map<string, Set<string>>();
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
    this.startTicking();
    this.reconsider();
  }

  /**
   * Smooth mode subscribes to every position, about once a second per tram, instead of only the
   * moves into another map cell. That's ~15× the data, so it's opt-in. Trams also go stale and
   * drop much sooner, since a working tram is never quiet for long.
   */
  setSmooth(smooth: boolean): void {
    if (smooth === this.smoothSignal()) return;
    this.smoothSignal.set(smooth);
    this.client?.setFilters(this.filters());
    if (this.running) this.startTicking();
  }

  /**
   * Follows only these lines (by {@link lineOf}), each with its own subscription, or every line
   * with `null`. Trams of lines left out disappear at once; those of lines added appear as they
   * next report, when they move into another map cell.
   */
  setLines(lines: ReadonlySet<string> | null): void {
    this.lines = lines === null ? null : new Set(lines);
    this.client?.setFilters(this.filters());
    let removed = false;
    for (const [key, tram] of this.trams) {
      if (!this.follows(tram)) removed = this.trams.delete(key) || removed;
    }
    if (removed) this.scheduleFlush();
  }

  /** Disconnects until {@link resume}. Trams stay on the map, and go stale as usual. */
  pause(): void {
    this.pausedSignal.set(true);
    this.reconsider();
  }

  resume(): void {
    this.pausedSignal.set(false);
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
    if (this.pausedSignal()) {
      this.disconnect();
      this.statusSignal.set('paused');
    } else if (hidden || offline) {
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
      filters: this.filters(),
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

  private startTicking(): void {
    clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => this.tick(), this.smoothSignal() ? SMOOTH_TICK_MS : TICK_MS);
  }

  private filters(): string[] {
    const levels = this.smoothSignal() ? ALL_LEVELS : CELL_CHANGE_LEVELS;
    if (this.lines === null) return tramFilters(levels);
    const routeIds = new Set<string>();
    for (const line of [...this.lines].sort(compareLines)) {
      routeIds.add(routeIdForLine(line));
      for (const id of this.routeIds.get(line) ?? []) routeIds.add(id);
    }
    return tramFilters(levels, [...routeIds]);
  }

  private follows(tram: TramState): boolean {
    return this.lines === null || this.lines.has(lineOf(tram.desi));
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
      const line = lineOf(tram.desi);
      const seen = this.routeIds.get(line) ?? new Set<string>();
      this.routeIds.set(line, seen.add(tram.routeId));
      // Right after a filter change, the broker can still send lines we no longer follow.
      if (!this.follows(tram)) return;
      if (this.bbox && !isInside(tram, this.bbox)) {
        if (!this.trams.delete(tram.key)) return;
      } else {
        // Messages can overtake each other; never replace a newer fix with an older one.
        const known = this.trams.get(tram.key);
        if (known && known.tst > tram.tst) return;
        this.trams.set(tram.key, known ? followOn(known, tram) : tram);
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
    const dropAfter = this.smoothSignal() ? SMOOTH_DROP_MS : DROP_MS;
    let dropped = false;
    for (const [key, tram] of this.trams) {
      if (now - tram.receivedAt > dropAfter) {
        this.trams.delete(key);
        dropped = true;
      }
    }
    if (dropped) this.scheduleFlush();
  }
}

export function isStale(tram: TramState, now: number, smooth = false): boolean {
  return now - tram.receivedAt > (smooth ? SMOOTH_STALE_MS : STALE_MS);
}
