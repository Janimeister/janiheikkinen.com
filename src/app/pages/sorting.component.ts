import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { LanguageService } from '../i18n/language.service';
import { SORTING_ALGORITHMS, SortStep } from '../sorting/sorting-algorithms';

@Component({
  selector: 'app-sorting-page',
  imports: [RouterLink, GlowCardComponent, DecimalPipe],
  template: `
    <section class="relative max-w-6xl mx-auto px-6 md:px-12 pt-28 pb-16">
      <a routerLink="/" class="text-accent-light font-bold">← {{ i18n.t('common.backToHome') }}</a>
      <header class="my-8 animate-fade-slide-up">
        <h1 class="text-3xl md:text-5xl mb-4">
          <span class="marker marker-sky">{{ i18n.t('sorting.title') }}</span>
        </h1>
        <p class="text-text-secondary max-w-2xl">{{ i18n.t('sorting.subtitle') }}</p>
      </header>
      <app-glow-card>
        <div class="grid gap-6 md:grid-cols-3">
          <div>
            <label for="algorithm">{{ i18n.t('sorting.algorithm') }}</label>
            <select
              #algorithmControl
              id="algorithm"
              [value]="algorithm().id"
              (change)="selectAlgorithm(algorithmControl.value)"
            >
              @for (item of algorithms; track item.id) {
                <option [value]="item.id">{{ i18n.t(item.nameKey) }}</option>
              }
            </select>
          </div>
          <div>
            <label for="size">{{ i18n.t('sorting.size') }}: {{ size() }}</label>
            <input
              #sizeControl
              id="size"
              type="range"
              min="5"
              [max]="maxSize"
              step="1"
              [value]="size()"
              aria-describedby="size-help"
              (input)="changeSize(+sizeControl.value)"
            />
            <p id="size-help" class="text-sm text-text-secondary">
              {{ i18n.t('sorting.sizeHelp') }}
            </p>
          </div>
          <div>
            <label for="speed">{{ i18n.t('sorting.speed') }}: {{ speed() }}</label>
            <input
              #speedControl
              id="speed"
              type="range"
              min="1"
              max="100"
              step="1"
              [value]="speed()"
              aria-describedby="speed-help"
              (input)="changeSpeed(+speedControl.value)"
            />
            <p id="speed-help" class="text-sm text-text-secondary">
              {{ i18n.t('sorting.speedHelp') }}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-3 mt-6">
          <button class="bg-pop-lime" (click)="toggle()" [disabled]="status() === 'done'">
            {{
              i18n.t(
                status() === 'running'
                  ? 'sorting.pause'
                  : status() === 'paused'
                    ? 'sorting.resume'
                    : 'sorting.start'
              )
            }}
          </button>
          <button (click)="step()" [disabled]="status() === 'running' || status() === 'done'">
            {{ i18n.t('sorting.step') }}
          </button>
          <button (click)="reset()">{{ i18n.t('sorting.reset') }}</button>
          <button class="bg-pop-yellow" (click)="shuffle()">{{ i18n.t('sorting.shuffle') }}</button>
        </div>
        <p class="mt-4 text-sm text-text-secondary">{{ i18n.t('sorting.controlsHelp') }}</p>
      </app-glow-card>
      <div class="mt-8 brutal-border brutal-shadow bg-bg-card p-4 md:p-6">
        <div class="flex flex-wrap justify-between gap-3 mb-4 font-mono text-sm">
          <p role="status">{{ i18n.t(statusKey()) }}</p>
          <p>
            {{ i18n.t('sorting.comparisons') }}: {{ comparisons() }} ·
            {{ i18n.t('sorting.writes') }}: {{ writes() }}
          </p>
        </div>
        <p
          class="font-mono font-bold mb-2"
          role="timer"
          aria-live="off"
          [attr.aria-label]="i18n.t('sorting.elapsed')"
          data-testid="elapsed-time"
        >
          {{ i18n.t('sorting.elapsed') }}: {{ elapsedMs() / 1000 | number: '1.2-2' }} s
        </p>
        <p class="text-sm text-text-secondary mb-4">{{ i18n.t('sorting.elapsedHelp') }}</p>
        <div class="bars" role="img" [attr.aria-label]="i18n.t('sorting.chart', { count: size() })">
          @for (value of values(); track $index) {
            <div
              class="bar"
              [class.active]="active().includes($index)"
              [class.complete]="status() === 'done'"
              [style.height.%]="(value / size()) * 100"
              [attr.data-value]="value"
              [attr.title]="value"
            >
              @if (size() <= 20) {
                <span>{{ value }}</span>
              }
            </div>
          }
        </div>
        <p class="text-sm mt-4">{{ i18n.t('sorting.legend') }}</p>
        <details class="mt-3 text-sm">
          <summary class="cursor-pointer font-bold">{{ i18n.t('sorting.values') }}</summary>
          <p class="font-mono mt-2 break-words">{{ values().join(', ') }}</p>
        </details>
      </div>
      <div class="mt-8">
        <app-glow-card>
          <h2 class="text-xl mb-3">{{ i18n.t(algorithm().nameKey) }}</h2>
          <p>{{ i18n.t(algorithm().descriptionKey) }}</p>
          <p class="font-mono text-sm mt-4">
            {{ i18n.t('sorting.space') }}:
            {{ algorithm().space }}
          </p>
          <p class="text-sm text-text-secondary mt-2">{{ i18n.t('sorting.spaceHelp') }}</p>
          <div class="overflow-x-auto mt-6">
            <table class="w-full text-left text-sm" data-testid="complexity-table">
              <caption class="text-left font-bold text-lg mb-3">
                {{
                  i18n.t('sorting.complexity')
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ i18n.t('sorting.algorithm') }}</th>
                  <th scope="col">{{ i18n.t('sorting.best') }}</th>
                  <th scope="col">{{ i18n.t('sorting.average') }}</th>
                  <th scope="col">{{ i18n.t('sorting.worst') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of algorithms; track item.id) {
                  <tr>
                    <th scope="row">{{ i18n.t(item.nameKey) }}</th>
                    <td>{{ item.time.best }}</td>
                    <td>{{ item.time.average }}</td>
                    <td>{{ item.time.worst }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="text-sm text-text-secondary mt-3">{{ i18n.t('sorting.complexityHelp') }}</p>
        </app-glow-card>
      </div>
    </section>
  `,
  styles: `
    th,
    td {
      padding: 0.5rem;
      border-bottom: 2px solid var(--color-ink);
    }
    td {
      font-family: var(--font-mono);
      white-space: nowrap;
    }
    label {
      display: block;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    select {
      width: 100%;
      background: var(--color-bg-card);
      border: 2px solid var(--color-ink);
      padding: 0.6rem;
    }
    input {
      width: 100%;
      min-height: 44px;
      accent-color: var(--color-ink);
    }
    button {
      border: 2px solid var(--color-ink);
      box-shadow: var(--shadow-brutal-sm);
      padding: 0.6rem 1rem;
      font-weight: 700;
      min-height: 44px;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .bars {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: clamp(220px, 40vw, 360px);
      border-bottom: 2px solid var(--color-ink);
    }
    .bar {
      flex: 1 1 0;
      min-width: 0;
      background: var(--color-pop-sky);
      border: 2px solid var(--color-ink);
      position: relative;
    }
    .bar.active {
      background: var(--color-pop-pink);
      border-top: 6px solid var(--color-ink);
    }
    .bar.complete {
      background: var(--color-pop-lime);
    }
    .bar span {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      font: 700 0.7rem var(--font-mono);
    }
    @media (max-width: 480px) {
      .bar {
        border-left: 0;
        border-right: 0;
      }
      .bar span {
        display: none;
      }
      .bars {
        gap: 1px;
      }
    }
  `,
})
export class SortingPageComponent implements OnDestroy {
  readonly i18n = inject(LanguageService);
  readonly algorithms = SORTING_ALGORITHMS;
  readonly maxSize = 80;
  readonly algorithm = signal(SORTING_ALGORITHMS[0]);
  readonly size = signal(30);
  readonly speed = signal(25);
  readonly values = signal<number[]>([]);
  readonly active = signal<readonly number[]>([]);
  readonly comparisons = signal(0);
  readonly writes = signal(0);
  readonly elapsedMs = signal(0);
  readonly status = signal<'ready' | 'running' | 'paused' | 'done'>('ready');
  readonly statusKey = computed(
    () =>
      (
        ({
          ready: 'sorting.ready',
          running: 'sorting.running',
          paused: 'sorting.paused',
          done: 'sorting.done',
        }) as const
      )[this.status()],
  );
  private elapsedBeforeRun = 0;
  private runStartedAt?: number;
  private clock?: ReturnType<typeof setInterval>;
  private original: number[] = [];
  private iterator?: Generator<SortStep, void, unknown>;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.shuffle();
  }

  selectAlgorithm(id: string): void {
    const algorithm = this.algorithms.find((item) => item.id === id);
    if (!algorithm) return;
    this.algorithm.set(algorithm);
    this.reset();
  }

  changeSize(value: number): void {
    if (!Number.isFinite(value)) return;
    this.size.set(Math.max(5, Math.min(this.maxSize, Math.round(value))));
    this.shuffle();
  }

  changeSpeed(value: number): void {
    if (!Number.isFinite(value)) return;
    this.speed.set(Math.max(1, Math.min(100, Math.round(value))));
    if (this.status() === 'running') {
      this.cancelTimer();
      this.schedule();
    }
  }

  shuffle(): void {
    this.original = Array.from({ length: this.size() }, (_, index) => index + 1);
    for (let i = this.original.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.original[i], this.original[j]] = [this.original[j], this.original[i]];
    }
    this.reset();
  }

  reset(): void {
    this.cancelTimer();
    this.stopClock();
    this.elapsedBeforeRun = 0;
    this.elapsedMs.set(0);
    this.iterator = undefined;
    this.values.set([...this.original]);
    this.active.set([]);
    this.comparisons.set(0);
    this.writes.set(0);
    this.status.set('ready');
  }

  toggle(): void {
    if (this.status() === 'done') return;
    if (this.status() === 'running') {
      this.cancelTimer();
      this.stopClock();
      this.status.set('paused');
    } else {
      this.status.set('running');
      this.startClock();
      this.schedule();
    }
  }

  step(): void {
    if (this.status() === 'running' || this.status() === 'done') return;
    this.status.set('paused');
    this.advance();
  }

  private advance(): void {
    this.iterator ??= this.algorithm().sort(this.values());
    const next = this.iterator.next();
    if (next.done) {
      this.active.set([]);
      this.stopClock();
      this.status.set('done');
      return;
    }
    const step = next.value;
    if (step.type === 'compare') {
      this.active.set(step.indices);
      this.comparisons.update((count) => count + 1);
    } else {
      const values = [...this.values()];
      if (step.type === 'swap') {
        const [a, b] = step.indices;
        [values[a], values[b]] = [values[b], values[a]];
        this.active.set(step.indices);
        this.writes.update((count) => count + 2);
      } else {
        values[step.index] = step.value;
        this.active.set([step.index]);
        this.writes.update((count) => count + 1);
      }
      this.values.set(values);
    }
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
  ngOnDestroy(): void {
    this.cancelTimer();
    this.stopClock();
  }
}
