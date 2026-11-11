import type { Place } from './digitransit';
import { MODE_FILLS } from './modes';

/** What is remembered of a stop the visitor opened: enough to list it and open it again. */
export type RecentPlace = Pick<Place, 'kind' | 'id' | 'name' | 'code' | 'mode'>;

export const RECENTS_KEY = 'departures-recent';
export const MAX_RECENTS = 5;

/** Reads the stored list, dropping anything that isn't a place this version understands. */
export function parseRecents(raw: string | null | undefined): RecentPlace[] {
  try {
    const stored: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored
      .filter(
        (r): r is RecentPlace =>
          !!r &&
          (r.kind === 'stop' || r.kind === 'station') &&
          typeof r.id === 'string' &&
          typeof r.name === 'string',
      )
      .map((r) => ({
        kind: r.kind,
        id: r.id,
        name: r.name,
        code: typeof r.code === 'string' ? r.code : null,
        mode: r.mode in MODE_FILLS ? r.mode : 'OTHER',
      }))
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

/** The list with `place` moved to the front, most recent first. */
export function withRecent(recents: readonly RecentPlace[], place: RecentPlace): RecentPlace[] {
  const entry: RecentPlace = {
    kind: place.kind,
    id: place.id,
    name: place.name,
    code: place.code,
    mode: place.mode,
  };
  return [entry, ...recents.filter((r) => r.id !== place.id)].slice(0, MAX_RECENTS);
}
