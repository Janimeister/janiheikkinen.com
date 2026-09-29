/**
 * Parsing for HSL's High-frequency positioning (HFP) v2 messages: the topic carries the route,
 * headsign, next stop and geohash level, the JSON payload the position and timing.
 * See docs/tram-tracker-plan.md §2 for the verified format.
 */

import type { BBox } from './tram-map.model';

/** The fields of an HFP v2 topic that we use. */
export interface HfpTopic {
  eventType: string;
  transportMode: string;
  /** `oper/veh` without zero padding, e.g. `40/466`, to match the payload's numbers. */
  vehicleKey: string;
  routeId: string;
  /** HFP direction, `1` or `2`. */
  direction: string;
  headsign: string;
  startTime: string;
  /** GTFS stop id without the `HSL:` prefix, or `EOL` after the last stop. */
  nextStop: string;
  geohashLevel: number | null;
}

/** The latest known state of one tram. */
export interface TramState {
  key: string;
  /** The line as riders see it: `'4'`, `'1H'`, `'H'`. */
  desi: string;
  routeId: string;
  direction: string;
  headsign: string;
  nextStop: string | null;
  lat: number;
  lon: number;
  /** Degrees clockwise from north. */
  heading: number | null;
  /** Metres per second. */
  speed: number | null;
  /** Seconds ahead of schedule; negative means late. */
  delay: number | null;
  doorsOpen: boolean;
  /** Stop id while at a stop. */
  stop: string | null;
  /** The vehicle's own timestamp, epoch milliseconds. */
  tst: number;
  /** When the message arrived here, epoch milliseconds. */
  receivedAt: number;
  depotRun: boolean;
}

export type HfpEvent =
  | { kind: 'position'; dedupeKey: string; tram: TramState }
  | { kind: 'signoff'; dedupeKey: string; key: string };

/** Splits a topic like `/hfp/v2/journey/ongoing/vp/tram/0040/00466/1004/1/Munkkiniemi/…`. */
export function parseTopic(topic: string): HfpTopic | null {
  const levels = topic.split('/');
  if (levels[1] !== 'hfp' || levels[2] !== 'v2' || levels.length < 14) return null;
  const level = levels[14] === undefined || levels[14] === '' ? NaN : Number(levels[14]);
  return {
    eventType: levels[5],
    transportMode: levels[6],
    vehicleKey: vehicleKey(levels[7], levels[8]),
    routeId: levels[9],
    direction: levels[10],
    headsign: levels[11],
    startTime: levels[12],
    nextStop: levels[13],
    geohashLevel: Number.isInteger(level) ? level : null,
  };
}

export function vehicleKey(operator: string | number, vehicle: string | number): string {
  return `${Number(operator)}/${Number(vehicle)}`;
}

/** Raide-Jokeri is light rail, but HFP publishes it as `tram` (route `2015`, line `15`). */
export function isExcludedLine(routeId: string, desi: string): boolean {
  return routeId.startsWith('2015') || desi === '15';
}

/** Runs to or from the depot: `1H`, `4H`, or the `H` line to Ruskeasuo. */
export function isDepotRun(desi: string): boolean {
  return desi.endsWith('H');
}

/**
 * The line a tram belongs to for colours and filters: a depot run like `4H` is on line 4's
 * track. The `H` line to Ruskeasuo is a line of its own.
 */
export function lineOf(desi: string): string {
  return desi.replace(/H$/, '') || desi;
}

/** Line order: `1`, `2`, … `13`, then letters like `H`. */
export function compareLines(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true });
}

interface VpPayload {
  desi?: unknown;
  oper?: unknown;
  veh?: unknown;
  tst?: unknown;
  spd?: unknown;
  hdg?: unknown;
  lat?: unknown;
  long?: unknown;
  dl?: unknown;
  drst?: unknown;
  stop?: unknown;
  route?: unknown;
}

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * Turns one message into an event, or null when it's not for us: another mode or event type,
 * Raide-Jokeri, no position, or a malformed payload.
 */
export function parseHfpMessage(
  topicText: string,
  payloadText: string,
  receivedAt = Date.now(),
): HfpEvent | null {
  const topic = parseTopic(topicText);
  if (!topic || topic.transportMode !== 'tram') return null;
  if (topic.eventType !== 'vp' && topic.eventType !== 'vjout') return null;

  let body: VpPayload | undefined;
  try {
    const json = JSON.parse(payloadText) as Record<string, VpPayload | undefined>;
    body = json[topic.eventType.toUpperCase()];
  } catch {
    return null;
  }
  if (!body || typeof body !== 'object') return null;

  const key =
    typeof body.oper === 'number' && typeof body.veh === 'number'
      ? vehicleKey(body.oper, body.veh)
      : topic.vehicleKey;
  const tst = typeof body.tst === 'string' ? Date.parse(body.tst) : NaN;
  if (Number.isNaN(tst)) return null;
  const dedupeKey = `${topic.eventType}/${key}/${body.tst}`;

  if (topic.eventType === 'vjout') return { kind: 'signoff', dedupeKey, key };

  const desi = typeof body.desi === 'string' ? body.desi : '';
  const routeId = typeof body.route === 'string' ? body.route : topic.routeId;
  if (!desi || isExcludedLine(routeId, desi)) return null;
  const lat = num(body.lat);
  const lon = num(body.long);
  if (lat === null || lon === null) return null;

  return {
    kind: 'position',
    dedupeKey,
    tram: {
      key,
      desi,
      routeId,
      direction: topic.direction,
      headsign: topic.headsign,
      nextStop: topic.nextStop && topic.nextStop !== 'EOL' ? topic.nextStop : null,
      lat,
      lon,
      heading: num(body.hdg),
      speed: num(body.spd),
      delay: num(body.dl),
      doorsOpen: body.drst === 1,
      stop: body.stop === null || body.stop === undefined ? null : String(body.stop),
      tst,
      receivedAt,
      depotRun: isDepotRun(desi),
    },
  };
}

export function isInside(tram: Pick<TramState, 'lat' | 'lon'>, box: BBox): boolean {
  return (
    tram.lat >= box.south && tram.lat <= box.north && tram.lon >= box.west && tram.lon <= box.east
  );
}

/**
 * Remembers recently seen messages so repeats can be dropped. The broker delivers every position
 * four times, interleaved with other trams' messages but all within about 200 ms, so a bounded
 * window of recent keys is enough.
 */
export class Deduplicator {
  private readonly seen = new Set<string>();

  constructor(private readonly capacity = 4096) {}

  /** True the first time a key is seen, false for repeats. */
  accept(key: string): boolean {
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    if (this.seen.size > this.capacity) {
      // Sets iterate in insertion order, so the first key is the oldest.
      this.seen.delete(this.seen.values().next().value!);
    }
    return true;
  }

  clear(): void {
    this.seen.clear();
  }
}
