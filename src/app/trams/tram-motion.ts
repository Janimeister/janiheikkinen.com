import type { LatLon, TramState } from './hfp';

/** How many earlier cells a tram's trail remembers. */
export const TRAIL_LENGTH = 8;
/**
 * Fixes further apart than this aren't interpolated: in smooth mode a tram reports every second,
 * so a longer gap means it was quiet (or the feed was), and gliding across it would be made up.
 */
export const MAX_INTERPOLATION_MS = 3_000;

// Compared in whole micro-degrees, like the grid, so exact 0.001° lines fall into one cell.
const cellOf = (degrees: number) => Math.floor(Math.round(degrees * 1e6) / 1000);
const sameCell = (a: LatLon, b: LatLon) =>
  cellOf(a.lat) === cellOf(b.lat) && cellOf(a.lon) === cellOf(b.lon);

/**
 * A tram's new fix, carrying its history on: the fix before it, for interpolation, and a trail of
 * the last {@link TRAIL_LENGTH} 0.001° cells it left. A new trip (another route or direction)
 * starts a new trail.
 */
export function followOn(known: TramState, next: TramState): TramState {
  if (known.routeId !== next.routeId || known.direction !== next.direction) return next;
  const here = { lat: known.lat, lon: known.lon };
  const trail = known.trail ?? [];
  return {
    ...next,
    trail: sameCell(here, next) ? trail : [...trail, here].slice(-TRAIL_LENGTH),
    previous: { ...here, tst: known.tst },
  };
}

/**
 * Where to draw a tram at `now`: gliding from its previous fix to its latest one over the time
 * between them, starting when the latest arrived. It runs one fix behind, but never shows a place
 * the tram hasn't been.
 */
export function interpolate(tram: TramState, now: number): LatLon {
  const from = tram.previous;
  const interval = from ? tram.tst - from.tst : 0;
  if (!from || interval <= 0 || interval > MAX_INTERPOLATION_MS)
    return { lat: tram.lat, lon: tram.lon };
  const t = Math.min(1, Math.max(0, (now - tram.receivedAt) / interval));
  return { lat: from.lat + (tram.lat - from.lat) * t, lon: from.lon + (tram.lon - from.lon) * t };
}
