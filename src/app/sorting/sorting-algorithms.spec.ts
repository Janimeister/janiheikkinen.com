import { describe, expect, it } from 'vitest';
import { SORTING_ALGORITHMS } from './sorting-algorithms';

for (const algorithm of SORTING_ALGORITHMS) {
  describe(algorithm.id, () => {
    const cases = [
      [],
      [1],
      [1, 2, 3],
      [2, 2, 2, 2, 2],
      [1, 2, 3, 4, 5],
      [5, 4, 3, 2, 1],
      [3, 1, 3, -2, 0],
      [4, 2, 4, 1, 2, 1],
      Array.from({ length: 80 }, (_, i) => 80 - i),
    ];
    it.each(cases.map((input) => ({ input })))(
      'replays valid operations to sort $input without mutating input',
      ({ input }) => {
        const original = [...input];
        const result = [...input];
        for (const step of algorithm.sort(input)) {
          const indices =
            step.type === 'write' || step.type === 'insert' || step.type === 'compareInsertion'
              ? [step.index]
              : step.type === 'shift'
                ? [step.from, step.to]
                : step.type === 'compare' || step.type === 'swap'
                  ? step.indices
                  : step.type === 'selectPivot'
                    ? [step.index]
                    : [];
          for (const index of indices) {
            expect(index).toBeGreaterThanOrEqual(0);
            expect(index).toBeLessThan(input.length);
          }
          if (step.type === 'swap') {
            const [a, b] = step.indices;
            [result[a], result[b]] = [result[b], result[a]];
          } else if (step.type === 'write' || step.type === 'insert') {
            result[step.index] = step.value;
          } else if (step.type === 'shift') {
            result[step.to] = step.value;
          }
        }
        expect(result).toEqual([...original].sort((a, b) => a - b));
        expect(input).toEqual(original);
      },
    );
  });
}

describe('sorting metadata and learning events', () => {
  it('provides complexity, stability, and in-place metadata for each algorithm', () => {
    expect(SORTING_ALGORITHMS.map(({ id }) => id)).toEqual([
      'bubble',
      'insertion',
      'merge',
      'quick',
    ]);
    for (const algorithm of SORTING_ALGORITHMS) {
      expect(algorithm.category).toBe('sorting');
      expect(algorithm.time.best).toBeTruthy();
      expect(algorithm.time.average).toBeTruthy();
      expect(algorithm.time.worst).toBeTruthy();
      expect(typeof algorithm.stable).toBe('boolean');
      expect(typeof algorithm.inPlace).toBe('boolean');
    }
  });

  it('emits insertion and pivot cues for their visualizers', () => {
    const insertionEvents = [
      ...SORTING_ALGORITHMS.find(({ id }) => id === 'insertion')!.sort([3, 1, 2]),
    ];
    const quickEvents = [...SORTING_ALGORITHMS.find(({ id }) => id === 'quick')!.sort([3, 1, 2])];
    expect(insertionEvents.some((event) => event.type === 'selectInsertion')).toBe(true);
    expect(insertionEvents.some((event) => event.type === 'shift')).toBe(true);
    expect(insertionEvents.some((event) => event.type === 'insert')).toBe(true);
    expect(quickEvents.some((event) => event.type === 'selectPivot')).toBe(true);
    expect(quickEvents.some((event) => event.type === 'setPartition')).toBe(true);
    expect(quickEvents.some((event) => event.type === 'markSorted')).toBe(true);
  });
});
