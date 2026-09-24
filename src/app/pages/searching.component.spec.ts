import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchingPageComponent } from './searching.component';

describe('Searching playback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [SearchingPageComponent],
      providers: [provideRouter([])],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('finds the first value with Binary Search and reports comparison statistics', () => {
    const page = TestBed.createComponent(SearchingPageComponent).componentInstance;
    page.changeSize(5);
    page.selectAlgorithm('binary');
    page.setTarget(page.values()[0]);
    page.changeSpeed(100);
    page.toggle();
    vi.runAllTimers();
    expect(page.status()).toBe('done');
    expect(page.result()).toEqual({ found: true, index: 0 });
    expect(page.comparisons()).toBeLessThan(5);
    expect(page.checked().size).toBe(page.comparisons());
  });

  it('handles a missing target and resets counts when target or size changes', () => {
    const page = TestBed.createComponent(SearchingPageComponent).componentInstance;
    page.changeSize(5);
    page.selectAlgorithm('linear');
    page.chooseMissingTarget();
    page.changeSpeed(100);
    page.toggle();
    vi.runAllTimers();
    expect(page.result()).toEqual({ found: false, index: null });
    expect(page.comparisons()).toBe(5);
    expect(page.checked().size).toBe(5);
    page.setTarget(page.values()[0]);
    expect(page.status()).toBe('ready');
    expect(page.comparisons()).toBe(0);
    page.changeSize(1000);
    expect(page.values()).toHaveLength(80);
  });

  it('cancels pending events when the algorithm changes during playback', () => {
    const page = TestBed.createComponent(SearchingPageComponent).componentInstance;
    page.changeSize(5);
    page.changeSpeed(100);
    page.toggle();
    vi.advanceTimersByTime(10);
    expect(page.comparisons()).toBe(1);
    page.selectAlgorithm('binary');
    vi.advanceTimersByTime(1000);
    expect(page.comparisons()).toBe(0);
    expect(page.status()).toBe('ready');
  });

  it('pauses and resumes the shared timer, and clears elapsed work on reset', () => {
    const page = TestBed.createComponent(SearchingPageComponent).componentInstance;
    page.changeSize(5);
    page.changeSpeed(1);
    page.toggle();
    vi.advanceTimersByTime(400);
    page.toggle();
    const pausedAt = page.elapsedMs();
    vi.advanceTimersByTime(2000);
    expect(page.elapsedMs()).toBe(pausedAt);
    expect(page.comparisons()).toBe(0);
    page.changeSpeed(100);
    page.toggle();
    vi.advanceTimersByTime(10);
    expect(page.comparisons()).toBe(1);
    page.reset();
    expect(page.elapsedMs()).toBe(0);
    expect(page.comparisons()).toBe(0);
  });
});
