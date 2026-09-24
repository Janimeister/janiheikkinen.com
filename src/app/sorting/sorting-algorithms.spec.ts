import { describe, expect, it } from 'vitest';
import { SORTING_ALGORITHMS } from './sorting-algorithms';

for (const algorithm of SORTING_ALGORITHMS) {
  describe(algorithm.id, () => {
    const cases = [
      [],
      [1],
      [1, 2, 3],
      [5, 4, 3, 2, 1],
      [3, 1, 3, -2, 0],
      Array.from({ length: 80 }, (_, i) => 80 - i),
    ];
    it.each(cases.map((input) => ({ input })))(
      'replays valid operations to sort $input without mutating input',
      ({ input }) => {
        const original = [...input];
        const result = [...input];
        for (const step of algorithm.sort(input)) {
          const indices = step.type === 'write' ? [step.index] : step.indices;
          for (const index of indices) {
            expect(index).toBeGreaterThanOrEqual(0);
            expect(index).toBeLessThan(input.length);
          }
          if (step.type === 'swap') {
            const [a, b] = step.indices;
            [result[a], result[b]] = [result[b], result[a]];
          } else if (step.type === 'write') result[step.index] = step.value;
        }
        expect(result).toEqual([...original].sort((a, b) => a - b));
        expect(input).toEqual(original);
      },
    );
  });
}
