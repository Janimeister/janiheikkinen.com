import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { LanguageService } from '../i18n/language.service';
import {
  SearchAlgorithm,
  SearchResult,
  SearchStep,
  SEARCH_ALGORITHMS,
} from '../searching/search-algorithms';
import { VisualizationPlayback } from '../visualization/playback-controller';
import { VisualizerNavComponent } from '../visualization/visualizer-nav.component';

@Component({
  selector: 'app-searching-page',
  imports: [RouterLink, GlowCardComponent, DecimalPipe, VisualizerNavComponent],
  template: `
    <section class="relative max-w-6xl mx-auto px-6 md:px-12 pt-28 pb-16">
      <a routerLink="/" class="text-accent-light font-bold">← {{ i18n.t('common.backToHome') }}</a>
      <header class="my-8 animate-fade-slide-up">
        <h1 class="text-3xl md:text-5xl mb-4">
          <span class="marker marker-pink">{{ i18n.t('searching.title') }}</span>
        </h1>
        <p class="text-text-secondary max-w-2xl">{{ i18n.t('searching.subtitle') }}</p>
        <app-visualizer-nav category="searching" />
      </header>
      <app-glow-card>
        <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label for="algorithm">{{ i18n.t('searching.algorithm') }}</label>
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
            <label for="size">{{ i18n.t('searching.size') }}: {{ size() }}</label>
            <input
              #sizeControl
              id="size"
              type="range"
              min="5"
              [max]="maxSize"
              [value]="size()"
              aria-describedby="size-help"
              (input)="changeSize(+sizeControl.value)"
            />
            <p id="size-help" class="text-sm text-text-secondary">
              {{ i18n.t('searching.sizeHelp') }}
            </p>
          </div>
          <div>
            <label for="target">{{ i18n.t('searching.target') }}</label>
            <input
              #targetControl
              id="target"
              class="target-input"
              type="number"
              min="1"
              max="999"
              step="1"
              [value]="target()"
              (input)="setTarget(+targetControl.value)"
            />
          </div>
          <div>
            <label for="speed">{{ i18n.t('searching.speed') }}: {{ speed() }}</label>
            <input
              #speedControl
              id="speed"
              type="range"
              min="1"
              max="100"
              [value]="speed()"
              aria-describedby="speed-help"
              (input)="changeSpeed(+speedControl.value)"
            />
            <p id="speed-help" class="text-sm text-text-secondary">
              {{ i18n.t('searching.speedHelp') }}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-3 mt-6">
          <button class="bg-pop-lime" (click)="toggle()" [disabled]="status() === 'done'">
            {{
              i18n.t(
                status() === 'running'
                  ? 'searching.pause'
                  : status() === 'paused'
                    ? 'searching.resume'
                    : 'searching.start'
              )
            }}
          </button>
          <button (click)="step()" [disabled]="status() === 'running' || status() === 'done'">
            {{ i18n.t('searching.step') }}
          </button>
          <button (click)="reset()">{{ i18n.t('searching.reset') }}</button>
          <button class="bg-pop-yellow" (click)="generate()">
            {{ i18n.t('searching.regenerate') }}
          </button>
          <button (click)="choosePresentTarget()">{{ i18n.t('searching.presentTarget') }}</button>
          <button (click)="chooseMissingTarget()">{{ i18n.t('searching.missingTarget') }}</button>
        </div>
      </app-glow-card>
      <div class="mt-8 brutal-border brutal-shadow bg-bg-card p-4 md:p-6">
        <div class="flex flex-wrap justify-between gap-3 mb-4 font-mono text-sm">
          <p role="status">{{ i18n.t(statusKey()) }}</p>
          <p>
            {{ i18n.t('searching.target') }}: <strong>{{ target() }}</strong>
          </p>
        </div>
        <p
          role="timer"
          aria-live="off"
          [attr.aria-label]="i18n.t('searching.elapsed')"
          class="font-mono font-bold mb-2"
        >
          {{ i18n.t('searching.elapsed') }}: {{ elapsedMs() / 1000 | number: '1.2-2' }} s
        </p>
        <p class="text-sm text-text-secondary mb-4">{{ i18n.t('searching.elapsedHelp') }}</p>
        <div
          class="bars"
          role="img"
          data-testid="search-bars"
          [attr.aria-label]="i18n.t('searching.chart', { count: values().length })"
        >
          @for (value of values(); track $index) {
            <div
              class="bar"
              [class.checked]="checked().has($index)"
              [class.outside]="isEliminated($index)"
              [class.current]="current() === $index"
              [class.midpoint]="midpoint() === $index"
              [class.found]="foundIndex() === $index"
              [style.height.%]="(value / maxValue()) * 100"
              [attr.data-value]="value"
              [attr.data-index]="$index"
              [attr.title]="barTitle($index, value)"
            >
              @if (values().length <= 20) {
                <span>{{ value }}</span>
              }
              @if (midpoint() === $index) {
                <b class="badge">M</b>
              }
              @if (current() === $index && midpoint() !== $index) {
                <b class="badge">?</b>
              }
              @if (foundIndex() === $index) {
                <b class="badge">✓</b>
              }
            </div>
          }
        </div>
        <p class="text-sm mt-4">{{ i18n.t('searching.legend') }}</p>
        <dl class="stats mt-4">
          <div>
            <dt>{{ i18n.t('searching.comparisons') }}</dt>
            <dd data-testid="search-comparisons">{{ comparisons() }}</dd>
          </div>
          <div>
            <dt>{{ i18n.t('searching.inspected') }}</dt>
            <dd>{{ checked().size }}</dd>
          </div>
          <div>
            <dt>{{ i18n.t('searching.result') }}</dt>
            <dd>{{ resultKey() ? i18n.t(resultKey()!) : '—' }}</dd>
          </div>
          <div>
            <dt>{{ i18n.t('searching.index') }}</dt>
            <dd>{{ result()?.index ?? '—' }}</dd>
          </div>
        </dl>
        <details class="mt-3 text-sm">
          <summary class="cursor-pointer font-bold">{{ i18n.t('searching.values') }}</summary>
          <p class="font-mono mt-2 break-words">{{ values().join(', ') }}</p>
        </details>
      </div>
      <div class="mt-8">
        <app-glow-card>
          <h2 class="text-xl mb-3">{{ i18n.t(algorithm().nameKey) }}</h2>
          <p>{{ i18n.t(algorithm().descriptionKey) }}</p>
          <p class="font-mono text-sm mt-4">
            {{ i18n.t('searching.time') }}: {{ algorithm().time }} ·
            {{ i18n.t('searching.space') }}: {{ algorithm().space }}
          </p>
          <p class="mt-2 text-sm text-text-secondary">{{ i18n.t(algorithm().requirements[0]) }}</p>
          <div class="overflow-x-auto mt-6">
            <table class="w-full text-left text-sm">
              <caption class="text-left font-bold text-lg mb-3">
                {{
                  i18n.t('searching.complexity')
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ i18n.t('searching.algorithm') }}</th>
                  <th scope="col">{{ i18n.t('searching.time') }}</th>
                  <th scope="col">{{ i18n.t('searching.space') }}</th>
                  <th scope="col">{{ i18n.t('searching.requirements') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of algorithms; track item.id) {
                  <tr>
                    <th scope="row">{{ i18n.t(item.nameKey) }}</th>
                    <td>{{ item.time }}</td>
                    <td>{{ item.space }}</td>
                    <td>{{ i18n.t(item.requirements[0]) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </app-glow-card>
      </div>
    </section>
  `,
  styles: `
    label {
      display: block;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    select,
    .target-input {
      width: 100%;
      min-height: 44px;
      background: var(--color-bg-card);
      border: 2px solid var(--color-ink);
      padding: 0.6rem;
    }
    input[type='range'] {
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
    .bar.checked {
      background: repeating-linear-gradient(135deg, var(--color-pop-pink) 0 7px, #ffe0f7 7px 10px);
    }
    .bar.outside {
      opacity: 0.35;
      background: repeating-linear-gradient(45deg, #85857d 0 4px, var(--color-bg-card) 4px 8px);
    }
    .bar.current {
      border-top: 6px solid var(--color-ink);
    }
    .bar.midpoint {
      background: var(--color-pop-yellow);
      box-shadow: inset 0 0 0 3px var(--color-ink);
    }
    .bar.found {
      background: repeating-linear-gradient(135deg, var(--color-pop-lime) 0 7px, #e6f7c7 7px 10px);
      border: 4px solid var(--color-ink);
    }
    .bar span {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      font: 700 0.65rem var(--font-mono);
    }
    .badge {
      position: absolute;
      top: -1.3rem;
      left: 50%;
      transform: translateX(-50%);
      font: 700 0.7rem var(--font-mono);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
      gap: 0.75rem;
    }
    .stats div {
      border: 2px solid var(--color-ink);
      padding: 0.6rem;
    }
    .stats dt {
      font-size: 0.8rem;
      color: var(--color-text-secondary);
    }
    .stats dd {
      font-family: var(--font-mono);
      font-weight: 700;
    }
    th,
    td {
      padding: 0.5rem;
      border-bottom: 2px solid var(--color-ink);
    }
    td {
      font-family: var(--font-mono);
      white-space: nowrap;
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
export class SearchingPageComponent implements OnDestroy {
  readonly i18n = inject(LanguageService);
  readonly algorithms = SEARCH_ALGORITHMS;
  readonly maxSize = 80;
  readonly algorithm = signal<SearchAlgorithm>(SEARCH_ALGORITHMS[0]);
  readonly size = signal(30);
  readonly target = signal(0);
  readonly playback = new VisualizationPlayback<SearchStep, SearchResult>();
  readonly speed = this.playback.speed;
  readonly status = this.playback.status;
  readonly elapsedMs = this.playback.elapsedMs;
  readonly values = signal<number[]>([]);
  readonly checked = signal<ReadonlySet<number>>(new Set());
  readonly eliminated = signal<ReadonlySet<number>>(new Set());
  readonly current = signal<number | null>(null);
  readonly midpoint = signal<number | null>(null);
  readonly foundIndex = signal<number | null>(null);
  readonly result = signal<SearchResult | null>(null);
  readonly comparisons = signal(0);
  readonly low = signal(0);
  readonly high = signal(-1);
  readonly maxValue = computed(() => Math.max(1, ...this.values()));
  readonly statusKey = computed(
    () =>
      ({
        ready: 'searching.ready',
        running: 'searching.running',
        paused: 'searching.paused',
        done: 'searching.done',
      })[this.status()] as
        'searching.ready' | 'searching.running' | 'searching.paused' | 'searching.done',
  );
  readonly resultKey = computed(() => {
    if (!this.result()) return null;
    return this.result()!.found ? 'searching.found' : 'searching.notFound';
  });

  constructor() {
    this.playback.configure(
      () => this.algorithm().search(this.values(), this.target()),
      (event) => this.applyStep(event),
      (result) => this.result.set(result),
    );
    this.generate();
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
    this.generate();
  }

  changeSpeed(value: number): void {
    this.playback.setSpeed(value);
  }

  setTarget(value: number): void {
    if (!Number.isFinite(value)) return;
    this.target.set(Math.max(1, Math.min(999, Math.round(value))));
    this.reset();
  }

  choosePresentTarget(): void {
    const values = this.values();
    this.setTarget(values[Math.floor(Math.random() * values.length)] ?? 1);
  }

  chooseMissingTarget(): void {
    this.setTarget((this.values().at(-1) ?? 0) + 10);
  }

  generate(): void {
    const values = Array.from(
      { length: this.size() },
      (_, index) => (index + 1) * 10 + Math.floor(Math.random() * 9),
    );
    this.values.set(values);
    this.target.set(values[Math.floor(values.length / 2)] ?? 1);
    this.reset();
  }

  reset(): void {
    this.playback.reset();
    this.checked.set(new Set());
    this.eliminated.set(new Set());
    this.current.set(null);
    this.midpoint.set(null);
    this.foundIndex.set(null);
    this.result.set(null);
    this.comparisons.set(0);
    this.low.set(0);
    this.high.set(this.values().length - 1);
  }

  toggle(): void {
    this.playback.startOrPause();
  }
  step(): void {
    this.playback.step();
  }

  isEliminated(index: number): boolean {
    return (
      this.eliminated().has(index) ||
      (this.algorithm().id === 'binary' && (index < this.low() || index > this.high()))
    );
  }

  barTitle(index: number, value: number): string {
    const key =
      this.foundIndex() === index
        ? 'searching.foundBar'
        : this.current() === index
          ? 'searching.currentBar'
          : this.isEliminated(index)
            ? 'searching.eliminatedBar'
            : this.checked().has(index)
              ? 'searching.checkedBar'
              : 'searching.valueBar';
    return `${this.i18n.t(key)} ${value}`;
  }

  private applyStep(step: SearchStep): void {
    if (step.type === 'inspect') {
      this.current.set(step.index);
      this.checked.update((items) => new Set([...items, step.index]));
      this.comparisons.update((count) => count + 1);
    } else if (step.type === 'setRange') {
      this.low.set(step.low);
      this.high.set(step.high);
    } else if (step.type === 'setMidpoint') {
      this.midpoint.set(step.index);
      this.current.set(step.index);
    } else if (step.type === 'eliminate') {
      this.eliminated.update((items) => new Set([...items, ...step.indices]));
    } else if (step.type === 'found') {
      this.foundIndex.set(step.index);
      this.current.set(step.index);
    }
  }

  ngOnDestroy(): void {
    this.playback.destroy();
  }
}
