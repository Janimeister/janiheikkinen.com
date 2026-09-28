import { describe, expect, it } from 'vitest';
import {
  ASCII_GLYPHS,
  blankCells,
  fillPolygon,
  lineClass,
  placeLabels,
  renderBaseMap,
  toRuns,
  toText,
  traceLine,
  trackDirection,
  UNICODE_GLYPHS,
} from './ascii-raster';
import { createGrid, type Grid } from './grid';
import type { LonLat, Polygon, TramMapData } from './tram-map.model';

/** A 10 × 5 grid near 0° N 0° E, so cell (row, col) spans lon col/1000… and lat (5 - row)/1000… */
const tiny: Grid = createGrid({
  id: 'centre',
  south: 0,
  west: 0,
  north: 0.005,
  east: 0.01,
  cell: 0.001,
});

/** The centre of cell (row, col) on the tiny grid as `[lon, lat]`. */
const at = (row: number, col: number): LonLat => [(col + 0.5) / 1000, (5 - row - 0.5) / 1000];

const rect = (west: number, south: number, east: number, north: number) =>
  [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
  ] as const satisfies readonly LonLat[];

function mapData(overrides: Partial<TramMapData> = {}): TramMapData {
  return {
    bbox: { south: 0, west: 0, north: 0.005, east: 0.01 },
    generatedAt: '2026-09-28T00:00:00Z',
    gtfsVersion: 'test',
    sources: { gtfs: 'test', land: 'overpass' },
    lines: [],
    stops: [],
    water: [],
    parks: [],
    labels: [],
    ...overrides,
  };
}

function filled(polygon: Polygon): string {
  const cells = blankCells(tiny);
  fillPolygon(tiny, polygon, (row, col) => (cells[row][col] = { ch: '#', cls: '' }));
  return toText(cells);
}

describe('fillPolygon', () => {
  it('fills the cells whose centres are inside', () => {
    expect(filled([rect(0.002, 0.001, 0.005, 0.003)])).toBe(
      ['          ', '          ', '  ###     ', '  ###     ', '          '].join('\n'),
    );
  });

  it('treats inner rings as holes (even–odd)', () => {
    expect(filled([rect(0, 0, 0.005, 0.005), rect(0.001, 0.001, 0.004, 0.004)])).toBe(
      ['#####     ', '#   #     ', '#   #     ', '#   #     ', '#####     '].join('\n'),
    );
  });

  it('clips polygons that reach outside the grid and skips slivers between centres', () => {
    expect(filled([rect(-1, -1, 1, 0.0012)])).toBe(
      ['          ', '          ', '          ', '          ', '##########'].join('\n'),
    );
    expect(filled([rect(0.0001, 0.0001, 0.0004, 0.0049)])).toBe(toText(blankCells(tiny)));
  });
});

describe('trackDirection', () => {
  it.each([
    [1, 0, 'h'],
    [-5, 1, 'h'],
    [0, 1, 'v'],
    [1, 2, 'v'],
    [1, -1, 'up'],
    [-2, 1, 'up'],
    [1, 1, 'down'],
    [-2, -1, 'down'],
  ] as const)('dx %i, dy %i → %s', (dx, dy, expected) => {
    expect(trackDirection(dx, dy)).toBe(expected);
  });
});

describe('traceLine', () => {
  it('visits every cell between the endpoints once per segment', () => {
    const visited: string[] = [];
    traceLine(tiny, [at(2, 1), at(2, 4), at(4, 4)], (row, col, dir) =>
      visited.push(`${row},${col},${dir}`),
    );
    expect(visited).toEqual(['2,1,h', '2,2,h', '2,3,h', '2,4,h', '2,4,v', '3,4,v', '4,4,v']);
  });

  it('draws diagonals as a connected staircase and ignores cells off the grid', () => {
    const visited: [number, number][] = [];
    traceLine(tiny, [at(-2, -2), at(4, 4)], (row, col) => visited.push([row, col]));
    expect(visited).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
  });
});

describe('placeLabels', () => {
  it('places upper-case labels on free cells, moving them if needed, and skips the rest', () => {
    const cells = blankCells(tiny);
    cells[2][4] = { ch: '-', cls: 'line-4' };
    const placed = placeLabels(
      cells,
      [
        { name: 'Töölö', lat: at(2, 5)[1], lon: at(2, 5)[0], rank: 2 },
        { name: 'Eira', lat: at(0, 5)[1], lon: at(0, 5)[0], rank: 1 },
        { name: 'Kallio', lat: at(1, 5)[1], lon: at(1, 5)[0], rank: 2 },
        { name: 'Punavuori', lat: at(4, 5)[1], lon: at(4, 5)[0], rank: 2 },
      ],
      tiny,
      (cell) => cell.cls === '',
    );
    // Punavuori plus its gaps is wider than the grid.
    expect(placed).toEqual(['Eira', 'Töölö', 'Kallio']);
    expect(toText(cells).split('\n')).toEqual([
      '    EIRA  ',
      '   TÖÖLÖ  ',
      '    -     ',
      '   KALLIO ',
      '          ',
    ]);
  });
});

describe('renderBaseMap', () => {
  it('layers parks under water, then tracks, stops and labels', () => {
    const data = mapData({
      parks: [[rect(0, 0, 0.01, 0.002)]],
      water: [[rect(0, 0, 0.003, 0.005)]],
      lines: [{ desi: '4', color: '#00985f', shapes: [[at(3, 0), at(3, 9)]] }],
      stops: [{ id: '1', name: 'Stop', lat: at(3, 6)[1], lon: at(3, 6)[0] }],
      labels: [{ name: 'Park', lat: at(4, 6)[1], lon: at(4, 6)[0], rank: 1 }],
    });
    const map = renderBaseMap(data, tiny);
    expect(toText(map.cells)).toBe(
      ['~~~       ', '~~~       ', '~~~       ', '------o---', '~~~,,PARK,'].join('\n'),
    );
    expect(map.cells[3][0].cls).toBe('line-4');
    expect(map.cells[3][6].cls).toBe('stop');
    expect(map.cells[4][1].cls).toBe('sea');
    expect(map).toMatchObject({ lines: ['4'], stopCount: 1, labels: ['Park'] });
  });

  it('marks crossings and shared track, and lists only lines that reach the grid', () => {
    const data = mapData({
      lines: [
        { desi: '1', color: '#00985f', shapes: [[at(2, 0), at(2, 9)]] },
        { desi: '2', color: '#00985f', shapes: [[at(0, 5), at(4, 5)]] },
        { desi: '3', color: '#00985f', shapes: [[at(2, 7), at(2, 9)]] },
        {
          desi: '13',
          color: '#00985f',
          shapes: [
            [
              [1, 1],
              [1.1, 1.1],
            ],
          ],
        },
      ],
    });
    const map = renderBaseMap(data, tiny);
    expect(toText(map.cells).split('\n')[2]).toBe('-----+----');
    expect(map.cells[2][5].cls).toBe('line-shared');
    expect(map.cells[2][8].cls).toBe('line-shared');
    expect(map.cells[2][2].cls).toBe('line-1');
    expect(map.cells[0][5]).toEqual({ ch: '|', cls: 'line-2' });
    expect(map.lines).toEqual(['1', '2', '3']);
  });

  it('draws alternating sea rows and box drawing with the Unicode glyphs', () => {
    const data = mapData({
      water: [[rect(0, 0, 0.01, 0.002)]],
      lines: [{ desi: '4', color: '#00985f', shapes: [[at(0, 0), at(0, 9)]] }],
    });
    const rows = toText(renderBaseMap(data, tiny, UNICODE_GLYPHS).cells).split('\n');
    expect(rows[0]).toBe('─'.repeat(10));
    expect(rows[3]).toBe('≈'.repeat(10));
    expect(rows[4]).toBe('~'.repeat(10));
    expect(ASCII_GLYPHS.sea).toEqual(['~', '~']);
  });
});

describe('helpers', () => {
  it('turns line designations into class names', () => {
    expect(['4', '10', 'H', '1H'].map(lineClass)).toEqual([
      'line-4',
      'line-10',
      'line-h',
      'line-1h',
    ]);
  });

  it('merges neighbouring cells with the same class into runs', () => {
    expect(
      toRuns([
        [
          { ch: '~', cls: 'sea' },
          { ch: '~', cls: 'sea' },
          { ch: ' ', cls: '' },
          { ch: '-', cls: 'line-4' },
        ],
      ]),
    ).toEqual([
      [
        { text: '~~', cls: 'sea' },
        { text: ' ', cls: '' },
        { text: '-', cls: 'line-4' },
      ],
    ]);
  });
});
