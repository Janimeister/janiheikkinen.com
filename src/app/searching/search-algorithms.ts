import type { TranslationKey } from '../i18n/translations';
import type { AlgorithmMetadata } from '../visualization/algorithm-metadata';

export interface SearchResult {
  readonly found: boolean;
  readonly index: number | null;
}

export type SearchStep =
  | { type: 'inspect'; index: number }
  | { type: 'setRange'; low: number; high: number }
  | { type: 'setMidpoint'; index: number }
  | { type: 'eliminate'; indices: readonly number[] }
  | { type: 'found'; index: number }
  | { type: 'notFound' };

export interface SearchAlgorithm extends Omit<
  AlgorithmMetadata<'searching'>,
  'time' | 'requirements'
> {
  readonly time: string;
  readonly requirements: readonly [TranslationKey, ...TranslationKey[]];
  readonly search: (
    values: readonly number[],
    target: number,
  ) => Generator<SearchStep, SearchResult, unknown>;
}

export function* linearSearch(
  values: readonly number[],
  target: number,
): Generator<SearchStep, SearchResult, unknown> {
  for (let index = 0; index < values.length; index++) {
    yield { type: 'inspect', index };
    if (values[index] === target) {
      yield { type: 'found', index };
      return { found: true, index };
    }
  }
  yield { type: 'notFound' };
  return { found: false, index: null };
}

/** Lower-bound binary search returns the first matching index when duplicates exist. */
export function* binarySearch(
  values: readonly number[],
  target: number,
): Generator<SearchStep, SearchResult, unknown> {
  let low = 0;
  let high = values.length - 1;
  let match: number | null = null;
  yield { type: 'setRange', low, high };

  while (low <= high) {
    const midpoint = Math.floor((low + high) / 2);
    yield { type: 'setMidpoint', index: midpoint };
    yield { type: 'inspect', index: midpoint };
    if (values[midpoint] < target) {
      yield {
        type: 'eliminate',
        indices: Array.from({ length: midpoint - low + 1 }, (_, offset) => low + offset),
      };
      low = midpoint + 1;
    } else {
      if (values[midpoint] === target) match = midpoint;
      const firstEliminated = values[midpoint] === target ? midpoint + 1 : midpoint;
      yield {
        type: 'eliminate',
        indices: Array.from(
          { length: Math.max(0, high - firstEliminated + 1) },
          (_, offset) => firstEliminated + offset,
        ),
      };
      high = midpoint - 1;
    }
    yield { type: 'setRange', low, high };
  }

  if (match !== null) {
    yield { type: 'found', index: match };
    return { found: true, index: match };
  }
  yield { type: 'notFound' };
  return { found: false, index: null };
}

/** Each search registers its metadata and a step generator in this catalog. */
export const SEARCH_ALGORITHMS: readonly SearchAlgorithm[] = [
  {
    id: 'linear',
    category: 'searching',
    nameKey: 'searching.linear',
    descriptionKey: 'searching.linearDescription',
    time: 'O(n)',
    space: 'O(1)',
    requirements: ['searching.unsortedAllowed'],
    search: linearSearch,
  },
  {
    id: 'binary',
    category: 'searching',
    nameKey: 'searching.binary',
    descriptionKey: 'searching.binaryDescription',
    time: 'O(log n)',
    space: 'O(1)',
    requirements: ['searching.sortedRequired'],
    search: binarySearch,
  },
];
