import { describe, expect, it } from 'vitest';
import { binarySearch, linearSearch, SEARCH_ALGORITHMS } from './search-algorithms';

function runSearch(
  generator: Generator<unknown, { found: boolean; index: number | null }, unknown>,
) {
  let step = generator.next();
  const events: unknown[] = [];
  while (!step.done) {
    events.push(step.value);
    step = generator.next();
  }
  return { result: step.value, events };
}

describe('Linear Search', () => {
  it('finds the first, last, and single value without requiring sorted data', () => {
    expect(runSearch(linearSearch([9, 2, 7], 9)).result).toEqual({ found: true, index: 0 });
    expect(runSearch(linearSearch([9, 2, 7], 7)).result).toEqual({ found: true, index: 2 });
    expect(runSearch(linearSearch([4], 4)).result).toEqual({ found: true, index: 0 });
  });

  it('reports missing targets and checks every value', () => {
    const { result, events } = runSearch(linearSearch([1, 3, 5], 4));
    expect(result).toEqual({ found: false, index: null });
    expect(events.filter((event) => (event as { type: string }).type === 'inspect')).toHaveLength(
      3,
    );
  });
});

describe('Binary Search', () => {
  it('finds boundary and single-element targets', () => {
    expect(runSearch(binarySearch([1, 4, 7, 9, 12], 1)).result).toEqual({ found: true, index: 0 });
    expect(runSearch(binarySearch([1, 4, 7, 9, 12], 12)).result).toEqual({ found: true, index: 4 });
    expect(runSearch(binarySearch([4], 4)).result).toEqual({ found: true, index: 0 });
  });

  it('reports missing targets and returns the first duplicate index', () => {
    expect(runSearch(binarySearch([1, 4, 7, 9], 5)).result).toEqual({ found: false, index: null });
    expect(runSearch(binarySearch([1, 4, 4, 4, 9], 4)).result).toEqual({ found: true, index: 1 });
  });

  it('provides declarative algorithm requirements and complexity', () => {
    expect(
      SEARCH_ALGORITHMS.map((algorithm) => [algorithm.id, algorithm.time, algorithm.space]),
    ).toEqual([
      ['linear', 'O(n)', 'O(1)'],
      ['binary', 'O(log n)', 'O(1)'],
    ]);
    expect(SEARCH_ALGORITHMS[0].requirements).toContain('searching.unsortedAllowed');
    expect(SEARCH_ALGORITHMS[1].requirements).toContain('searching.sortedRequired');
  });
});
