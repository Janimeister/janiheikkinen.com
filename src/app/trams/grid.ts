/**
 * The character grid behind the tram map: one cell per 0.001° × 0.001° (or a multiple).
 *
 * At 60.18° N, 0.001° of longitude is about 55 m and 0.001° of latitude about 111 m. That 1 : 2
 * ratio matches a monospace character cell, so a plain lat/lon grid needs no projection and no
 * aspect correction, and it lines up with the decimal digits of HFP's geohash.
 */

export type PresetId = 'centre' | 'network' | 'mobile';

export interface GridPreset {
  id: PresetId;
  south: number;
  west: number;
  north: number;
  east: number;
  /** Cell size in degrees, the same for latitude and longitude. */
  cell: number;
}

export const GRID_PRESETS: Readonly<Record<PresetId, GridPreset>> = {
  centre: { id: 'centre', south: 60.15, west: 24.87, north: 60.217, east: 25.01, cell: 0.001 },
  network: { id: 'network', south: 60.148, west: 24.865, north: 60.22, east: 25.056, cell: 0.0015 },
  mobile: { id: 'mobile', south: 60.155, west: 24.905, north: 60.195, east: 24.965, cell: 0.001 },
};

export interface Grid {
  preset: GridPreset;
  cols: number;
  rows: number;
}

export interface CellPosition {
  row: number;
  col: number;
}

// Coordinates are compared in whole micro-degrees (HFP sends six decimals), so that exact 0.001°
// boundaries, which binary floating point can't represent, always fall into the cell they start.
const MICRO = 1e6;
const micro = (degrees: number) => Math.round(degrees * MICRO);

export function createGrid(preset: GridPreset): Grid {
  const cell = micro(preset.cell);
  return {
    preset,
    cols: Math.ceil((micro(preset.east) - micro(preset.west)) / cell),
    rows: Math.ceil((micro(preset.north) - micro(preset.south)) / cell),
  };
}

/**
 * Fractional grid coordinates: `x` grows east in columns, `y` grows south in rows.
 * The cell of a point is `(floor(y), floor(x))`.
 */
export function project(grid: Grid, lon: number, lat: number): [x: number, y: number] {
  const cell = micro(grid.preset.cell);
  return [
    (micro(lon) - micro(grid.preset.west)) / cell,
    (micro(grid.preset.north) - micro(lat)) / cell,
  ];
}

/**
 * The cell containing a point, or null outside the grid. Cells include their west and north edges:
 * `col = floor((lon - west) / cell)`, `row = floor((north - lat) / cell)`.
 */
export function toCell(grid: Grid, lat: number, lon: number): CellPosition | null {
  const [x, y] = project(grid, lon, lat);
  const col = Math.floor(x);
  const row = Math.floor(y);
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return null;
  return { row, col };
}

/** The centre of a cell. */
export function cellCenter(grid: Grid, row: number, col: number): { lat: number; lon: number } {
  const { north, west, cell } = grid.preset;
  return { lat: north - (row + 0.5) * cell, lon: west + (col + 0.5) * cell };
}

/** Narrow screens start on the small mobile box, everything else on the city centre. */
export function defaultPreset(containerWidth: number): PresetId {
  return containerWidth < 640 ? 'mobile' : 'centre';
}
