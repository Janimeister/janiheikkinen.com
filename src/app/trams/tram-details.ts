import { compareLines, lineOf, type TramState } from './hfp';
import type { TramMarker } from './tram-overlay';

/** How a tram keeps to its timetable, rounded to whole minutes. */
export type Schedule =
  { kind: 'ahead' | 'late'; minutes: number } | { kind: 'onTime' } | { kind: 'unknown' };

/** HFP's `dl` is seconds ahead of schedule. Less than half a minute either way is on time. */
export function schedule(delay: number | null): Schedule {
  if (delay === null) return { kind: 'unknown' };
  const minutes = Math.round(Math.abs(delay) / 60);
  if (minutes === 0) return { kind: 'onTime' };
  return { kind: delay > 0 ? 'ahead' : 'late', minutes };
}

/** HFP's `spd` is metres per second. */
export function speedKmh(speed: number | null): number | null {
  return speed === null ? null : Math.round(speed * 3.6);
}

export type Age = { unit: 'seconds' | 'minutes'; value: number };

/** Time since `since`, in seconds for the first minute and whole minutes after that. */
export function age(since: number, now: number): Age {
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  return seconds < 60
    ? { unit: 'seconds', value: seconds }
    : { unit: 'minutes', value: Math.floor(seconds / 60) };
}

/** Where a tram's button goes: over its marker, in map cells. */
export interface TramTarget {
  tram: TramState;
  row: number;
  col: number;
  /** In cells: the marker's width, so every tram of a cluster sits on its `*`. */
  width: number;
}

export interface TramGroup {
  line: string;
  targets: TramTarget[];
}

/**
 * One target per tram on the map, grouped by line in line order, and by headsign within a line.
 * These are the map's accessible equivalent and its click targets at once.
 */
export function tramTargets(
  markers: readonly TramMarker[],
  trams: ReadonlyMap<string, TramState>,
): TramGroup[] {
  const groups = new Map<string, TramTarget[]>();
  for (const marker of markers) {
    for (const key of marker.keys) {
      const tram = trams.get(key);
      if (!tram) continue;
      const line = lineOf(tram.desi);
      const target = { tram, row: marker.row, col: marker.col, width: marker.text.length };
      groups.set(line, [...(groups.get(line) ?? []), target]);
    }
  }
  return [...groups]
    .sort(([a], [b]) => compareLines(a, b))
    .map(([line, targets]) => ({
      line,
      targets: targets.sort(
        (a, b) =>
          compareLines(a.tram.desi, b.tram.desi) ||
          a.tram.headsign.localeCompare(b.tram.headsign, 'fi') ||
          compareLines(a.tram.key, b.tram.key),
      ),
    }));
}
