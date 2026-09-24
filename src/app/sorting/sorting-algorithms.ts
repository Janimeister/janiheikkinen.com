import type { AlgorithmMetadata, ComplexityCases } from '../visualization/algorithm-metadata';

/** Algorithms yield displayable events; the visualizer applies them to its own state. */
export type SortStep =
  | { type: 'compare'; indices: readonly [number, number] }
  | { type: 'swap'; indices: readonly [number, number] }
  | { type: 'write'; index: number; value: number }
  | { type: 'setPartition'; start: number; end: number }
  | { type: 'selectPivot'; index: number }
  | { type: 'selectInsertion'; index: number; value: number; prefixEnd: number }
  | { type: 'shift'; from: number; to: number; value: number }
  | { type: 'insert'; index: number; value: number }
  | { type: 'markSorted'; indices: readonly number[] }
  | { type: 'clearHighlights' };

export interface SortingAlgorithm extends Omit<
  AlgorithmMetadata<'sorting'>,
  'time' | 'stable' | 'inPlace'
> {
  readonly time: ComplexityCases;
  readonly stable: boolean;
  readonly inPlace: boolean;
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
    yield { type: 'markSorted', indices: [end] };
    if (!swapped) break;
  }
  yield { type: 'markSorted', indices: values.map((_, index) => index) };
}

export function* insertionSort(input: readonly number[]): Generator<SortStep, void, unknown> {
  const values = [...input];
  for (let index = 1; index < values.length; index++) {
    const value = values[index];
    yield { type: 'selectInsertion', index, value, prefixEnd: index - 1 };
    let cursor = index - 1;
    while (cursor >= 0) {
      yield { type: 'compare', indices: [cursor, index] };
      if (values[cursor] <= value) break;
      values[cursor + 1] = values[cursor];
      yield { type: 'shift', from: cursor, to: cursor + 1, value: values[cursor] };
      cursor--;
    }
    values[cursor + 1] = value;
    yield { type: 'insert', index: cursor + 1, value };
    yield {
      type: 'markSorted',
      indices: Array.from({ length: index + 1 }, (_, sortedIndex) => sortedIndex),
    };
  }
  yield { type: 'markSorted', indices: values.map((_, index) => index) };
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
  yield { type: 'markSorted', indices: values.map((_, index) => index) };
}

export function* quickSort(input: readonly number[]): Generator<SortStep, void, unknown> {
  const values = [...input];

  function* partition(low: number, high: number): Generator<SortStep, number, unknown> {
    const pivot = values[high];
    yield { type: 'setPartition', start: low, end: high };
    yield { type: 'selectPivot', index: high };
    let boundary = low;
    for (let cursor = low; cursor < high; cursor++) {
      yield { type: 'compare', indices: [cursor, high] };
      if (values[cursor] <= pivot) {
        if (boundary !== cursor) {
          [values[boundary], values[cursor]] = [values[cursor], values[boundary]];
          yield { type: 'swap', indices: [boundary, cursor] };
        }
        boundary++;
      }
    }
    if (boundary !== high) {
      [values[boundary], values[high]] = [values[high], values[boundary]];
      yield { type: 'swap', indices: [boundary, high] };
    }
    yield { type: 'markSorted', indices: [boundary] };
    yield { type: 'clearHighlights' };
    return boundary;
  }

  function* sort(low: number, high: number): Generator<SortStep, void, unknown> {
    if (low >= high) {
      if (low === high) yield { type: 'markSorted', indices: [low] };
      return;
    }
    const pivotIndex = yield* partition(low, high);
    yield* sort(low, pivotIndex - 1);
    yield* sort(pivotIndex + 1, high);
  }

  yield* sort(0, values.length - 1);
  yield { type: 'markSorted', indices: values.map((_, index) => index) };
}

/** Registering metadata and a generator is enough to add a sorting algorithm to the page. */
export const SORTING_ALGORITHMS: readonly SortingAlgorithm[] = [
  {
    id: 'bubble',
    category: 'sorting',
    nameKey: 'sorting.bubble',
    descriptionKey: 'sorting.bubbleDescription',
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    stable: true,
    inPlace: true,
    requirements: [],
    sort: bubbleSort,
  },
  {
    id: 'insertion',
    category: 'sorting',
    nameKey: 'sorting.insertion',
    descriptionKey: 'sorting.insertionDescription',
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    stable: true,
    inPlace: true,
    requirements: [],
    sort: insertionSort,
  },
  {
    id: 'merge',
    category: 'sorting',
    nameKey: 'sorting.merge',
    descriptionKey: 'sorting.mergeDescription',
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(n)',
    stable: true,
    inPlace: false,
    requirements: [],
    sort: mergeSort,
  },
  {
    id: 'quick',
    category: 'sorting',
    nameKey: 'sorting.quick',
    descriptionKey: 'sorting.quickDescription',
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    space: 'O(log n) average · O(n) worst',
    stable: false,
    inPlace: true,
    requirements: [],
    sort: quickSort,
  },
];
