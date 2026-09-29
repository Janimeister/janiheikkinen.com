import { describe, expect, it } from 'vitest';
import type { TramState } from './hfp';
import { age, schedule, speedKmh, tramTargets } from './tram-details';
import type { TramMarker } from './tram-overlay';

function tram(key: string, desi: string, headsign: string): TramState {
  return {
    key,
    desi,
    routeId: '',
    direction: '1',
    headsign,
    nextStop: null,
    lat: 60.17,
    lon: 24.94,
    heading: null,
    speed: null,
    delay: null,
    doorsOpen: false,
    stop: null,
    tst: 0,
    receivedAt: 0,
    depotRun: desi.endsWith('H'),
  };
}

describe('tram details', () => {
  it.each([
    [null, { kind: 'unknown' }],
    [0, { kind: 'onTime' }],
    [29, { kind: 'onTime' }],
    [-29, { kind: 'onTime' }],
    [60, { kind: 'ahead', minutes: 1 }],
    [-111, { kind: 'late', minutes: 2 }],
    [-310, { kind: 'late', minutes: 5 }],
  ])('reads a schedule offset of %s s as %o', (delay, expected) => {
    expect(schedule(delay)).toEqual(expected);
  });

  it('converts metres per second to whole km/h', () => {
    expect(speedKmh(4.44)).toBe(16);
    expect(speedKmh(0)).toBe(0);
    expect(speedKmh(null)).toBeNull();
  });

  it('counts seconds for the first minute, then minutes', () => {
    expect(age(10_000, 10_999)).toEqual({ unit: 'seconds', value: 0 });
    expect(age(10_000, 22_500)).toEqual({ unit: 'seconds', value: 12 });
    expect(age(0, 59_999)).toEqual({ unit: 'seconds', value: 59 });
    expect(age(0, 60_000)).toEqual({ unit: 'minutes', value: 1 });
    expect(age(0, 185_000)).toEqual({ unit: 'minutes', value: 3 });
    // A clock that's slightly behind the arrival time isn't "-1 s ago".
    expect(age(1_000, 0)).toEqual({ unit: 'seconds', value: 0 });
  });
});

describe('tramTargets', () => {
  const trams = new Map(
    [
      tram('40/1', '10', 'Pikku Huopalahti'),
      tram('40/2', '4', 'Munkkiniemi'),
      tram('40/3', '4', 'Katajanokka'),
      tram('40/4', '4H', 'Töölöntulli'),
      tram('40/5', 'H', 'Ruskeasuo'),
    ].map((t) => [t.key, t]),
  );
  const marker = (row: number, col: number, text: string, keys: string[]): TramMarker => ({
    row,
    col,
    text,
    cls: '',
    keys,
  });

  it('groups trams by line in line order, depot runs with their line', () => {
    const groups = tramTargets(
      [
        marker(1, 1, '10', ['40/1']),
        marker(2, 2, '*', ['40/2', '40/5', '40/3']),
        marker(3, 3, '4H', ['40/4']),
      ],
      trams,
    );
    expect(groups.map((g) => [g.line, g.targets.map((t) => t.tram.key)])).toEqual([
      ['4', ['40/3', '40/2', '40/4']],
      ['10', ['40/1']],
      ['H', ['40/5']],
    ]);
  });

  it('puts every tram of a cluster on its marker', () => {
    const [group] = tramTargets([marker(2, 5, '*', ['40/2', '40/3'])], trams);
    expect(group.targets.map(({ row, col, width }) => ({ row, col, width }))).toEqual([
      { row: 2, col: 5, width: 1 },
      { row: 2, col: 5, width: 1 },
    ]);
  });

  it('skips keys it has no tram for', () => {
    expect(tramTargets([marker(0, 0, '4', ['40/99'])], trams)).toEqual([]);
  });
});
