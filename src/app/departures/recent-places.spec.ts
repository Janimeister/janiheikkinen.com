import { describe, expect, it } from 'vitest';
import { MAX_RECENTS, parseRecents, withRecent, type RecentPlace } from './recent-places';

const stop = (id: string, extra: Partial<RecentPlace> = {}): RecentPlace => ({
  kind: 'stop',
  id,
  name: `Stop ${id}`,
  code: null,
  mode: 'BUS',
  ...extra,
});

describe('recent departure places', () => {
  it('reads back what was stored', () => {
    const stored = [stop('a', { code: 'H1', mode: 'TRAM' }), stop('b', { kind: 'station' })];

    expect(parseRecents(JSON.stringify(stored))).toEqual(stored);
  });

  it('starts empty when nothing usable is stored', () => {
    expect(parseRecents(null)).toEqual([]);
    expect(parseRecents(undefined)).toEqual([]);
    expect(parseRecents('not json')).toEqual([]);
    expect(parseRecents('{"kind":"stop"}')).toEqual([]);
  });

  it('drops entries it does not understand and repairs the rest', () => {
    const raw = JSON.stringify([
      null,
      { kind: 'city', id: 'x', name: 'X' },
      { kind: 'stop', id: 7, name: 'No id' },
      { kind: 'stop', id: 'ok', name: 'Kamppi', code: 12, mode: 'HOVERCRAFT', extra: true },
    ]);

    expect(parseRecents(raw)).toEqual([
      { kind: 'stop', id: 'ok', name: 'Kamppi', code: null, mode: 'OTHER' },
    ]);
  });

  it('keeps only the most recent few', () => {
    const many = Array.from({ length: MAX_RECENTS + 3 }, (_, i) => stop(String(i)));

    expect(parseRecents(JSON.stringify(many))).toHaveLength(MAX_RECENTS);
  });

  it('puts a newly opened place first, without repeating it', () => {
    const recents = [stop('a'), stop('b'), stop('c')];

    expect(withRecent(recents, stop('c')).map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(withRecent(recents, stop('d')).map((r) => r.id)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('remembers only the fields it needs, and caps the list', () => {
    const full = { ...stop('new'), lines: ['1', '2'], description: 'Somewhere' } as RecentPlace;
    const recents = Array.from({ length: MAX_RECENTS }, (_, i) => stop(String(i)));

    const next = withRecent(recents, full);

    expect(next).toHaveLength(MAX_RECENTS);
    expect(next[0]).toEqual(stop('new'));
  });
});
