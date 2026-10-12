import { describe, expect, it } from 'vitest';
import {
  initialSnake,
  isOpposite,
  KEY_DIRECTIONS,
  placeFood,
  speedTier,
  step,
  swipeDirection,
  type Point,
} from './snake-game';

const BOARD = { cols: 5, rows: 5 };
const p = (x: number, y: number): Point => ({ x, y });

describe('step', () => {
  const snake = [p(2, 2), p(1, 2), p(0, 2)];

  it('moves the head and drops the tail', () => {
    expect(step(snake, 'RIGHT', p(4, 4), BOARD)).toEqual({
      outcome: 'moved',
      snake: [p(3, 2), p(2, 2), p(1, 2)],
      food: p(4, 4),
    });
    expect(step(snake, 'UP', p(4, 4), BOARD).snake[0]).toEqual(p(2, 1));
    expect(step(snake, 'DOWN', p(4, 4), BOARD).snake[0]).toEqual(p(2, 3));
  });

  it('does not change the snake it was given', () => {
    const before = structuredClone(snake);
    step(snake, 'RIGHT', p(3, 2), BOARD);
    expect(snake).toEqual(before);
  });

  it('grows on food and puts new food on a free cell', () => {
    const result = step(snake, 'RIGHT', p(3, 2), BOARD, () => 0);
    expect(result.outcome).toBe('ate');
    expect(result.snake).toEqual([p(3, 2), p(2, 2), p(1, 2), p(0, 2)]);
    expect(result.food).toEqual(p(0, 0));
  });

  it('crashes into each wall', () => {
    const corner = [p(0, 0), p(1, 0)];
    expect(step(corner, 'LEFT', null, BOARD).outcome).toBe('crashed');
    expect(step(corner, 'UP', null, BOARD).outcome).toBe('crashed');
    const far = [p(4, 4), p(3, 4)];
    expect(step(far, 'RIGHT', null, BOARD).outcome).toBe('crashed');
    expect(step(far, 'DOWN', null, BOARD).outcome).toBe('crashed');
  });

  it('crashes into its body but may follow its own tail', () => {
    // A 2×2 loop: the head moves onto the cell the tail is leaving.
    const loop = [p(1, 1), p(1, 2), p(2, 2), p(2, 1)];
    expect(step(loop, 'RIGHT', null, BOARD).outcome).toBe('moved');
    // Growing this tick keeps the tail in place, so the same move is a crash.
    expect(step(loop, 'RIGHT', p(2, 1), BOARD).outcome).toBe('crashed');
    // Turning back into the neck.
    expect(step(loop, 'DOWN', null, BOARD)).toEqual({
      outcome: 'crashed',
      snake: loop,
      food: null,
    });
  });

  it('wins when the last free cell is eaten', () => {
    const board = { cols: 2, rows: 2 };
    const result = step([p(0, 0), p(0, 1), p(1, 1)], 'RIGHT', p(1, 0), board);
    expect(result).toEqual({
      outcome: 'won',
      snake: [p(1, 0), p(0, 0), p(0, 1), p(1, 1)],
      food: null,
    });
  });
});

describe('placeFood', () => {
  it('only uses free cells', () => {
    const snake = [p(0, 0), p(1, 0), p(2, 0)];
    for (const r of [0, 0.25, 0.5, 0.999]) {
      const food = placeFood(snake, { cols: 3, rows: 2 }, () => r)!;
      expect(food.y).toBe(1);
    }
  });

  it('is null on a full board', () => {
    expect(placeFood([p(0, 0), p(1, 0)], { cols: 2, rows: 1 })).toBeNull();
  });
});

describe('controls', () => {
  it('starts in the middle, heading right', () => {
    expect(initialSnake({ cols: 20, rows: 20 })).toEqual([p(10, 10), p(9, 10), p(8, 10)]);
  });

  it('refuses to reverse', () => {
    expect(isOpposite('UP', 'DOWN')).toBe(true);
    expect(isOpposite('LEFT', 'RIGHT')).toBe(true);
    expect(isOpposite('UP', 'LEFT')).toBe(false);
    expect(isOpposite('UP', 'UP')).toBe(false);
  });

  it('reads arrows and WASD in either case', () => {
    expect([KEY_DIRECTIONS['ArrowUp'], KEY_DIRECTIONS['w'], KEY_DIRECTIONS['W']]).toEqual([
      'UP',
      'UP',
      'UP',
    ]);
    expect(KEY_DIRECTIONS['x']).toBeUndefined();
  });

  it('turns swipes into directions along the longer axis', () => {
    expect(swipeDirection(10, -20)).toBeNull();
    expect(swipeDirection(40, 10)).toBe('RIGHT');
    expect(swipeDirection(-40, 39)).toBe('LEFT');
    expect(swipeDirection(5, 31)).toBe('DOWN');
    expect(swipeDirection(-30, -30)).toBe('UP');
  });
});

describe('speedTier', () => {
  it('speeds up at 5, 15, 30 and 50 points', () => {
    expect([0, 4, 5, 14, 15, 29, 30, 49, 50, 500].map((s) => speedTier(s).level)).toEqual([
      1, 1, 2, 2, 3, 3, 4, 4, 5, 5,
    ]);
    expect(speedTier(0).interval).toBeGreaterThan(speedTier(50).interval);
  });
});
