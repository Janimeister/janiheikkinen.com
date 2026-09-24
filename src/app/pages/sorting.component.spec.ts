import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SortingPageComponent } from './sorting.component';

describe('Sorting playback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [SortingPageComponent],
      providers: [provideRouter([])],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('pauses, steps, resets and completes both algorithms on the same input', () => {
    const page = TestBed.createComponent(SortingPageComponent).componentInstance;
    page.changeSize(5);
    const input = [...page.values()];
    for (const algorithm of page.algorithms) {
      page.selectAlgorithm(algorithm.id);
      expect(page.values()).toEqual(input);
      page.toggle();
      vi.advanceTimersByTime(80);
      page.toggle();
      const comparisons = page.comparisons();
      vi.advanceTimersByTime(5000);
      expect(page.comparisons()).toBe(comparisons);
      page.reset();
      expect(page.values()).toEqual(input);
      page.step();
      expect(page.status()).toBe('paused');
      expect(page.comparisons()).toBe(1);
      page.toggle();
      vi.runAllTimers();
      expect(page.status()).toBe('done');
      expect(page.values()).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it('clamps sizes and cancels pending work on changes and destruction', () => {
    const fixture = TestBed.createComponent(SortingPageComponent);
    const page = fixture.componentInstance;
    page.changeSize(1000);
    expect(page.values()).toHaveLength(80);
    page.changeSize(-1);
    expect(page.values()).toHaveLength(5);
    page.toggle();
    page.changeSpeed(100);
    vi.advanceTimersByTime(10);
    expect(page.comparisons()).toBe(1);
    page.selectAlgorithm('merge');
    const before = page.comparisons();
    vi.advanceTimersByTime(5000);
    expect(page.comparisons()).toBe(before);
    page.toggle();
    page.shuffle();
    vi.advanceTimersByTime(5000);
    expect(page.comparisons()).toBe(0);
    page.toggle();
    fixture.destroy();
    vi.advanceTimersByTime(5000);
    expect(page.comparisons()).toBe(0);
  });
});
