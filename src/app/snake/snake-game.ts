/**
 * Snake's rules, kept free of Angular and the canvas so they can be tested on their own: moving,
 * turning, eating, crashing, placing food and speeding up.
 */

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Point {
  x: number;
  y: number;
}

export interface Board {
  cols: number;
  rows: number;
}

/** Faster ticks as the score grows; the first tier whose `minScore` is reached applies. */
export const SPEED_TIERS: readonly { minScore: number; level: number; interval: number }[] = [
  { minScore: 50, level: 5, interval: 70 },
  { minScore: 30, level: 4, interval: 90 },
  { minScore: 15, level: 3, interval: 110 },
  { minScore: 5, level: 2, interval: 130 },
  { minScore: 0, level: 1, interval: 150 },
];

export function speedTier(score: number): (typeof SPEED_TIERS)[number] {
  return SPEED_TIERS.find((tier) => score >= tier.minScore) ?? SPEED_TIERS.at(-1)!;
}

/** Arrow keys and WASD. */
export const KEY_DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  w: 'UP',
  W: 'UP',
  s: 'DOWN',
  S: 'DOWN',
  a: 'LEFT',
  A: 'LEFT',
  d: 'RIGHT',
  D: 'RIGHT',
};

const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

const DELTA: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

/** Three cells in the middle, heading right. */
export function initialSnake({ cols, rows }: Board): Point[] {
  const x = Math.floor(cols / 2);
  const y = Math.floor(rows / 2);
  return [
    { x, y },
    { x: x - 1, y },
    { x: x - 2, y },
  ];
}

/** A snake can't reverse into itself, so a turn to the opposite direction is ignored. */
export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITE[a] === b;
}

/** The direction of a swipe, or null when it's too short to count. */
export function swipeDirection(dx: number, dy: number, minSwipe = 30): Direction | null {
  if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'RIGHT' : 'LEFT';
  return dy > 0 ? 'DOWN' : 'UP';
}

/** Food on a random free cell, or null when the snake fills the board. */
export function placeFood(
  snake: readonly Point[],
  { cols, rows }: Board,
  random: () => number = Math.random,
): Point | null {
  const occupied = new Set(snake.map((s) => s.y * cols + s.x));
  const free: Point[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!occupied.has(y * cols + x)) free.push({ x, y });
    }
  }
  return free.length ? free[Math.floor(random() * free.length)] : null;
}

export type StepOutcome = 'moved' | 'ate' | 'crashed' | 'won';

export interface StepResult {
  outcome: StepOutcome;
  /** The snake after the step; unchanged after a crash. */
  snake: Point[];
  /** Where the food is now; null once the board is full. */
  food: Point | null;
}

/**
 * One tick: the head moves one cell. Hitting a wall or the body ends the game; the tail's cell
 * counts as free unless the snake grows this tick, since the tail moves away.
 */
export function step(
  snake: readonly Point[],
  direction: Direction,
  food: Point | null,
  board: Board,
  random: () => number = Math.random,
): StepResult {
  const delta = DELTA[direction];
  const head = { x: snake[0].x + delta.x, y: snake[0].y + delta.y };
  const crashed = (): StepResult => ({ outcome: 'crashed', snake: [...snake], food });

  if (head.x < 0 || head.x >= board.cols || head.y < 0 || head.y >= board.rows) return crashed();

  const eats = food !== null && head.x === food.x && head.y === food.y;
  const body = eats ? snake : snake.slice(0, -1);
  if (body.some((s) => s.x === head.x && s.y === head.y)) return crashed();

  if (!eats) return { outcome: 'moved', snake: [head, ...snake.slice(0, -1)], food };

  const grown = [head, ...snake];
  const next = placeFood(grown, board, random);
  return { outcome: next ? 'ate' : 'won', snake: grown, food: next };
}
