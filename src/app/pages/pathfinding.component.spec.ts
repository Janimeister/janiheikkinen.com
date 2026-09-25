import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PathfindingPageComponent } from './pathfinding.component';

describe('Pathfinding grid and playback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [PathfindingPageComponent],
      providers: [provideRouter([])],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('edits terrain and endpoints, clears the grid, and creates a reusable example layout', () => {
    const page = TestBed.createComponent(PathfindingPageComponent).componentInstance;
    expect(page.cells()).toHaveLength(120);
    page.setTool('high');
    page.editCell(30);
    expect(page.terrain()[30]).toBe('high');
    page.setTool('wall');
    page.editCell(31);
    expect(page.terrain()[31]).toBe('wall');
    page.setTool('start');
    page.editCell(25);
    expect(page.start()).toBe(25);
    page.clearGrid();
    expect(page.terrain().every((terrain) => terrain === 'normal')).toBe(true);
    expect(page.start()).toBe(25);
    page.generateLayout();
    expect(page.terrain()[5 * page.columns]).toBe('wall');
    expect(page.terrain()[5 * page.columns + 8]).toBe('normal');
    expect(page.terrain()[6 * page.columns + 3]).toBe('high');
  });

  it('finds a path, records statistics, and resets a run without clearing the grid', () => {
    const page = TestBed.createComponent(PathfindingPageComponent).componentInstance;
    page.editTool.set('high');
    page.editCell(90);
    const terrainBeforeRun = [...page.terrain()];
    page.selectAlgorithm('dijkstra');
    page.changeSpeed(100);
    page.toggle();
    vi.runAllTimers();
    expect(page.status()).toBe('done');
    expect(page.result()?.found).toBe(true);
    expect(page.result()?.cost).toBeGreaterThan(0);
    expect(page.nodesVisited()).toBeGreaterThan(0);
    expect(page.path().has(page.start())).toBe(true);
    expect(page.path().has(page.destination())).toBe(true);
    page.resetRun();
    expect(page.terrain()).toEqual(terrainBeforeRun);
    expect(page.path().size).toBe(0);
    expect(page.nodesVisited()).toBe(0);
    expect(page.status()).toBe('ready');
  });

  it('cancels playback when the selected algorithm changes mid-run', () => {
    const page = TestBed.createComponent(PathfindingPageComponent).componentInstance;
    page.changeSpeed(100);
    page.toggle();
    vi.advanceTimersByTime(30);
    expect(page.nodesVisited()).toBeGreaterThan(0);
    page.selectAlgorithm('astar');
    vi.advanceTimersByTime(1000);
    expect(page.nodesVisited()).toBe(0);
    expect(page.status()).toBe('ready');
  });

  it('moves keyboard focus between grid cells and permits equal endpoints', () => {
    const fixture = TestBed.createComponent(PathfindingPageComponent);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
    const startCell = fixture.nativeElement.querySelector('[data-cell="13"]') as HTMLButtonElement;
    startCell.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(page.focusedCell()).toBe(14);
    page.setTool('destination');
    page.editCell(page.start());
    expect(page.destination()).toBe(page.start());
  });
  it('keeps relocated endpoints open when reloading the example layout', () => {
    const page = TestBed.createComponent(PathfindingPageComponent).componentInstance;
    page.setTool('start');
    page.editCell(60);
    page.setTool('destination');
    page.editCell(61);
    page.generateLayout();
    expect(page.terrain()[60]).toBe('normal');
    expect(page.terrain()[61]).toBe('normal');
    page.selectAlgorithm('dijkstra');
    page.changeSpeed(100);
    page.toggle();
    vi.runAllTimers();
    expect(page.result()).toMatchObject({ found: true, path: [60, 61], cost: 1 });
  });

  it('can remove a blocking wall and rerun without stale results', () => {
    const page = TestBed.createComponent(PathfindingPageComponent).componentInstance;
    page.clearGrid();
    page.setTool('wall');
    for (const index of [1, 12, 14, 25]) page.editCell(index);
    page.changeSpeed(100);
    page.toggle();
    vi.runAllTimers();
    expect(page.result()?.found).toBe(false);
    page.editCell(14);
    expect(page.result()).toBeNull();
    page.toggle();
    vi.runAllTimers();
    expect(page.result()?.found).toBe(true);
    expect(page.current()).toBeNull();
  });

  it('pauses and resets without losing terrain, and destroys every timer', () => {
    const fixture = TestBed.createComponent(PathfindingPageComponent);
    const page = fixture.componentInstance;
    const terrain = page.terrain();
    page.toggle();
    vi.advanceTimersByTime(120);
    page.toggle();
    const visited = page.nodesVisited();
    vi.advanceTimersByTime(1000);
    expect(page.nodesVisited()).toBe(visited);
    expect(vi.getTimerCount()).toBe(0);
    page.toggle();
    page.resetRun();
    expect(page.terrain()).toEqual(terrain);
    expect(vi.getTimerCount()).toBe(0);
    page.toggle();
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
