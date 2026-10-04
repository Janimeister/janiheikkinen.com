import { describe, expect, it } from 'vitest';
import { averagePrice, cheapestRun, nextTimeOfDay, type PriceSlot } from './cheapest-run';

const MIN = 60_000;
const QUARTER = 15 * MIN;

/** Back-to-back 15-minute slots from t = 0 with the given prices. */
function slots(...prices: number[]): PriceSlot[] {
  return prices.map((price, i) => ({ start: i * QUARTER, end: (i + 1) * QUARTER, price }));
}

describe('averagePrice', () => {
  it('weights each slot by the time spent in it', () => {
    expect(averagePrice(slots(4, 8), 0, 2 * QUARTER)).toBe(6);
    // 10 minutes at 4, 5 minutes at 8.
    expect(averagePrice(slots(4, 8), 5 * MIN, 20 * MIN)).toBeCloseTo((10 * 4 + 5 * 8) / 15);
  });

  it('returns null when the span runs past the data or over a gap', () => {
    expect(averagePrice(slots(4, 8), QUARTER, 3 * QUARTER)).toBeNull();
    const gapped = [slots(1)[0], { start: 2 * QUARTER, end: 3 * QUARTER, price: 1 }];
    expect(averagePrice(gapped, 0, 3 * QUARTER)).toBeNull();
    expect(averagePrice(slots(4), -MIN, QUARTER)).toBeNull();
  });
});

describe('cheapestRun', () => {
  it('finds the cheapest window on slot boundaries and compares it with starting now', () => {
    const run = cheapestRun(slots(10, 9, 2, 1, 3, 12), 2 * QUARTER, 0)!;
    expect(run.best).toEqual({ start: 2 * QUARTER, end: 4 * QUARTER, average: 1.5 });
    expect(run.now?.average).toBe(9.5);
  });

  it('can start right now, part-way through a slot', () => {
    const run = cheapestRun(slots(1, 1, 20), QUARTER, 5 * MIN)!;
    expect(run.best.start).toBe(5 * MIN);
    expect(run.best).toEqual(run.now);
  });

  it('prefers the earliest of equally cheap windows', () => {
    const run = cheapestRun(slots(5, 2, 2, 2, 2), 2 * QUARTER, 0)!;
    expect(run.best.start).toBe(QUARTER);
  });

  it('keeps the run inside the deadline', () => {
    const prices = slots(5, 4, 9, 1, 1);
    expect(cheapestRun(prices, 2 * QUARTER, 0)!.best.start).toBe(3 * QUARTER);
    expect(cheapestRun(prices, 2 * QUARTER, 0, 3 * QUARTER)!.best.start).toBe(0);
    expect(cheapestRun(prices, 2 * QUARTER, 0, QUARTER)).toBeNull();
  });

  it('returns null when the run is longer than the known prices', () => {
    expect(cheapestRun(slots(1, 2), 3 * QUARTER, 0)).toBeNull();
    expect(cheapestRun([], QUARTER, 0)).toBeNull();
  });

  it('handles negative prices', () => {
    expect(cheapestRun(slots(3, -1, -2, 4), 2 * QUARTER, 0)!.best.average).toBe(-1.5);
  });
});

describe('nextTimeOfDay', () => {
  const now = new Date(2026, 9, 4, 13, 5).getTime();

  it('picks today when the time is still ahead, otherwise tomorrow', () => {
    expect(nextTimeOfDay('18:30', now)).toBe(new Date(2026, 9, 4, 18, 30).getTime());
    expect(nextTimeOfDay('07:00', now)).toBe(new Date(2026, 9, 5, 7, 0).getTime());
    expect(nextTimeOfDay('13:05', now)).toBe(new Date(2026, 9, 5, 13, 5).getTime());
  });

  it('rejects anything that is not a time', () => {
    expect(nextTimeOfDay('', now)).toBeNull();
    expect(nextTimeOfDay('25:00', now)).toBeNull();
    expect(nextTimeOfDay('7:00', now)).toBeNull();
  });
});
