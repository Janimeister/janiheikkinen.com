import { describe, expect, it } from 'vitest';
import { cellCenter, createGrid, defaultPreset, GRID_PRESETS, project, toCell } from './grid';

describe('Tram map grid', () => {
  it.each([
    ['centre', 140, 67],
    ['network', 128, 48],
    ['mobile', 60, 40],
  ] as const)('sizes the %s preset to %i × %i cells', (id, cols, rows) => {
    const grid = createGrid(GRID_PRESETS[id]);
    expect([grid.cols, grid.rows]).toEqual([cols, rows]);
  });

  const centre = createGrid(GRID_PRESETS.centre);

  it('puts the north-west corner in the first cell and leaves the far edges out', () => {
    expect(toCell(centre, 60.217, 24.87)).toEqual({ row: 0, col: 0 });
    expect(toCell(centre, 60.150001, 25.009999)).toEqual({ row: 66, col: 139 });
    expect(toCell(centre, 60.15, 24.95)).toBeNull();
    expect(toCell(centre, 60.18, 25.01)).toBeNull();
    expect(toCell(centre, 60.217001, 24.95)).toBeNull();
    expect(toCell(centre, 60.18, 24.869999)).toBeNull();
  });

  // Positions are resolved to whole micro-degrees, the precision of HFP's six-decimal coordinates.
  it('starts a new cell exactly on every 0.001° line, despite floating point', () => {
    for (let k = 0; k < centre.cols; k++) {
      // 24.87 + k * 0.001 is often a hair below the exact decimal, e.g. 24.872999999999998.
      expect(toCell(centre, 60.2, 24.87 + k * 0.001)?.col).toBe(k);
    }
    for (let k = 0; k < centre.rows; k++) {
      expect(toCell(centre, 60.217 - k * 0.001, 24.9)?.row).toBe(k);
    }
    expect(toCell(centre, 60.2, 24.873999)?.col).toBe(3);
    expect(toCell(centre, 60.216001, 24.9)?.row).toBe(0);
  });

  it('maps HFP coordinates with six decimals like the plan formula', () => {
    // Merisotilaantori, from the recorded HFP message in the plan.
    const { lat, lon } = { lat: 60.167411, lon: 24.974489 };
    expect(toCell(centre, lat, lon)).toEqual({
      row: Math.floor((60.217 - lat) / 0.001),
      col: Math.floor((lon - 24.87) / 0.001),
    });
  });

  it('uses 0.0015° cells for the whole network', () => {
    const network = createGrid(GRID_PRESETS.network);
    expect(toCell(network, 60.22, 24.865)).toEqual({ row: 0, col: 0 });
    expect(toCell(network, 60.2185, 24.8665)).toEqual({ row: 1, col: 1 });
    expect(toCell(network, 60.21851, 24.86649)).toEqual({ row: 0, col: 0 });
  });

  it('returns fractional positions and cell centres that round-trip', () => {
    expect(project(centre, 24.8705, 60.2165)).toEqual([0.5, 0.5]);
    const { lat, lon } = cellCenter(centre, 30, 70);
    expect(toCell(centre, lat, lon)).toEqual({ row: 30, col: 70 });
  });

  it('starts narrow screens on the compact view', () => {
    expect(defaultPreset(375)).toBe('mobile');
    expect(defaultPreset(1100)).toBe('centre');
  });
});
