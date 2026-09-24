import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { LanguageService } from '../i18n/language.service';
import { SORTING_ALGORITHMS, SortStep } from '../sorting/sorting-algorithms';
import { VisualizationPlayback } from '../visualization/playback-controller';

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
              [class.comparing]="active().includes($index)"
              [class.partition]="isInPartition($index)"
              [class.pivot]="pivot() === $index"
              [class.sorted]="sorted().has($index) || status() === 'done'"
              [class.inserting]="insertionIndex() === $index"
              [class.shifting]="shifting().includes($index)"
              [class.final-insertion]="finalInsertion() === $index"
              [style.height.%]="(value / size()) * 100"
              [attr.data-value]="value"
              [attr.title]="barTitle($index, value)"
            >
              @if (size() <= 20) {
                <span>{{ value }}</span>
              }
              @if (pivot() === $index) {
                <b class="marker-label">P</b>
              }
              @if (insertionIndex() === $index) {
                <b class="marker-label">K</b>
              }
              @if (finalInsertion() === $index) {
                <b class="marker-label">↓</b>
              }
            </div>
          }
        </div>
        <p class="text-sm mt-4">{{ i18n.t('sorting.legend') }}</p>
        <p class="text-sm text-text-secondary mt-1" aria-live="polite">
          {{
            insertionValue() === null
              ? ''
              : i18n.t('sorting.insertingValue', { value: insertionValue() ?? 0 })
          }}
        </p>
        <details class="mt-3 text-sm">
          <summary class="cursor-pointer font-bold">{{ i18n.t('sorting.values') }}</summary>
          <p class="font-mono mt-2 break-words">{{ values().join(', ') }}</p>
        </details>
      </div>
      <div class="mt-8">
        <app-glow-card>
          <h2 class="text-xl mb-3">{{ i18n.t(algorithm().nameKey) }}</h2>
          <p>{{ i18n.t(algorithm().descriptionKey) }}</p>
          <dl class="metadata mt-4 text-sm">
            <div>
              <dt>{{ i18n.t('sorting.space') }}</dt>
              <dd>{{ algorithm().space }}</dd>
            </div>
            <div>
              <dt>{{ i18n.t('sorting.stability') }}</dt>
              <dd>{{ i18n.t(algorithm().stable ? 'sorting.stable' : 'sorting.unstable') }}</dd>
            </div>
            <div>
              <dt>{{ i18n.t('sorting.inPlace') }}</dt>
              <dd>{{ i18n.t(algorithm().inPlace ? 'sorting.yes' : 'sorting.no') }}</dd>
            </div>
          </dl>
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
                  <th scope="col">{{ i18n.t('sorting.space') }}</th>
                  <th scope="col">{{ i18n.t('sorting.stability') }}</th>
                  <th scope="col">{{ i18n.t('sorting.inPlace') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of algorithms; track item.id) {
                  <tr>
                    <th scope="row">{{ i18n.t(item.nameKey) }}</th>
                    <td>{{ item.time.best }}</td>
                    <td>{{ item.time.average }}</td>
                    <td>{{ item.time.worst }}</td>
                    <td>{{ item.space }}</td>
                    <td>{{ i18n.t(item.stable ? 'sorting.stable' : 'sorting.unstable') }}</td>
                    <td>{{ i18n.t(item.inPlace ? 'sorting.yes' : 'sorting.no') }}</td>
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
    .bar.comparing {
      background: var(--color-pop-pink);
      border-top: 6px solid var(--color-ink);
    }
    .bar.partition {
      outline: 2px dashed var(--color-ink);
      outline-offset: -4px;
    }
    .bar.pivot {
      background: var(--color-pop-orange);
      box-shadow: inset 0 0 0 3px var(--color-ink);
    }
    .bar.sorted {
      background: repeating-linear-gradient(135deg, var(--color-pop-lime) 0 7px, #c9ed91 7px 10px);
    }
    .bar.inserting {
      background: var(--color-pop-yellow);
      border-top: 6px solid var(--color-ink);
    }
    .bar.shifting {
      background: repeating-linear-gradient(
        45deg,
        var(--color-pop-pink) 0 5px,
        var(--color-bg-card) 5px 8px
      );
    }
    .bar.final-insertion {
      border-bottom: 8px solid var(--color-ink);
    }
    .bar span {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      font: 700 0.7rem var(--font-mono);
    }
    .marker-label {
      position: absolute;
      top: -1.4rem;
      left: 50%;
      transform: translateX(-50%);
      font: 700 0.7rem var(--font-mono);
    }
    .metadata {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem 2rem;
    }
    .metadata dt {
      color: var(--color-text-secondary);
    }
    .metadata dd {
      font-family: var(--font-mono);
      font-weight: 700;
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
    @media (prefers-reduced-motion: reduce) {
      .bar {
        transition: none;
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
  readonly playback = new VisualizationPlayback<SortStep>();
  readonly speed = this.playback.speed;
  readonly status = this.playback.status;
  readonly elapsedMs = this.playback.elapsedMs;
  readonly values = signal<number[]>([]);
  readonly active = signal<readonly number[]>([]);
  readonly sorted = signal<ReadonlySet<number>>(new Set());
  readonly partition = signal<{ start: number; end: number } | null>(null);
  readonly pivot = signal<number | null>(null);
  readonly insertionIndex = signal<number | null>(null);
  readonly insertionValue = signal<number | null>(null);
  readonly shifting = signal<readonly number[]>([]);
  readonly finalInsertion = signal<number | null>(null);
  readonly comparisons = signal(0);
  readonly writes = signal(0);
  readonly statusKey = computed(
    () =>
      ({
        ready: 'sorting.ready',
        running: 'sorting.running',
        paused: 'sorting.paused',
        done: 'sorting.done',
      })[this.status()] as 'sorting.ready' | 'sorting.running' | 'sorting.paused' | 'sorting.done',
  );
  private original: number[] = [];

  constructor() {
    this.playback.configure(
      () => this.algorithm().sort(this.values()),
      (event) => this.applyStep(event),
    );
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
    this.playback.setSpeed(value);
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
    this.playback.reset();
    this.values.set([...this.original]);
    this.active.set([]);
    this.sorted.set(new Set());
    this.partition.set(null);
    this.pivot.set(null);
    this.insertionIndex.set(null);
    this.insertionValue.set(null);
    this.shifting.set([]);
    this.finalInsertion.set(null);
    this.comparisons.set(0);
    this.writes.set(0);
  }

  toggle(): void {
    this.playback.startOrPause();
  }

  step(): void {
    this.playback.step();
  }

  isInPartition(index: number): boolean {
    const range = this.partition();
    return range !== null && index >= range.start && index <= range.end;
  }

  barTitle(index: number, value: number): string {
    const state =
      this.pivot() === index
        ? this.i18n.t('sorting.pivotLabel')
        : this.insertionIndex() === index
          ? this.i18n.t('sorting.keyLabel')
          : this.sorted().has(index) || this.status() === 'done'
            ? this.i18n.t('sorting.sortedLabel')
            : this.i18n.t('sorting.valueLabel');
    return `${state}: ${value}`;
  }

  private applyStep(step: SortStep): void {
    if (step.type === 'compare') {
      this.active.set(step.indices);
      this.comparisons.update((count) => count + 1);
      this.shifting.set([]);
      return;
    }
    if (step.type === 'swap') {
      const values = [...this.values()];
      const [left, right] = step.indices;
      [values[left], values[right]] = [values[right], values[left]];
      this.values.set(values);
      this.active.set(step.indices);
      this.writes.update((count) => count + 2);
      const pivot = this.pivot();
      if (pivot === left) this.pivot.set(right);
      else if (pivot === right) this.pivot.set(left);
      return;
    }
    if (step.type === 'write') {
      this.write(step.index, step.value);
      this.active.set([step.index]);
      return;
    }
    if (step.type === 'setPartition') {
      this.partition.set({ start: step.start, end: step.end });
      return;
    }
    if (step.type === 'selectPivot') {
      this.pivot.set(step.index);
      this.active.set([]);
      return;
    }
    if (step.type === 'selectInsertion') {
      this.insertionIndex.set(step.index);
      this.insertionValue.set(step.value);
      this.finalInsertion.set(null);
      this.active.set([]);
      this.sorted.set(new Set(Array.from({ length: step.prefixEnd + 1 }, (_, index) => index)));
      return;
    }
    if (step.type === 'shift') {
      this.write(step.to, step.value);
      this.active.set([step.from, step.to]);
      this.shifting.set([step.from, step.to]);
      return;
    }
    if (step.type === 'insert') {
      this.write(step.index, step.value);
      this.finalInsertion.set(step.index);
      this.active.set([step.index]);
      this.insertionIndex.set(null);
      this.insertionValue.set(null);
      return;
    }
    if (step.type === 'markSorted') {
      this.sorted.update((current) => new Set([...current, ...step.indices]));
      return;
    }
    this.partition.set(null);
    this.pivot.set(null);
    this.active.set([]);
  }

  private write(index: number, value: number): void {
    const values = [...this.values()];
    values[index] = value;
    this.values.set(values);
    this.writes.update((count) => count + 1);
  }

  ngOnDestroy(): void {
    this.playback.destroy();
  }
}
