import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { encodeRemainingLength, encodeSubscribe, encodeUnsubscribe } from './mqtt-lite';
import { ALL_LEVELS, tramFilters } from './hfp-filters';
import {
  DROP_MS,
  FLUSH_MS,
  HFP_SOCKET_FACTORY,
  isStale,
  SMOOTH_DROP_MS,
  SMOOTH_STALE_MS,
  SMOOTH_TICK_MS,
  STALE_MS,
  TICK_MS,
  TramFeedService,
} from './tram-feed.service';
import type { TramState } from './hfp';

const BOX = { south: 60.148, west: 24.865, north: 60.22, east: 25.056 };
const encoder = new TextEncoder();

class FakeSocket {
  readyState = 0;
  binaryType = 'blob';
  closed = false;
  sent: Uint8Array[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  send(data: Uint8Array) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
    this.readyState = 3;
  }
  /** Plays a broker that accepts the connection and the subscription. */
  accept() {
    this.readyState = 1;
    this.onopen?.();
    this.receive(Uint8Array.of(0x20, 2, 0, 0));
    this.receive(Uint8Array.of(0x90, 3, 0, 1, 0));
  }
  publish(topic: string, payload: string) {
    const t = encoder.encode(topic);
    const body = [t.length >> 8, t.length & 0xff, ...t, ...encoder.encode(payload)];
    this.receive(Uint8Array.from([0x30, ...encodeRemainingLength(body.length), ...body]));
  }
  receive(data: Uint8Array) {
    this.onmessage?.({ data: data.slice().buffer });
  }
  drop() {
    this.readyState = 3;
    this.onclose?.({ code: 1006, reason: '' });
  }
}

function vp(
  veh: number,
  tst: string,
  { desi = '4', route = '1004', lat = 60.167548, lon = 24.962017 } = {},
) {
  return {
    topic: `/hfp/v2/journey/ongoing/vp/tram/0040/${String(veh).padStart(5, '0')}/${route}/2/Katajanokka/07:40/1080403/3/60;24/19/66/72`,
    payload: JSON.stringify({
      VP: {
        desi,
        oper: 40,
        veh,
        tst,
        spd: 4.2,
        hdg: 36,
        lat,
        long: lon,
        dl: -111,
        drst: 0,
        stop: null,
        route,
      },
    }),
  };
}

describe('TramFeedService', () => {
  let sockets: FakeSocket[];
  let feed: TramFeedService;
  let visibility: DocumentVisibilityState;
  const socket = () => sockets.at(-1)!;
  const send = (m: { topic: string; payload: string }) => socket().publish(m.topic, m.payload);
  const trams = () => [...feed.vehicles().values()];

  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    TestBed.configureTestingModule({
      providers: [
        TramFeedService,
        {
          provide: HFP_SOCKET_FACTORY,
          useValue: () => {
            sockets.push(new FakeSocket());
            return socket() as unknown as WebSocket;
          },
        },
      ],
    });
    feed = TestBed.inject(TramFeedService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('goes live once subscribed', () => {
    expect(feed.status()).toBe('offline');
    feed.start(BOX);
    expect(feed.status()).toBe('connecting');
    socket().accept();
    expect(feed.status()).toBe('live');
  });

  it('publishes each tram once however many copies arrive, throttled', () => {
    feed.start(BOX);
    socket().accept();
    for (let i = 0; i < 4; i++) send(vp(648, '2026-09-29T04:53:45.256Z'));
    send(vp(641, '2026-09-29T04:53:44.257Z', { desi: '13', route: '1013' }));
    expect(trams()).toEqual([]);
    vi.advanceTimersByTime(FLUSH_MS);
    expect(trams().map((t) => [t.key, t.desi])).toEqual([
      ['40/648', '4'],
      ['40/641', '13'],
    ]);
  });

  it('ignores Raide-Jokeri, missing positions and trams outside the map', () => {
    feed.start(BOX);
    socket().accept();
    send(vp(621, '2026-09-29T04:53:20.255Z', { desi: '15', route: '2015' }));
    send({
      ...vp(622, '2026-09-29T04:53:20.255Z'),
      payload:
        '{"VP":{"desi":"4","oper":40,"veh":622,"tst":"2026-09-29T04:53:20.255Z","lat":null,"long":null}}',
    });
    send(vp(623, '2026-09-29T04:53:20.255Z', { lat: 60.209645, lon: 25.074704 }));
    vi.advanceTimersByTime(FLUSH_MS);
    expect(trams()).toEqual([]);
  });

  it('keeps the newest fix when messages overtake each other', () => {
    feed.start(BOX);
    socket().accept();
    send(vp(648, '2026-09-29T04:53:50.000Z', { lat: 60.17 }));
    send(vp(648, '2026-09-29T04:53:45.000Z', { lat: 60.16 }));
    vi.advanceTimersByTime(FLUSH_MS);
    expect(trams().map((t) => t.lat)).toEqual([60.17]);
  });

  it('removes a tram when it signs off its journey', () => {
    feed.start(BOX);
    socket().accept();
    send(vp(457, '2026-09-29T04:53:10.000Z', { desi: 'H', route: '100HI5' }));
    vi.advanceTimersByTime(FLUSH_MS);
    expect(trams()).toHaveLength(1);
    socket().publish(
      '/hfp/v2/journey/ongoing/vjout/tram/0040/00457/100HI5/2/Ilmala/07:33/1171401/5/60;24/29/02/60',
      '{"VJOUT":{"desi":"H","oper":40,"veh":457,"tst":"2026-09-29T04:53:12.758Z","route":"100HI5"}}',
    );
    vi.advanceTimersByTime(FLUSH_MS);
    expect(trams()).toEqual([]);
  });

  it('marks quiet trams stale after 3 minutes and drops them after 6', () => {
    feed.start(BOX);
    socket().accept();
    send(vp(648, '2026-09-29T04:53:45.256Z'));
    vi.advanceTimersByTime(FLUSH_MS);
    const [tram] = trams();
    expect(isStale(tram, feed.now())).toBe(false);
    vi.advanceTimersByTime(STALE_MS + TICK_MS);
    expect(isStale(tram, feed.now())).toBe(true);
    expect(trams()).toHaveLength(1);
    vi.advanceTimersByTime(DROP_MS - STALE_MS + FLUSH_MS);
    expect(trams()).toEqual([]);
  });

  it('keeps a trail of the cells a tram left, and the fix before, for interpolation', () => {
    feed.start(BOX);
    socket().accept();
    send(vp(648, '2026-09-29T04:53:40.000Z', { lon: 24.9605 }));
    send(vp(648, '2026-09-29T04:53:41.000Z', { lon: 24.9609 }));
    send(vp(648, '2026-09-29T04:53:42.000Z', { lon: 24.9612 }));
    vi.advanceTimersByTime(FLUSH_MS);
    const [tram] = trams();
    // The second fix was in the same cell as the first, so the trail has one point per cell.
    expect(tram.trail).toEqual([{ lat: 60.167548, lon: 24.9609 }]);
    expect(tram.previous).toEqual({
      lat: 60.167548,
      lon: 24.9609,
      tst: Date.parse('2026-09-29T04:53:41.000Z'),
    });
  });

  it('switches to every position in smooth mode, with quicker staleness', () => {
    feed.start(BOX);
    socket().accept();
    feed.setSmooth(true);
    expect(feed.smooth()).toBe(true);
    expect(socket().sent.slice(-2)).toEqual([
      encodeSubscribe(2, tramFilters(ALL_LEVELS).slice(0, -1)),
      encodeUnsubscribe(3, tramFilters().slice(0, -1)),
    ]);
    feed.setSmooth(false);
    expect(socket().sent.at(-2)).toEqual(encodeSubscribe(4, tramFilters().slice(0, -1)));
    feed.setSmooth(true);

    send(vp(648, '2026-09-29T04:53:45.256Z'));
    vi.advanceTimersByTime(FLUSH_MS);
    const [tram] = trams();
    vi.advanceTimersByTime(SMOOTH_STALE_MS + SMOOTH_TICK_MS);
    expect(isStale(tram, feed.now(), true)).toBe(true);
    expect(isStale(tram, feed.now())).toBe(false);
    vi.advanceTimersByTime(SMOOTH_DROP_MS - SMOOTH_STALE_MS + FLUSH_MS);
    expect(trams()).toEqual([]);
  });

  it('reconnects with exponential backoff', () => {
    feed.start(BOX);
    socket().drop();
    expect(feed.status()).toBe('reconnecting');
    vi.advanceTimersByTime(999);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);
    socket().drop();
    vi.advanceTimersByTime(1_999);
    expect(sockets).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(3);
    socket().accept();
    expect(feed.status()).toBe('live');
    // A successful connection resets the backoff.
    socket().drop();
    vi.advanceTimersByTime(1_000);
    expect(sockets).toHaveLength(4);
  });

  it('disconnects while the tab is hidden and reconnects when it is shown', () => {
    feed.start(BOX);
    socket().accept();
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(socket().closed).toBe(true);
    expect(feed.status()).toBe('offline');
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(sockets).toHaveLength(2);
    expect(feed.status()).toBe('connecting');
  });

  it('goes offline with the network and back when it returns', () => {
    feed.start(BOX);
    socket().accept();
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    expect(feed.status()).toBe('offline');
    expect(socket().closed).toBe(true);
    onLine.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    expect(feed.status()).toBe('connecting');
  });

  it('follows chosen lines with their own subscription, including variants seen so far', () => {
    feed.start(BOX);
    socket().accept();
    send(vp(648, '2026-09-29T04:53:45.256Z'));
    send(vp(649, '2026-09-29T04:53:45.256Z', { desi: '4', route: '1004 4' }));
    send(vp(641, '2026-09-29T04:53:44.257Z', { desi: '13', route: '1013' }));
    send(vp(457, '2026-09-29T04:53:10.000Z', { desi: 'H', route: '100HI5' }));
    vi.advanceTimersByTime(FLUSH_MS);
    expect(trams()).toHaveLength(4);

    feed.setLines(new Set(['4']));
    const lineFilters = tramFilters(undefined, ['1004', '1004 4']);
    expect(socket().sent.slice(-2)).toEqual([
      encodeSubscribe(2, lineFilters.slice(0, -1)),
      encodeUnsubscribe(3, tramFilters().slice(0, -1)),
    ]);
    vi.advanceTimersByTime(FLUSH_MS);
    expect(trams().map((t) => t.key)).toEqual(['40/648', '40/649']);

    // Until the broker has processed the change, other lines can still arrive.
    send(vp(641, '2026-09-29T04:53:50.000Z', { desi: '13', route: '1013' }));
    vi.advanceTimersByTime(FLUSH_MS);
    expect(trams()).toHaveLength(2);

    // A new connection subscribes to the chosen lines straight away.
    socket().drop();
    vi.advanceTimersByTime(1_000);
    socket().accept();
    expect(socket().sent.at(-1)).toEqual(encodeSubscribe(1, lineFilters));

    feed.setLines(null);
    expect(socket().sent.slice(-2)).toEqual([
      encodeSubscribe(2, tramFilters().slice(0, -1)),
      encodeUnsubscribe(3, lineFilters.slice(0, -1)),
    ]);
  });

  it('keeps only the sign-offs when no line is chosen', () => {
    feed.setLines(new Set());
    feed.start(BOX);
    socket().accept();
    expect(socket().sent.at(-1)).toEqual(
      encodeSubscribe(1, ['/hfp/v2/journey/ongoing/vjout/tram/#']),
    );
  });

  it('disconnects while paused and keeps the trams', () => {
    feed.start(BOX);
    socket().accept();
    send(vp(648, '2026-09-29T04:53:45.256Z'));
    vi.advanceTimersByTime(FLUSH_MS);
    feed.pause();
    expect(feed.paused()).toBe(true);
    expect(feed.status()).toBe('paused');
    expect(socket().closed).toBe(true);
    expect(trams()).toHaveLength(1);

    // Showing the tab again doesn't undo a pause.
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(sockets).toHaveLength(1);
    expect(feed.status()).toBe('paused');

    feed.resume();
    expect(feed.status()).toBe('connecting');
    expect(sockets).toHaveLength(2);
    socket().accept();
    expect(feed.status()).toBe('live');
  });

  it('disconnects when destroyed', () => {
    feed.start(BOX);
    socket().accept();
    TestBed.resetTestingModule();
    expect(socket().closed).toBe(true);
  });
});

describe('isStale', () => {
  it('uses the arrival time, not the vehicle clock', () => {
    const tram = { receivedAt: 1_000, tst: 0 } as TramState;
    expect(isStale(tram, 1_000 + STALE_MS)).toBe(false);
    expect(isStale(tram, 1_001 + STALE_MS)).toBe(true);
  });
});
