import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VisualizationPlayback } from './playback-controller';

describe('VisualizationPlayback lifecycle', () => {
  let player: VisualizationPlayback<number, string>;
  let events: number[];
  let completed = vi.fn<(result: string) => void>();
  let released = vi.fn<() => void>();

  beforeEach(() => {
    vi.useFakeTimers();
    player = new VisualizationPlayback<number, string>();
    events = [];
    completed = vi.fn();
    released = vi.fn();
    player.configure(
      function* () {
        try {
          yield 1;
          yield 2;
          return 'finished';
        } finally {
          released();
        }
      },
      (event) => events.push(event),
      completed,
    );
  });

  afterEach(() => {
    player.destroy();
    vi.useRealTimers();
  });

  it('runs at the selected speed and reports completion exactly once', () => {
    player.setSpeed(10);
    player.startOrPause();
    vi.advanceTimersByTime(99);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(events).toEqual([1]);
    player.setSpeed(100);
    vi.advanceTimersByTime(20);
    expect(events).toEqual([1, 2]);
    expect(completed).toHaveBeenCalledExactlyOnceWith('finished');
    expect(released).toHaveBeenCalledOnce();
    expect(player.elapsedMs()).toBeCloseTo(120);
    expect(player.status()).toBe('done');
    player.startOrPause();
    player.step();
    expect(vi.getTimerCount()).toBe(0);
    expect(completed).toHaveBeenCalledOnce();
  });

  it('excludes pauses and manual steps from elapsed time', () => {
    player.startOrPause();
    vi.advanceTimersByTime(20);
    player.startOrPause();
    const pausedAt = player.elapsedMs();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    player.step();
    expect(events).toEqual([1]);
    expect(player.elapsedMs()).toBe(pausedAt);
    player.startOrPause();
    vi.runAllTimers();
    expect(player.elapsedMs()).toBeCloseTo(pausedAt + 80);
  });

  it.each(['reset', 'destroy', 'configure'] as const)(
    '%s cancels all work and closes the active generator',
    (action) => {
      player.startOrPause();
      vi.advanceTimersByTime(40);
      expect(events).toEqual([1]);
      if (action === 'configure') {
        player.configure(
          function* () {
            yield 9;
            return 'new';
          },
          (event) => events.push(event),
        );
      } else {
        player[action]();
      }
      expect(released).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(5000);
      expect(events).toEqual([1]);
      expect(completed).not.toHaveBeenCalled();
      if (action === 'reset') {
        expect(player.elapsedMs()).toBe(0);
        player.step();
        expect(events).toEqual([1, 1]);
      }
      if (action === 'destroy') {
        player.setSpeed(50);
        player.startOrPause();
        player.step();
        expect(vi.getTimerCount()).toBe(0);
      }
    },
  );

  it('clamps invalid speeds without accumulating timers', () => {
    player.setSpeed(-10);
    expect(player.speed()).toBe(1);
    player.setSpeed(1000);
    expect(player.speed()).toBe(100);
    player.setSpeed(Number.NaN);
    expect(player.speed()).toBe(100);
    player.startOrPause();
    for (let speed = 1; speed <= 100; speed++) player.setSpeed(speed);
    expect(vi.getTimerCount()).toBe(2);
  });
});
