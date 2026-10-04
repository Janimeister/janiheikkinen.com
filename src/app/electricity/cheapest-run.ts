/** One price slot, with times in epoch milliseconds. `end` is exclusive. */
export interface PriceSlot {
  start: number;
  end: number;
  /** c/kWh, VAT included. */
  price: number;
}

/** A run of an appliance: when it starts and ends, and the average price it pays. */
export interface RunWindow {
  start: number;
  end: number;
  /** c/kWh, weighted by how long the run spends in each slot. */
  average: number;
}

export interface CheapestRun {
  best: RunWindow;
  /** Starting right away, or null when the prices don't cover a run that starts now. */
  now: RunWindow | null;
}

/**
 * The average price over `[from, to)`, weighted by time, or null when the slots don't cover the
 * whole span without a gap.
 */
export function averagePrice(slots: readonly PriceSlot[], from: number, to: number): number | null {
  let covered = from;
  let sum = 0;
  for (const slot of slots) {
    if (slot.end <= covered) continue;
    if (slot.start > covered) return null;
    const until = Math.min(slot.end, to);
    sum += slot.price * (until - covered);
    covered = until;
    if (covered >= to) return sum / (to - from);
  }
  return null;
}

/**
 * The cheapest time to run something for `duration` ms, starting now or on a later slot boundary
 * and, with a `deadline`, ending by it. Ties go to the earliest start. `slots` must be sorted.
 * Returns null when no window fits in the prices that are known.
 */
export function cheapestRun(
  slots: readonly PriceSlot[],
  duration: number,
  now: number,
  deadline: number | null = null,
): CheapestRun | null {
  if (!slots.length || duration <= 0) return null;
  const starts = [now, ...slots.map((slot) => slot.start).filter((start) => start > now)];
  const fits = (start: number) => deadline === null || start + duration <= deadline;

  const windowAt = (start: number): RunWindow | null => {
    const average = averagePrice(slots, start, start + duration);
    return average === null ? null : { start, end: start + duration, average };
  };

  let best: RunWindow | null = null;
  for (const start of starts) {
    if (!fits(start)) break;
    const window = windowAt(start);
    // A hundredth of a cent is noise; the earlier start is the better answer.
    if (window && (!best || window.average < best.average - 1e-4)) best = window;
  }
  return best ? { best, now: windowAt(now) } : null;
}

/**
 * The next time the clock shows `hhmm` ("07:00") after `now`, in local time, or null when the
 * value isn't a time.
 */
export function nextTimeOfDay(hhmm: string, now: number): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const [hours, minutes] = [Number(match[1]), Number(match[2])];
  if (hours > 23 || minutes > 59) return null;
  const today = new Date(now);
  const at = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
  if (at.getTime() <= now) at.setDate(at.getDate() + 1);
  return at.getTime();
}
