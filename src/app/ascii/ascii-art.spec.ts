import { describe, expect, it } from 'vitest';
import { COLS, generateGrid, ROWS, type AlgorithmId } from './ascii-art';

const ALGORITHMS: AlgorithmId[] = [
  'plasma',
  'mandelbrot',
  'waves',
  'spiral',
  'terrain',
  'coral',
  'windlines',
  'island',
];

const draw = (algorithm: AlgorithmId, seed: number) =>
  generateGrid(algorithm, seed)
    .map((row) => row.join(''))
    .join('\n');

describe('ASCII art generators', () => {
  it.each(ALGORITHMS)('%s fills the whole grid with one character per cell', (algorithm) => {
    const grid = generateGrid(algorithm, 42);

    expect(grid).toHaveLength(ROWS);
    for (const row of grid) {
      expect(row).toHaveLength(COLS);
      for (const cell of row) expect(cell).toHaveLength(1);
    }
  });

  it.each(ALGORITHMS)('%s draws something, not a blank or flat picture', (algorithm) => {
    const characters = new Set(draw(algorithm, 42).replace(/\n/g, ''));

    expect(characters.size).toBeGreaterThan(2);
  });

  it.each(ALGORITHMS)('%s gives the same picture for the same seed', (algorithm) => {
    expect(draw(algorithm, 7)).toBe(draw(algorithm, 7));
  });

  it.each(ALGORITHMS)('%s gives a different picture for another seed', (algorithm) => {
    expect(draw(algorithm, 7)).not.toBe(draw(algorithm, 123));
  });
});
