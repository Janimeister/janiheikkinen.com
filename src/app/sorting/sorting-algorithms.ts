import type { TranslationKey } from '../i18n/translations';

/** Algorithms own a copy of the input and emit operations; the player owns time and rendering. */
export type SortStep =
  | { type: 'compare'; indices: readonly [number, number] }
  | { type: 'swap'; indices: readonly [number, number] }
  | { type: 'write'; index: number; value: number };

export interface SortingAlgorithm {
  readonly id: string;
  readonly nameKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
  readonly time: string;
  readonly space: string;
  readonly sort: (input: readonly number[]) => Generator<SortStep, void, unknown>;
}

export function* bubbleSort(input: readonly number[]): Generator<SortStep, void, unknown> {
  const values = [...input];
  for (let end = values.length - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      yield { type: 'compare', indices: [i, i + 1] };
      if (values[i] > values[i + 1]) {
        [values[i], values[i + 1]] = [values[i + 1], values[i]];
        yield { type: 'swap', indices: [i, i + 1] };
        swapped = true;
      }
    }
    if (!swapped) break;
  }
}

export function* mergeSort(input: readonly number[]): Generator<SortStep, void, unknown> {
  const values = [...input];
  function* merge(start: number, end: number): Generator<SortStep, void, unknown> {
    if (end - start < 2) return;
    const middle = Math.floor((start + end) / 2);
    yield* merge(start, middle);
    yield* merge(middle, end);
    const merged: number[] = [];
    let left = start;
    let right = middle;
    while (left < middle && right < end) {
      yield { type: 'compare', indices: [left, right] };
      merged.push(values[left] <= values[right] ? values[left++] : values[right++]);
    }
    while (left < middle) merged.push(values[left++]);
    while (right < end) merged.push(values[right++]);
    for (let i = 0; i < merged.length; i++) {
      values[start + i] = merged[i];
      yield { type: 'write', index: start + i, value: merged[i] };
    }
  }
  yield* merge(0, values.length);
}

/** Add a generator and one entry here to expose another algorithm in the page. */
export const SORTING_ALGORITHMS: readonly SortingAlgorithm[] = [
  {
    id: 'bubble',
    nameKey: 'sorting.bubble',
    descriptionKey: 'sorting.bubbleDescription',
    time: 'O(n²)',
    space: 'O(n)',
    sort: bubbleSort,
  },
  {
    id: 'merge',
    nameKey: 'sorting.merge',
    descriptionKey: 'sorting.mergeDescription',
    time: 'O(n log n)',
    space: 'O(n)',
    sort: mergeSort,
  },
];
