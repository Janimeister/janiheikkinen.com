import { cellCenter, type Grid, project } from './grid';
import type { LonLat, MapLabel, Polygon, TramMapData } from './tram-map.model';

/** One character of the map. `cls` is a CSS class, or '' for plain land. */
export interface Cell {
  ch: string;
  cls: string;
}

/** A run of neighbouring cells with the same class, rendered as one `<span>`. */
export interface Run {
  text: string;
  cls: string;
}

export type TrackDirection = 'h' | 'v' | 'up' | 'down';

export interface GlyphSet {
  /** Sea glyphs for even and odd rows. */
  sea: readonly [string, string];
  park: string;
  stop: string;
  track: Readonly<Record<TrackDirection | 'cross', string>>;
}

/** Pure ASCII: renders in any monospace font, including the web font's Latin subset. */
export const ASCII_GLYPHS: GlyphSet = {
  sea: ['~', '~'],
  park: ',',
  stop: 'o',
  track: { h: '-', v: '|', up: '/', down: '\\', cross: '+' },
};

/** Box drawing. Looks smoother, but these glyphs come from a fallback font and may misalign. */
export const UNICODE_GLYPHS: GlyphSet = {
  sea: ['~', '≈'],
  park: ',',
  stop: 'o',
  track: { h: '─', v: '│', up: '╱', down: '╲', cross: '┼' },
};

export const SHARED_TRACK_CLASS = 'line-shared';

/** CSS class for a line: `'4'` → `line-4`, `'H'` → `line-h`. */
export function lineClass(desi: string): string {
  return `line-${desi.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

export function blankCells(grid: Grid): Cell[][] {
  return Array.from({ length: grid.rows }, () =>
    Array.from({ length: grid.cols }, () => ({ ch: ' ', cls: '' })),
  );
}

/**
 * Scanline fill with the even–odd rule. A cell is inside when its centre is, so a polygon narrower
 * than a cell can vanish, which is what we want for a map this coarse.
 */
export function fillPolygon(
  grid: Grid,
  polygon: Polygon,
  visit: (row: number, col: number) => void,
): void {
  const { west, cell } = grid.preset;
  let south = Infinity;
  let north = -Infinity;
  for (const ring of polygon) {
    for (const [, lat] of ring) {
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  }
  const firstRow = Math.max(0, Math.floor(project(grid, west, north)[1]));
  const lastRow = Math.min(grid.rows - 1, Math.floor(project(grid, west, south)[1]));
  for (let row = firstRow; row <= lastRow; row++) {
    const y = cellCenter(grid, row, 0).lat;
    const crossings: number[] = [];
    for (const ring of polygon) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [ax, ay] = ring[j];
        const [bx, by] = ring[i];
        if (ay > y !== by > y) crossings.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      // Columns whose centre lies in [x0, x1).
      const first = Math.max(0, Math.ceil((crossings[k] - west) / cell - 0.5));
      const last = Math.min(grid.cols - 1, Math.ceil((crossings[k + 1] - west) / cell - 0.5) - 1);
      for (let col = first; col <= last; col++) visit(row, col);
    }
  }
}

/**
 * The glyph direction for a segment `dx` columns east and `dy` rows south. A cell is drawn about
 * twice as tall as it is wide, so rows count double when judging the visible angle.
 */
export function trackDirection(dx: number, dy: number): TrackDirection {
  const angle = (Math.atan2(Math.abs(dy * 2), Math.abs(dx)) * 180) / Math.PI;
  if (angle < 22.5) return 'h';
  if (angle > 67.5) return 'v';
  // Rows grow southwards, so east-and-north (dy < 0) is the rising diagonal.
  return dx * dy < 0 ? 'up' : 'down';
}

const PERPENDICULAR: Readonly<Record<TrackDirection, TrackDirection>> = {
  h: 'v',
  v: 'h',
  up: 'down',
  down: 'up',
};

/** Visits every cell a polyline passes through (Bresenham per segment) with its direction. */
export function traceLine(
  grid: Grid,
  points: readonly LonLat[],
  visit: (row: number, col: number, direction: TrackDirection) => void,
): void {
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = project(grid, points[i - 1][0], points[i - 1][1]);
    const [bx, by] = project(grid, points[i][0], points[i][1]);
    const direction = trackDirection(bx - ax, by - ay);
    let col = Math.floor(ax);
    let row = Math.floor(ay);
    const endCol = Math.floor(bx);
    const endRow = Math.floor(by);
    const dc = Math.abs(endCol - col);
    const dr = -Math.abs(endRow - row);
    const sc = col < endCol ? 1 : -1;
    const sr = row < endRow ? 1 : -1;
    let err = dc + dr;
    for (;;) {
      if (row >= 0 && col >= 0 && row < grid.rows && col < grid.cols) visit(row, col, direction);
      if (col === endCol && row === endRow) break;
      const e2 = 2 * err;
      if (e2 >= dr) {
        err += dr;
        col += sc;
      }
      if (e2 <= dc) {
        err += dc;
        row += sr;
      }
    }
  }
}

/** Where to try a label relative to its point, nearest first: [rows, columns]. */
const LABEL_OFFSETS: readonly (readonly [number, number])[] = [0, -1, 1, -2, 2].flatMap((dr) =>
  [0, -2, 2, -4, 4].map((dc) => [dr, dc] as const),
);

/**
 * Places labels (upper case) on free cells, most important first. A label may move up to two rows
 * and four columns from its point, and keeps a one-cell gap on both sides. Returns the names that
 * fitted.
 */
export function placeLabels(
  cells: Cell[][],
  labels: readonly MapLabel[],
  grid: Grid,
  isFree: (cell: Cell) => boolean,
): string[] {
  const placed: string[] = [];
  const sorted = [...labels].sort((a, b) => a.rank - b.rank);
  for (const label of sorted) {
    const text = label.name.toLocaleUpperCase('fi');
    const [x, y] = project(grid, label.lon, label.lat);
    for (const [dr, dc] of LABEL_OFFSETS) {
      const row = Math.floor(y) + dr;
      const start = Math.round(x - text.length / 2) + dc;
      if (row < 0 || row >= grid.rows || start - 1 < 0 || start + text.length >= grid.cols)
        continue;
      let free = true;
      for (let col = start - 1; col <= start + text.length && free; col++) {
        free = isFree(cells[row][col]);
      }
      if (!free) continue;
      for (let i = 0; i < text.length; i++) cells[row][start + i] = { ch: text[i], cls: 'label' };
      placed.push(label.name);
      break;
    }
  }
  return placed;
}

export interface BaseMap {
  cells: Cell[][];
  /** Lines with at least one track cell on this grid, in data order. */
  lines: string[];
  stopCount: number;
  labels: string[];
}

/**
 * Composites the static layers: parks, water (sea and lakes), tracks coloured by line (or shared),
 * stops and labels. Trams are drawn later, on a separate overlay.
 */
export function renderBaseMap(
  data: TramMapData,
  grid: Grid,
  glyphs: GlyphSet = ASCII_GLYPHS,
): BaseMap {
  const cells = blankCells(grid);

  for (const park of data.parks) {
    fillPolygon(grid, park, (row, col) => (cells[row][col] = { ch: glyphs.park, cls: 'park' }));
  }
  for (const water of data.water) {
    fillPolygon(
      grid,
      water,
      (row, col) => (cells[row][col] = { ch: glyphs.sea[row % 2], cls: 'sea' }),
    );
  }

  const track = new Map<
    number,
    { direction: TrackDirection; lines: Set<string>; cross: boolean }
  >();
  for (const line of data.lines) {
    for (const shape of line.shapes) {
      traceLine(grid, shape, (row, col, direction) => {
        const key = row * grid.cols + col;
        const existing = track.get(key);
        if (!existing) {
          track.set(key, { direction, lines: new Set([line.desi]), cross: false });
          return;
        }
        // Mark real crossings, not a line meeting itself at a bend.
        if (!existing.lines.has(line.desi) && PERPENDICULAR[existing.direction] === direction) {
          existing.cross = true;
        }
        existing.lines.add(line.desi);
      });
    }
  }
  const visibleLines = new Set<string>();
  for (const [key, t] of track) {
    const row = Math.floor(key / grid.cols);
    const col = key % grid.cols;
    for (const desi of t.lines) visibleLines.add(desi);
    cells[row][col] = {
      ch: t.cross ? glyphs.track.cross : glyphs.track[t.direction],
      cls: t.lines.size > 1 ? SHARED_TRACK_CLASS : lineClass([...t.lines][0]),
    };
  }

  let stopCount = 0;
  for (const stop of data.stops) {
    const [x, y] = project(grid, stop.lon, stop.lat);
    const row = Math.floor(y);
    const col = Math.floor(x);
    if (row < 0 || col < 0 || row >= grid.rows || col >= grid.cols) continue;
    stopCount++;
    cells[row][col] = { ch: glyphs.stop, cls: 'stop' };
  }

  const labels = placeLabels(
    cells,
    data.labels,
    grid,
    (cell) => cell.cls === '' || cell.cls === 'park',
  );

  return {
    cells,
    lines: data.lines.map((l) => l.desi).filter((desi) => visibleLines.has(desi)),
    stopCount,
    labels,
  };
}

/** Merges each row into runs of the same class, so the template needs few `<span>`s. */
export function toRuns(cells: readonly (readonly Cell[])[]): Run[][] {
  return cells.map((row) => {
    const runs: Run[] = [];
    for (const cell of row) {
      const last = runs.at(-1);
      if (last && last.cls === cell.cls) last.text += cell.ch;
      else runs.push({ text: cell.ch, cls: cell.cls });
    }
    return runs;
  });
}

export function toText(cells: readonly (readonly Cell[])[]): string {
  return cells.map((row) => row.map((c) => c.ch).join('')).join('\n');
}
