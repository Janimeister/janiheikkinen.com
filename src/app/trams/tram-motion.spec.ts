import { describe, expect, it } from 'vitest';
import type { TramState } from './hfp';
import { followOn, interpolate, MAX_INTERPOLATION_MS, TRAIL_LENGTH } from './tram-motion';

function fix(lon: number, tst: number, overrides: Partial<TramState> = {}): TramState {
  return {
    key: '40/466',
    desi: '4',
    routeId: '1004',
    direction: '1',
    headsign: 'Munkkiniemi',
    nextStop: null,
    lat: 60.1675,
    lon,
    heading: null,
    speed: null,
    delay: null,
    doorsOpen: false,
    stop: null,
    tst,
    receivedAt: tst,
    depotRun: false,
    ...overrides,
  };
}

describe('followOn', () => {
  it('adds a trail point only when the tram leaves its 0.001° cell', () => {
    let tram = fix(24.9601, 0);
    tram = followOn(tram, fix(24.9609, 1000));
    expect(tram.trail).toEqual([]);
    tram = followOn(tram, fix(24.961, 2000));
    expect(tram.trail).toEqual([{ lat: 60.1675, lon: 24.9609 }]);
    expect(tram.previous).toEqual({ lat: 60.1675, lon: 24.9609, tst: 1000 });
  });

  it(`keeps the last ${TRAIL_LENGTH} cells`, () => {
    let tram = fix(24.9, 0);
    for (let i = 1; i <= TRAIL_LENGTH + 3; i++)
      tram = followOn(tram, fix(24.9 + i * 0.001, i * 1000));
    expect(tram.trail).toHaveLength(TRAIL_LENGTH);
    expect(tram.trail!.at(-1)!.lon).toBeCloseTo(24.9 + (TRAIL_LENGTH + 2) * 0.001);
  });

  it('starts over on a new trip', () => {
    const tram = followOn(fix(24.96, 0), fix(24.97, 1000));
    const next = fix(24.98, 2000, { direction: '2' });
    expect(followOn(tram, next)).toBe(next);
  });
});

describe('interpolate', () => {
  const tram = { ...fix(24.962, 2000), previous: { lat: 60.1675, lon: 24.96, tst: 1000 } };

  it('glides from the previous fix to the latest over the time between them', () => {
    expect(interpolate(tram, 2000).lon).toBeCloseTo(24.96);
    expect(interpolate(tram, 2500).lon).toBeCloseTo(24.961);
    expect(interpolate(tram, 3000).lon).toBeCloseTo(24.962);
    expect(interpolate(tram, 9000).lon).toBeCloseTo(24.962);
  });

  it('jumps straight to the latest fix without a recent previous one', () => {
    expect(interpolate(fix(24.962, 2000), 2000)).toEqual({ lat: 60.1675, lon: 24.962 });
    const quiet = { ...tram, previous: { ...tram.previous, tst: 2000 - MAX_INTERPOLATION_MS - 1 } };
    expect(interpolate(quiet, 2000).lon).toBe(24.962);
  });
});
