import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { LanguageService } from '../i18n/language.service';
import type { TranslationKey } from '../i18n/translations';
import {
  PathfindingAlgorithm,
  PathfindingInput,
  PathfindingStep,
  PathResult,
  Terrain,
  PATHFINDING_ALGORITHMS,
} from '../pathfinding/pathfinding-algorithms';
import { VisualizationPlayback } from '../visualization/playback-controller';
import { VisualizerNavComponent } from '../visualization/visualizer-nav.component';

type EditTool = 'start' | 'destination' | 'wall' | 'medium' | 'high' | 'erase';

function exampleTerrain(rows: number, columns: number): Terrain[] {
  const terrain = Array.from({ length: rows * columns }, () => 'normal' as Terrain);
  for (let column = 0; column < columns; column++) {
    if (column !== 8) terrain[5 * columns + column] = 'wall';
  }
  for (let column = 3; column < 7; column++) terrain[6 * columns + column] = 'high';
  for (let column = 4; column < 8; column++) terrain[3 * columns + column] = 'medium';
  return terrain;
}

@Component({
  selector: 'app-pathfinding-page',
  imports: [RouterLink, GlowCardComponent, DecimalPipe, VisualizerNavComponent],
  template: `
    <section class="relative max-w-6xl mx-auto px-4 md:px-12 pt-28 pb-16">
      <a routerLink="/" class="text-accent-light font-bold">← {{ i18n.t('common.backToHome') }}</a>
      <header class="my-8 animate-fade-slide-up">
        <h1 class="text-3xl md:text-5xl mb-4">
          <span class="marker marker-lime">{{ i18n.t('pathfinding.title') }}</span>
        </h1>
        <p class="text-text-secondary max-w-2xl">{{ i18n.t('pathfinding.subtitle') }}</p>
        <app-visualizer-nav category="pathfinding" />
      </header>
      <app-glow-card>
        <div class="grid gap-6 md:grid-cols-3">
          <div>
            <label for="algorithm">{{ i18n.t('pathfinding.algorithm') }}</label>
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
            <label for="speed">{{ i18n.t('pathfinding.speed') }}: {{ speed() }}</label>
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
              {{ i18n.t('pathfinding.speedHelp') }}
            </p>
          </div>
          <div class="playback-controls">
            <button class="bg-pop-lime" (click)="toggle()" [disabled]="status() === 'done'">
              {{
                i18n.t(
                  status() === 'running'
                    ? 'pathfinding.pause'
                    : status() === 'paused'
                      ? 'pathfinding.resume'
                      : 'pathfinding.start'
                )
              }}
            </button>
            <button (click)="step()" [disabled]="status() === 'running' || status() === 'done'">
              {{ i18n.t('pathfinding.step') }}
            </button>
            <button (click)="resetRun()">{{ i18n.t('pathfinding.resetRun') }}</button>
          </div>
        </div>
        <div class="toolbox mt-6" role="group" [attr.aria-label]="i18n.t('pathfinding.editTools')">
          @for (tool of tools; track tool.id) {
            <button
              type="button"
              [attr.aria-pressed]="editTool() === tool.id"
              [class.selected]="editTool() === tool.id"
              (click)="setTool(tool.id)"
            >
              {{ i18n.t(tool.label) }}
            </button>
          }
          <button type="button" class="bg-pop-yellow" (click)="clearGrid()">
            {{ i18n.t('pathfinding.clearGrid') }}
          </button>
          <button type="button" (click)="generateLayout()">
            {{ i18n.t('pathfinding.newLayout') }}
          </button>
        </div>
        <p class="text-sm text-text-secondary mt-3">{{ i18n.t('pathfinding.editHelp') }}</p>
      </app-glow-card>
      <div class="mt-8 brutal-border brutal-shadow bg-bg-card p-3 md:p-6">
        <div class="flex flex-wrap justify-between gap-3 mb-4 font-mono text-sm">
          <p role="status">
            {{ i18n.t(statusKey()) }}
            @if (result()) {
              · {{ i18n.t(resultKey()) }}
            }
          </p>
          <p>{{ i18n.t('pathfinding.costModel') }}</p>
        </div>
        <p
          role="timer"
          aria-live="off"
          [attr.aria-label]="i18n.t('pathfinding.elapsed')"
          class="font-mono font-bold mb-2"
        >
          {{ i18n.t('pathfinding.elapsed') }}: {{ elapsedMs() / 1000 | number: '1.2-2' }} s
        </p>
        <p class="text-sm text-text-secondary mb-4">{{ i18n.t('pathfinding.elapsedHelp') }}</p>
        <div class="grid-board" role="group" [attr.aria-label]="i18n.t('pathfinding.gridLabel')">
          @for (cell of cells(); track cell.index) {
            <button
              type="button"
              class="cell"
              [class.start]="cell.index === start()"
              [class.destination]="cell.index === destination()"
              [class.wall]="terrain()[cell.index] === 'wall'"
              [class.medium]="terrain()[cell.index] === 'medium'"
              [class.high]="terrain()[cell.index] === 'high'"
              [class.frontier]="frontier().has(cell.index)"
              [class.visited]="visited().has(cell.index)"
              [class.current]="current() === cell.index"
              [class.path]="path().has(cell.index)"
              [attr.data-cell]="cell.index"
              [attr.data-testid]="'grid-cell-' + cell.index"
              [attr.aria-label]="cellLabel(cell.index)"
              [tabindex]="focusedCell() === cell.index ? 0 : -1"
              (click)="editCell(cell.index)"
              (keydown)="onGridKeydown($event, cell.index)"
            >
              @if (cell.index === start() && cell.index === destination()) {
                S/G
              } @else if (cell.index === start()) {
                S
              } @else if (cell.index === destination()) {
                G
              } @else if (terrain()[cell.index] === 'wall') {
                ■
              } @else if (current() === cell.index) {
                C
              } @else if (path().has(cell.index)) {
                •
              } @else if (visited().has(cell.index)) {
                V
              } @else if (frontier().has(cell.index)) {
                O
              } @else if (terrain()[cell.index] === 'medium') {
                3
              } @else if (terrain()[cell.index] === 'high') {
                8
              }
              @if (
                cell.index !== start() &&
                cell.index !== destination() &&
                (frontier().has(cell.index) ||
                  visited().has(cell.index) ||
                  current() === cell.index ||
                  path().has(cell.index)) &&
                terrain()[cell.index] === 'medium'
              ) {
                <small class="cost-label">3</small>
              }
              @if (
                cell.index !== start() &&
                cell.index !== destination() &&
                (frontier().has(cell.index) ||
                  visited().has(cell.index) ||
                  current() === cell.index ||
                  path().has(cell.index)) &&
                terrain()[cell.index] === 'high'
              ) {
                <small class="cost-label">8</small>
              }
            </button>
          }
        </div>
        <p class="legend mt-4 text-sm">{{ i18n.t('pathfinding.legend') }}</p>
        <dl class="stats mt-4">
          <div>
            <dt>{{ i18n.t('pathfinding.visitedCount') }}</dt>
            <dd data-testid="nodes-visited">{{ nodesVisited() }}</dd>
          </div>
          <div>
            <dt>{{ i18n.t('pathfinding.pathLength') }}</dt>
            <dd data-testid="path-length">
              {{ result()?.found ? result()!.path.length - 1 : '—' }}
            </dd>
          </div>
          <div>
            <dt>{{ i18n.t('pathfinding.pathCost') }}</dt>
            <dd data-testid="path-cost">{{ result()?.cost ?? '—' }}</dd>
          </div>
        </dl>
      </div>
      <div class="mt-8">
        <app-glow-card>
          <h2 class="text-xl mb-3">{{ i18n.t(algorithm().nameKey) }}</h2>
          <p>{{ i18n.t(algorithm().descriptionKey) }}</p>
          <p class="text-sm text-text-secondary mt-3">{{ i18n.t(algorithm().requirements[0]) }}</p>
          <p class="font-mono text-sm mt-3">
            {{ i18n.t('pathfinding.complexity') }}: {{ algorithm().time }} ·
            {{ i18n.t('pathfinding.space') }}: {{ algorithm().space }}
          </p>
          <div
            class="overflow-x-auto mt-6"
            tabindex="0"
            role="region"
            [attr.aria-label]="i18n.t('pathfinding.algorithms')"
          >
            <table class="w-full text-left text-sm">
              <caption class="text-left font-bold text-lg mb-3">
                {{
                  i18n.t('pathfinding.algorithms')
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{{ i18n.t('pathfinding.algorithm') }}</th>
                  <th scope="col">{{ i18n.t('pathfinding.time') }}</th>
                  <th scope="col">{{ i18n.t('pathfinding.space') }}</th>
                  <th scope="col">{{ i18n.t('pathfinding.characteristics') }}</th>
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
    select {
      width: 100%;
      min-height: 44px;
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
      padding: 0.45rem 0.7rem;
      font-weight: 700;
      min-height: 44px;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .playback-controls {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 0.5rem;
    }
    .toolbox {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .toolbox .selected {
      outline: 3px solid var(--color-ink);
      outline-offset: 2px;
      background: var(--color-pop-yellow);
    }
    .grid-board {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 3px;
      width: 100%;
    }
    .cell {
      position: relative;
      min-width: 0;
      aspect-ratio: 1;
      padding: 0;
      display: grid;
      place-items: center;
      border: 2px solid var(--color-ink);
      background: var(--color-bg-card);
      box-shadow: none;
      font: 700 clamp(0.55rem, 2.4vw, 0.9rem) var(--font-mono);
    }
    .cost-label {
      position: absolute;
      right: 1px;
      bottom: 0;
      font: 700 0.55rem var(--font-mono);
    }
    .cell.wall {
      background: repeating-linear-gradient(135deg, #54554e 0 5px, #73746d 5px 8px);
      color: white;
    }
    .cell.medium {
      background: repeating-linear-gradient(45deg, #ffd43b 0 7px, #fff0a5 7px 10px);
    }
    .cell.high {
      background: repeating-linear-gradient(45deg, #ff90e8 0 7px, #ffd8f6 7px 10px);
    }
    .cell.frontier {
      border-style: dashed;
      background-color: var(--color-pop-sky);
    }
    .cell.visited {
      background: repeating-linear-gradient(135deg, #c3d8e7 0 7px, #edf5fa 7px 10px);
    }
    .cell.current {
      outline: 4px solid var(--color-ink);
      outline-offset: -4px;
      background: var(--color-pop-orange);
      z-index: 1;
    }
    .cell.path {
      background: repeating-linear-gradient(45deg, var(--color-pop-lime) 0 7px, #e0f4c1 7px 10px);
      border-width: 3px;
    }
    .cell.start {
      background: var(--color-pop-lime);
      border-width: 3px;
    }
    .cell.destination {
      background: var(--color-pop-pink);
      border-width: 3px;
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
    .legend {
      line-height: 1.8;
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
    @media (max-width: 380px) {
      .grid-board {
        gap: 2px;
      }
      .cell {
        border-width: 1px;
      }
    }
  `,
})
export class PathfindingPageComponent implements OnDestroy {
  readonly i18n = inject(LanguageService);
  readonly rows = 10;
  readonly columns = 12;
  readonly algorithms = PATHFINDING_ALGORITHMS;
  readonly algorithm = signal<PathfindingAlgorithm>(PATHFINDING_ALGORITHMS[0]);
  readonly start = signal(13);
  readonly destination = signal(106);
  readonly terrain = signal<readonly Terrain[]>(exampleTerrain(this.rows, this.columns));
  readonly editTool = signal<EditTool>('wall');
  readonly playback = new VisualizationPlayback<PathfindingStep, PathResult>();
  readonly speed = this.playback.speed;
  readonly status = this.playback.status;
  readonly elapsedMs = this.playback.elapsedMs;
  readonly cells = computed(() =>
    Array.from({ length: this.rows * this.columns }, (_, index) => ({ index })),
  );
  readonly frontier = signal<ReadonlySet<number>>(new Set());
  readonly visited = signal<ReadonlySet<number>>(new Set());
  readonly path = signal<ReadonlySet<number>>(new Set());
  readonly current = signal<number | null>(null);
  readonly nodesVisited = signal(0);
  readonly result = signal<PathResult | null>(null);
  readonly focusedCell = signal(this.start());
  readonly statusKey = computed(
    () =>
      ({
        ready: 'pathfinding.ready',
        running: 'pathfinding.running',
        paused: 'pathfinding.paused',
        done: 'pathfinding.done',
      })[this.status()] as
        'pathfinding.ready' | 'pathfinding.running' | 'pathfinding.paused' | 'pathfinding.done',
  );
  readonly resultKey = computed(() =>
    this.result()?.found ? 'pathfinding.found' : 'pathfinding.noRoute',
  );
  readonly tools: readonly { id: EditTool; label: TranslationKey }[] = [
    { id: 'start', label: 'pathfinding.moveStart' },
    { id: 'destination', label: 'pathfinding.moveDestination' },
    { id: 'wall', label: 'pathfinding.wallTool' },
    { id: 'medium', label: 'pathfinding.mediumTool' },
    { id: 'high', label: 'pathfinding.highTool' },
    { id: 'erase', label: 'pathfinding.eraseTool' },
  ];

  constructor() {
    this.playback.configure(
      () => this.algorithm().findPath(this.createInput()),
      (event) => this.applyStep(event),
      (result) => this.result.set(result),
    );
  }

  selectAlgorithm(id: string): void {
    const algorithm = this.algorithms.find((item) => item.id === id);
    if (!algorithm) return;
    this.algorithm.set(algorithm);
    this.resetRun();
  }

  changeSpeed(value: number): void {
    this.playback.setSpeed(value);
  }
  toggle(): void {
    this.playback.startOrPause();
  }
  step(): void {
    this.playback.step();
  }

  setTool(tool: EditTool): void {
    this.resetRun();
    this.editTool.set(tool);
  }

  editCell(index: number): void {
    this.resetRun();
    this.focusedCell.set(index);
    const tool = this.editTool();
    if (tool === 'start') {
      this.start.set(index);
      if (this.terrain()[index] === 'wall') this.setTerrain(index, 'normal');
      this.focusedCell.set(index);
      return;
    }
    if (tool === 'destination') {
      this.destination.set(index);
      if (this.terrain()[index] === 'wall') this.setTerrain(index, 'normal');
      this.focusedCell.set(index);
      return;
    }
    if (index === this.start() || index === this.destination()) return;
    if (tool === 'wall')
      this.setTerrain(index, this.terrain()[index] === 'wall' ? 'normal' : 'wall');
    else if (tool === 'erase') this.setTerrain(index, 'normal');
    else this.setTerrain(index, tool);
  }

  clearGrid(): void {
    this.resetRun();
    this.terrain.set(Array.from({ length: this.rows * this.columns }, () => 'normal'));
  }

  generateLayout(): void {
    this.resetRun();
    this.terrain.set(exampleTerrain(this.rows, this.columns));
  }

  resetRun(): void {
    this.playback.reset();
    this.frontier.set(new Set());
    this.visited.set(new Set());
    this.path.set(new Set());
    this.current.set(null);
    this.nodesVisited.set(0);
    this.result.set(null);
  }

  cellLabel(index: number): string {
    const row = Math.floor(index / this.columns) + 1;
    const column = (index % this.columns) + 1;
    const state =
      index === this.start() && index === this.destination()
        ? this.i18n.t('pathfinding.startAndDestinationNode')
        : index === this.start()
          ? this.i18n.t('pathfinding.startNode')
          : index === this.destination()
            ? this.i18n.t('pathfinding.destinationNode')
            : this.terrain()[index] === 'wall'
              ? this.i18n.t('pathfinding.wallNode')
              : this.i18n.t(
                  `pathfinding.${this.terrain()[index]}Node` as
                    'pathfinding.normalNode' | 'pathfinding.mediumNode' | 'pathfinding.highNode',
                );
    const progress = this.path().has(index)
      ? this.i18n.t('pathfinding.pathState')
      : this.current() === index
        ? this.i18n.t('pathfinding.currentState')
        : this.visited().has(index)
          ? this.i18n.t('pathfinding.visitedState')
          : this.frontier().has(index)
            ? this.i18n.t('pathfinding.frontierState')
            : '';
    return `${this.i18n.t('pathfinding.row')} ${row}, ${this.i18n.t('pathfinding.column')} ${column}: ${state}${progress ? `, ${progress}` : ''}`;
  }

  onGridKeydown(event: KeyboardEvent, index: number): void {
    const directions: Record<string, number> = {
      ArrowUp: -this.columns,
      ArrowDown: this.columns,
      ArrowLeft: -1,
      ArrowRight: 1,
    };
    const delta = directions[event.key];
    if (delta === undefined) return;
    const target = index + delta;
    if (target < 0 || target >= this.rows * this.columns) return;
    if (event.key === 'ArrowLeft' && index % this.columns === 0) return;
    if (event.key === 'ArrowRight' && index % this.columns === this.columns - 1) return;
    event.preventDefault();
    this.focusedCell.set(target);
    const board = (event.currentTarget as HTMLElement).parentElement;
    board?.querySelector<HTMLButtonElement>(`[data-cell="${target}"]`)?.focus();
  }

  private createInput(): PathfindingInput {
    return {
      rows: this.rows,
      columns: this.columns,
      terrain: [...this.terrain()],
      start: this.start(),
      destination: this.destination(),
    };
  }

  private setTerrain(index: number, value: Terrain): void {
    const next = [...this.terrain()];
    next[index] = value;
    this.terrain.set(next);
  }

  private applyStep(step: PathfindingStep): void {
    if (step.type === 'frontier') {
      this.frontier.update((nodes) => new Set([...nodes, step.node]));
    } else if (step.type === 'visit') {
      this.current.set(step.node);
      this.visited.update((nodes) => new Set([...nodes, step.node]));
      this.frontier.update((nodes) => {
        const next = new Set(nodes);
        next.delete(step.node);
        return next;
      });
      this.nodesVisited.update((count) => count + 1);
    } else if (step.type === 'pathNode') {
      this.path.update((nodes) => new Set([...nodes, step.node]));
    }
  }

  ngOnDestroy(): void {
    this.playback.destroy();
  }
}
