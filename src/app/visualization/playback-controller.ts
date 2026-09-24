import { signal } from '@angular/core';

export type PlaybackStatus = 'ready' | 'running' | 'paused' | 'done';

type EventSequence<Event, Result> = Generator<Event, Result, unknown>;

/** Shared event player for algorithm visualizations. Algorithms only produce events; pages render them. */
export class VisualizationPlayback<Event, Result = void> {
  readonly status = signal<PlaybackStatus>('ready');
  readonly speed = signal(25);
  readonly elapsedMs = signal(0);

  private factory?: () => EventSequence<Event, Result>;
  private applyEvent?: (event: Event) => void;
  private onComplete?: (result: Result) => void;
  private sequence?: EventSequence<Event, Result>;
  private elapsedBeforeRun = 0;
  private runStartedAt?: number;
  private clock?: ReturnType<typeof setInterval>;
  private timer?: ReturnType<typeof setTimeout>;

  configure(
    factory: () => EventSequence<Event, Result>,
    applyEvent: (event: Event) => void,
    onComplete?: (result: Result) => void,
  ): void {
    this.cancelPendingWork();
    this.factory = factory;
    this.applyEvent = applyEvent;
    this.onComplete = onComplete;
    this.reset();
  }

  setSpeed(value: number): void {
    if (!Number.isFinite(value)) return;
    this.speed.set(Math.max(1, Math.min(100, Math.round(value))));
    if (this.status() === 'running') {
      this.cancelTimer();
      this.schedule();
    }
  }

  startOrPause(): void {
    if (this.status() === 'done') return;
    if (this.status() === 'running') {
      this.cancelTimer();
      this.stopClock();
      this.status.set('paused');
      return;
    }
    this.status.set('running');
    this.startClock();
    this.schedule();
  }

  step(): void {
    if (this.status() === 'running' || this.status() === 'done') return;
    this.status.set('paused');
    this.advance();
  }

  reset(): void {
    this.cancelTimer();
    this.stopClock();
    this.elapsedBeforeRun = 0;
    this.elapsedMs.set(0);
    this.sequence = undefined;
    this.status.set('ready');
  }

  destroy(): void {
    this.cancelPendingWork();
    this.sequence = undefined;
    this.factory = undefined;
    this.applyEvent = undefined;
    this.onComplete = undefined;
  }

  private advance(): void {
    if (!this.factory || !this.applyEvent) return;
    this.sequence ??= this.factory();
    const next = this.sequence.next();
    if (next.done) {
      this.onComplete?.(next.value);
      this.stopClock();
      this.status.set('done');
      return;
    }
    this.applyEvent(next.value);
  }

  private schedule(): void {
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.advance();
      if (this.status() === 'running') this.schedule();
    }, 1000 / this.speed());
  }

  private startClock(): void {
    this.runStartedAt = performance.now();
    this.clock = setInterval(() => this.updateClock(), 50);
  }

  private updateClock(): void {
    if (this.runStartedAt !== undefined) {
      this.elapsedMs.set(this.elapsedBeforeRun + performance.now() - this.runStartedAt);
    }
  }

  private stopClock(): void {
    this.updateClock();
    this.elapsedBeforeRun = this.elapsedMs();
    this.runStartedAt = undefined;
    clearInterval(this.clock);
    this.clock = undefined;
  }

  private cancelTimer(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private cancelPendingWork(): void {
    this.cancelTimer();
    clearInterval(this.clock);
    this.clock = undefined;
    this.runStartedAt = undefined;
  }
}
