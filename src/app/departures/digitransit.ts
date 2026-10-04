/**
 * HSL departures from the Digitransit routing API (GraphQL, OpenTripPlanner 2). The API needs a
 * subscription key, so the browser talks to a proxy that adds it: the dev server in development
 * (`proxy.conf.mjs`) and a Cloudflare Worker in production (`workers/digitransit-proxy.js`).
 */

export type Mode = 'BUS' | 'TRAM' | 'SUBWAY' | 'RAIL' | 'FERRY' | 'OTHER';

/** A stop (one platform or pole) or a station (a group of them, like a metro station). */
export interface Place {
  kind: 'stop' | 'station';
  id: string;
  name: string;
  /** The code on the stop sign, like `H0301`; stations have none. */
  code: string | null;
  platform: string | null;
  /** The street or area, when HSL gives one. */
  description: string | null;
  mode: Mode;
  /** Line numbers that call here, in numeric order. */
  lines: string[];
}

export interface Departure {
  /** Unique within one board: trip and service day. */
  key: string;
  line: string;
  mode: Mode;
  headsign: string;
  platform: string | null;
  /** Expected departure, epoch ms: real-time when known, scheduled otherwise. */
  time: number;
  scheduled: number;
  /** Seconds late (negative when early). Zero without real-time data. */
  delay: number;
  realtime: boolean;
  cancelled: boolean;
}

export interface Board {
  place: Place;
  departures: Departure[];
}

export const DEPARTURE_COUNT = 12;
export const SEARCH_LIMIT = 12;
/** Shorter names match thousands of stops. */
export const SEARCH_MIN_LENGTH = 3;

const PLACE_FIELDS = `
  gtfsId
  name
  code
  platformCode
  desc
  vehicleMode
  routes { shortName }
`;

/** Stations first (metro, train), then single stops whose name or code matches. */
export const SEARCH_QUERY = `query Search($name: String!) {
  stations(name: $name) { ${PLACE_FIELDS} }
  stops(name: $name) { ${PLACE_FIELDS} }
}`;

const STOPTIMES = `
  stoptimesWithoutPatterns(numberOfDepartures: $count, omitNonPickups: true, omitCanceled: false) {
    serviceDay
    scheduledDeparture
    realtimeDeparture
    departureDelay
    realtime
    realtimeState
    headsign
    stop { platformCode }
    trip { gtfsId route { shortName mode } }
  }
`;

export const STOP_QUERY = `query StopDepartures($id: String!, $count: Int!) {
  place: stop(id: $id) { ${PLACE_FIELDS} ${STOPTIMES} }
}`;

export const STATION_QUERY = `query StationDepartures($id: String!, $count: Int!) {
  place: station(id: $id) { ${PLACE_FIELDS} ${STOPTIMES} }
}`;

export interface GraphQlRequest {
  query: string;
  variables: Record<string, string | number>;
}

export function searchRequest(name: string): GraphQlRequest {
  return { query: SEARCH_QUERY, variables: { name } };
}

export function boardRequest(kind: Place['kind'], id: string): GraphQlRequest {
  return {
    query: kind === 'station' ? STATION_QUERY : STOP_QUERY,
    variables: { id, count: DEPARTURE_COUNT },
  };
}

// ── Raw response shapes (only the fields asked for above) ──

interface RawPlace {
  gtfsId: string;
  name: string;
  code?: string | null;
  platformCode?: string | null;
  desc?: string | null;
  vehicleMode?: string | null;
  routes?: { shortName?: string | null }[] | null;
}

interface RawStoptime {
  serviceDay: number;
  scheduledDeparture: number;
  realtimeDeparture: number;
  departureDelay: number;
  realtime: boolean;
  realtimeState?: string | null;
  headsign?: string | null;
  stop?: { platformCode?: string | null } | null;
  trip?: { gtfsId: string; route?: { shortName?: string | null; mode?: string | null } } | null;
}

export interface GraphQlResponse<T> {
  data?: T | null;
  errors?: { message: string }[];
}

export type SearchResponse = GraphQlResponse<{
  stations?: RawPlace[] | null;
  stops?: RawPlace[] | null;
}>;

export type BoardResponse = GraphQlResponse<{
  place?: (RawPlace & { stoptimesWithoutPatterns?: RawStoptime[] | null }) | null;
}>;

/** Thrown for GraphQL errors, which arrive with HTTP 200. */
export class DigitransitError extends Error {}

function dataOf<T>(response: GraphQlResponse<T>): T {
  if (response.errors?.length || !response.data) {
    throw new DigitransitError(response.errors?.[0]?.message ?? 'No data');
  }
  return response.data;
}

export function toMode(mode: string | null | undefined): Mode {
  switch (mode) {
    case 'BUS':
    case 'TRAM':
    case 'SUBWAY':
    case 'RAIL':
    case 'FERRY':
      return mode;
    default:
      return 'OTHER';
  }
}

const byLine = (a: string, b: string) => a.localeCompare(b, 'fi', { numeric: true });

function toPlace(raw: RawPlace, kind: Place['kind']): Place {
  const lines = [...new Set((raw.routes ?? []).map((r) => r.shortName ?? '').filter(Boolean))];
  return {
    kind,
    id: raw.gtfsId,
    name: raw.name,
    code: raw.code || null,
    platform: raw.platformCode || null,
    description: raw.desc && raw.desc !== raw.name ? raw.desc : null,
    mode: toMode(raw.vehicleMode),
    lines: lines.sort(byLine),
  };
}

/**
 * Search results: stations first, then stops, both by how early the query appears in the name.
 * Throws a {@link DigitransitError} when the API answers with an error.
 */
export function parseSearch(response: SearchResponse, query: string): Place[] {
  const data = dataOf(response);
  const needle = query.trim().toLocaleLowerCase('fi');
  const rank = (place: Place) => {
    if (place.code?.toLocaleLowerCase('fi') === needle) return -1;
    const at = place.name.toLocaleLowerCase('fi').indexOf(needle);
    return at < 0 ? Number.MAX_SAFE_INTEGER : at;
  };
  const sorted = (places: Place[]) =>
    places
      .map((place, i) => ({ place, i, rank: rank(place) }))
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .map(({ place }) => place);

  const stations = sorted((data.stations ?? []).map((raw) => toPlace(raw, 'station')));
  const stops = sorted((data.stops ?? []).map((raw) => toPlace(raw, 'stop')));
  return [...stations, ...stops].slice(0, SEARCH_LIMIT);
}

/**
 * A stop's or station's next departures in time order. Returns null when the id is unknown.
 * Throws a {@link DigitransitError} when the API answers with an error.
 */
export function parseBoard(response: BoardResponse, kind: Place['kind']): Board | null {
  const raw = dataOf(response).place;
  if (!raw) return null;
  const departures = (raw.stoptimesWithoutPatterns ?? []).map((st): Departure => {
    const day = st.serviceDay * 1000;
    const realtime = st.realtime && st.realtimeState !== 'SCHEDULED';
    return {
      key: `${st.trip?.gtfsId ?? st.headsign}@${st.serviceDay}:${st.scheduledDeparture}`,
      line: st.trip?.route?.shortName ?? '',
      mode: toMode(st.trip?.route?.mode ?? raw.vehicleMode),
      headsign: st.headsign ?? '',
      platform: st.stop?.platformCode || null,
      time: day + (realtime ? st.realtimeDeparture : st.scheduledDeparture) * 1000,
      scheduled: day + st.scheduledDeparture * 1000,
      delay: realtime ? st.departureDelay : 0,
      realtime,
      cancelled: st.realtimeState === 'CANCELED',
    };
  });
  departures.sort((a, b) => a.time - b.time);
  return { place: toPlace(raw, kind), departures };
}

/** Whole minutes until a departure, rounded down, never below zero. */
export function minutesUntil(time: number, now: number): number {
  return Math.max(0, Math.floor((time - now) / 60_000));
}

/**
 * What the board shows for a departure, like HSL's own displays: `now` within a minute, minutes
 * up to 10, the clock time after that.
 */
export function countdown(
  time: number,
  now: number,
): { kind: 'now' } | { kind: 'minutes'; minutes: number } | { kind: 'clock' } {
  const minutes = minutesUntil(time, now);
  if (minutes < 1) return { kind: 'now' };
  if (minutes < 10) return { kind: 'minutes', minutes };
  return { kind: 'clock' };
}

/** Departures already gone, except those still within half a minute, drop off the board. */
export function upcoming(departures: readonly Departure[], now: number): Departure[] {
  return departures.filter((d) => d.time >= now - 30_000);
}
