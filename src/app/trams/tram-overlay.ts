import { blankCells, type Cell, lineClass, SHARED_TRACK_CLASS } from './ascii-raster';
import { type Grid, toCell } from './grid';
import type { TramState } from './hfp';

/** One label on the overlay: a tram's line number, or `*` where several trams overlap. */
export interface TramMarker {
  row: number;
  col: number;
  text: string;
  cls: string;
  /** Vehicle keys, in drawing order. */
  keys: string[];
}

export interface TramOverlay {
  cells: Cell[][];
  markers: TramMarker[];
  /** Trams inside this grid. */
  count: number;
}

export const CLUSTER_GLYPH = '*';

const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

const isTrack = (cell: Cell | undefined) =>
  !!cell && (cell.cls === SHARED_TRACK_CLASS || cell.cls.startsWith('line-'));

/**
 * GPS jitter can put a tram a cell off its track. If it isn't on a track, move it to a
 * neighbouring cell of its own line, or else of a shared track.
 */
export function snapToTrack(
  base: readonly (readonly Cell[])[],
  row: number,
  col: number,
  desi: string,
): { row: number; col: number } {
  if (isTrack(base[row]?.[col])) return { row, col };
  // Depot runs like `4H` drive on line 4's track; the `H` line can be on any.
  const own = lineClass(desi.replace(/H$/, '') || desi);
  let fallback: { row: number; col: number } | null = null;
  for (const [dr, dc] of NEIGHBOURS) {
    const cell = base[row + dr]?.[col + dc];
    if (cell?.cls === own) return { row: row + dr, col: col + dc };
    if (!fallback && isTrack(cell)) fallback = { row: row + dr, col: col + dc };
  }
  return fallback ?? { row, col };
}

/**
 * Stamps trams onto a transparent overlay the size of the grid. Each tram is its line number,
 * starting at its cell; trams whose labels would overlap or touch merge into one `*`. Older fixes
 * are drawn first.
 */
export function renderTramOverlay(
  grid: Grid,
  base: readonly (readonly Cell[])[],
  trams: Iterable<TramState>,
  isDim: (tram: TramState) => boolean = (tram) => tram.depotRun,
): TramOverlay {
  const sorted = [...trams].sort((a, b) => a.tst - b.tst);
  const markers: TramMarker[] = [];
  const owner = new Map<number, TramMarker>();
  let count = 0;

  for (const tram of sorted) {
    const at = toCell(grid, tram.lat, tram.lon);
    if (!at) continue;
    count++;
    const snapped = snapToTrack(base, at.row, at.col, tram.desi);
    const text = tram.desi;
    const row = snapped.row;
    const col = Math.max(0, Math.min(snapped.col, grid.cols - text.length));

    const span = Array.from(text, (_, i) => row * grid.cols + col + i);
    // Labels that touch would read as one number, like `1` and `7` as a line 17, so a label also
    // needs a free cell on each side (within the row).
    const neighbours = [col - 1, col + text.length]
      .filter((c) => c >= 0 && c < grid.cols)
      .map((c) => row * grid.cols + c);
    const clash = [...span, ...neighbours]
      .map((key) => owner.get(key))
      .find((m) => m !== undefined);
    if (clash) {
      clash.keys.push(tram.key);
      clash.text = CLUSTER_GLYPH;
      clash.cls = 'tram tram-cluster';
      continue;
    }
    const marker: TramMarker = {
      row,
      col,
      text,
      cls: `tram ${isDim(tram) ? 'tram-dim' : lineClass(text.replace(/H$/, '') || text)}`,
      keys: [tram.key],
    };
    markers.push(marker);
    for (const key of span) owner.set(key, marker);
  }

  const cells = blankCells(grid);
  for (const marker of markers) {
    // A cluster still owns the cells of the label it replaced, so later trams there join it.
    for (let i = 0; i < marker.text.length; i++) {
      cells[marker.row][marker.col + i] = { ch: marker.text[i], cls: marker.cls };
    }
  }
  return { cells, markers, count };
}
