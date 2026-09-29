import { describe, expect, it } from 'vitest';
import { blankCells, type Cell, toText } from './ascii-raster';
import { createGrid, type Grid } from './grid';
import type { TramState } from './hfp';
import { renderTramOverlay, snapToTrack } from './tram-overlay';

/** A 10 × 5 grid near 0° N 0° E, so cell (row, col) spans lon col/1000… and lat (5 - row)/1000… */
const tiny: Grid = createGrid({
  id: 'centre',
  south: 0,
  west: 0,
  north: 0.005,
  east: 0.01,
  cell: 0.001,
});

let nextTst = 0;
function tram(row: number, col: number, overrides: Partial<TramState> = {}): TramState {
  return {
    key: `40/${row}${col}`,
    desi: '4',
    routeId: '1004',
    direction: '1',
    headsign: 'Munkkiniemi',
    nextStop: null,
    lat: (5 - row - 0.5) / 1000,
    lon: (col + 0.5) / 1000,
    heading: null,
    speed: null,
    delay: null,
    doorsOpen: false,
    stop: null,
    tst: nextTst++,
    receivedAt: 0,
    depotRun: false,
    ...overrides,
  };
}

/** Base cells with a track of `cls` along one row. */
function trackRow(row: number, cls: string): Cell[][] {
  const cells = blankCells(tiny);
  for (let col = 0; col < tiny.cols; col++) cells[row][col] = { ch: '-', cls };
  return cells;
}

describe('Tram overlay', () => {
  it('writes each tram as its line number, coloured by line', () => {
    const base = trackRow(2, 'line-shared');
    const overlay = renderTramOverlay(tiny, base, [
      tram(2, 1),
      tram(2, 6, { key: 'b', desi: '10' }),
    ]);
    expect(toText(overlay.cells).split('\n')[2]).toBe(' 4    10  ');
    expect(overlay.cells[2][1].cls).toBe('tram line-4');
    expect(overlay.cells[2][6].cls).toBe('tram line-10');
    expect(overlay.count).toBe(2);
  });

  it('dims depot runs by default and whatever the caller calls dim', () => {
    const base = trackRow(2, 'line-shared');
    const overlay = renderTramOverlay(
      tiny,
      base,
      [tram(2, 0, { key: 'a', desi: '1H', depotRun: true }), tram(2, 5, { key: 'b' })],
      { isDim: (t) => t.depotRun || t.key === 'b' },
    );
    expect(overlay.cells[2][0]).toEqual({ ch: '1', cls: 'tram tram-dim' });
    expect(overlay.cells[2][5]).toEqual({ ch: '4', cls: 'tram tram-dim' });
  });

  it('merges trams whose labels overlap into one cluster', () => {
    const base = trackRow(2, 'line-shared');
    const trams = [
      tram(2, 3, { key: 'a', desi: '10' }),
      tram(2, 4, { key: 'b', desi: '7' }),
      tram(2, 3, { key: 'c', desi: '3' }),
    ];
    const overlay = renderTramOverlay(tiny, base, trams);
    expect(toText(overlay.cells).split('\n')[2]).toBe('   *      ');
    expect(overlay.markers).toEqual([
      { row: 2, col: 3, text: '*', cls: 'tram tram-cluster', keys: ['a', 'b', 'c'] },
    ]);
    expect(overlay.count).toBe(3);
  });

  it('merges labels that would touch, so neighbours never read as another line', () => {
    const base = trackRow(2, 'line-shared');
    const overlay = renderTramOverlay(tiny, base, [
      tram(2, 2, { key: 'a', desi: '1' }),
      tram(2, 3, { key: 'b', desi: '7' }),
      tram(2, 6, { key: 'c', desi: '9' }),
    ]);
    expect(toText(overlay.cells).split('\n')[2]).toBe('  *   9   ');
    expect(overlay.markers.map((m) => m.keys)).toEqual([['a', 'b'], ['c']]);
  });

  it('draws older fixes first', () => {
    const base = trackRow(2, 'line-shared');
    const overlay = renderTramOverlay(tiny, base, [
      tram(2, 2, { key: 'new', tst: 20 }),
      tram(2, 2, { key: 'old', tst: 10 }),
    ]);
    expect(overlay.markers[0].keys).toEqual(['old', 'new']);
  });

  it('keeps labels inside the grid and skips trams outside it', () => {
    const base = trackRow(4, 'line-shared');
    const overlay = renderTramOverlay(tiny, base, [
      tram(4, 9, { desi: '10' }),
      tram(0, 0, { key: 'far', lat: 1, lon: 1 }),
    ]);
    expect(toText(overlay.cells).split('\n')[4]).toBe('        10');
    expect(overlay.count).toBe(1);
  });

  it('draws where the caller says, e.g. interpolated', () => {
    const base = trackRow(2, 'line-shared');
    const overlay = renderTramOverlay(tiny, base, [tram(2, 1)], {
      position: (t) => ({ lat: t.lat, lon: t.lon + 0.005 }),
    });
    expect(toText(overlay.cells).split('\n')[2]).toBe('      4   ');
  });

  it('draws trails behind trams, on the track, under every label', () => {
    const base = trackRow(2, 'line-4');
    const at = (row: number, col: number) => ({
      lat: (5 - row - 0.5) / 1000,
      lon: (col + 0.5) / 1000,
    });
    const trams = [
      // Came from the left along the track; one fix was a row off, and snaps back onto it.
      tram(2, 5, { key: 'a', trail: [at(2, 1), at(1, 2), at(2, 3)] }),
      tram(2, 8, { key: 'b', desi: '7', trail: [at(2, 5)] }),
    ];
    const overlay = renderTramOverlay(tiny, base, trams, { trails: true });
    expect(toText(overlay.cells).split('\n')[2]).toBe(' ....4..7 ');
    expect(overlay.cells[2][1]).toEqual({ ch: '.', cls: 'trail line-4' });
    expect(overlay.cells[2][6]).toEqual({ ch: '.', cls: 'trail line-7' });
    expect(toText(overlay.cells).split('\n')[1].trim()).toBe('');

    // Off by default, and never for dimmed trams.
    expect(toText(renderTramOverlay(tiny, base, trams).cells).split('\n')[2]).toBe('     4  7 ');
    const dimmed = renderTramOverlay(tiny, base, trams, {
      trails: true,
      isDim: (t) => t.key === 'a',
    });
    expect(toText(dimmed.cells).split('\n')[2]).toBe('     4..7 ');
  });

  it('leaves gaps in a trail where the tram jumped', () => {
    const base = trackRow(2, 'line-4');
    const overlay = renderTramOverlay(
      tiny,
      base,
      [tram(2, 9, { trail: [{ lat: 0.0025, lon: 0.0005 }] })],
      { trails: true },
    );
    expect(toText(overlay.cells).split('\n')[2]).toBe('         4');
  });

  it('snaps a tram next to its track onto it, preferring its own line', () => {
    const base = blankCells(tiny);
    base[1][3] = { ch: '-', cls: 'line-shared' };
    base[3][3] = { ch: '-', cls: 'line-4' };
    expect(snapToTrack(base, 2, 3, '4')).toEqual({ row: 3, col: 3 });
    expect(snapToTrack(base, 2, 3, '4H')).toEqual({ row: 3, col: 3 });
    expect(snapToTrack(base, 2, 3, '7')).toEqual({ row: 1, col: 3 });
    expect(snapToTrack(base, 3, 3, '7')).toEqual({ row: 3, col: 3 });
    expect(snapToTrack(base, 0, 9, '4')).toEqual({ row: 0, col: 9 });
  });
});
