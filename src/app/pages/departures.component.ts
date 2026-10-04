import { DOCUMENT } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import {
  boardRequest,
  countdown,
  parseBoard,
  parseSearch,
  SEARCH_MIN_LENGTH,
  searchRequest,
  upcoming,
  type Board,
  type BoardResponse,
  type Departure,
  type Mode,
  type Place,
  type SearchResponse,
} from '../departures/digitransit';
import { LanguageService } from '../i18n/language.service';
import type { TranslationKey } from '../i18n/translations';

const RECENTS_KEY = 'departures-recent';
const MAX_RECENTS = 5;
const REFRESH_MS = 30_000;
const CLOCK_MS = 10_000;
const SEARCH_DEBOUNCE_MS = 300;

/** Busy places to try, searched by name so no stop id goes stale. */
const SUGGESTIONS = ['Rautatientori', 'Kamppi', 'Hakaniemi', 'Pasila', 'Kauppatori'];

type PlaceRef = Pick<Place, 'kind' | 'id'>;
type RecentPlace = Pick<Place, 'kind' | 'id' | 'name' | 'code' | 'mode'>;

const MODE_KEYS: Record<Mode, TranslationKey> = {
  BUS: 'departures.mode.bus',
  TRAM: 'departures.mode.tram',
  SUBWAY: 'departures.mode.subway',
  RAIL: 'departures.mode.rail',
  FERRY: 'departures.mode.ferry',
  OTHER: 'departures.mode.other',
};

const MODE_FILLS: Record<Mode, string> = {
  BUS: 'var(--color-pop-sky)',
  TRAM: 'var(--color-pop-lime)',
  SUBWAY: 'var(--color-pop-orange)',
  RAIL: 'var(--color-pop-pink)',
  FERRY: 'var(--color-pop-yellow)',
  OTHER: 'var(--color-bg-card)',
};

const OPTION_CLASS =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-ink bg-bg-card border-2 border-ink shadow-brutal-sm brutal-hover brutal-press transition-transform cursor-pointer';

@Component({
  selector: 'app-departures-page',
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink],
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20">
      <app-floating-orb
        class="hidden md:block absolute top-[12%] right-[10%] z-[1]"
        delay="2s"
        [size]="60"
        shape="circle"
        color="sky"
      />
      <app-floating-orb
        class="hidden md:block absolute bottom-[25%] left-[5%] z-[1]"
        delay="5s"
        [size]="46"
        shape="square"
        color="lime"
        rotate="8deg"
      />

      <div class="relative z-10 max-w-4xl mx-auto">
        <div class="mb-8 animate-fade-slide-up">
          <a
            routerLink="/"
            class="text-sm font-semibold text-ink hover:text-accent-light transition-transform mb-4 inline-flex items-center gap-2 border-2 border-ink bg-bg-card px-3 py-2 shadow-brutal-sm brutal-hover brutal-press"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {{ i18n.t('common.backToHome') }}
          </a>
          <h1 class="text-4xl md:text-5xl font-bold mt-2">
            <span class="marker marker-pink">{{ i18n.t('departures.title') }}</span>
          </h1>
          <p class="text-text-secondary mt-2">{{ i18n.t('departures.subtitle') }}</p>
        </div>

        <!-- Stop search -->
        <div class="mb-8 animate-fade-slide-up stagger-1">
          <app-glow-card>
            <h2 class="text-lg font-semibold mb-3">{{ i18n.t('departures.findStop') }}</h2>
            <form class="flex gap-2" role="search" (submit)="$event.preventDefault(); pickFirst()">
              <input
                type="search"
                [value]="query()"
                (input)="query.set($any($event.target).value)"
                [attr.placeholder]="i18n.t('departures.searchPlaceholder')"
                [attr.aria-label]="i18n.t('departures.searchPlaceholder')"
                aria-describedby="departures-search-help"
                autocomplete="off"
                maxlength="60"
                class="flex-1 min-w-0 bg-bg-card border-2 border-ink px-4 py-2 text-sm text-text-primary placeholder-text-secondary/70 shadow-brutal-sm"
                data-testid="departures-search"
              />
            </form>
            <p id="departures-search-help" class="text-xs text-text-secondary mt-2">
              {{ i18n.t('departures.searchHelp') }}
            </p>

            @if (searchTerm()) {
              <div class="mt-4" aria-live="polite">
                @if (search.isLoading()) {
                  <p class="text-sm text-text-secondary">{{ i18n.t('departures.searching') }}</p>
                } @else if (searchResults(); as results) {
                  @if (results === 'error') {
                    <p class="text-sm text-red-400">{{ i18n.t('departures.searchError') }}</p>
                  } @else if (!results.length) {
                    <p class="text-sm text-text-secondary">
                      {{ i18n.t('departures.noMatches', { query: searchTerm() }) }}
                    </p>
                  } @else {
                    <p class="sr-only">
                      {{ i18n.t('departures.matches', { count: results.length }) }}
                    </p>
                    <ul class="grid gap-2" data-testid="departures-results">
                      @for (place of results; track place.id) {
                        <li>
                          <button
                            type="button"
                            class="w-full text-left flex items-start gap-3 bg-bg-card border-2 border-ink px-3 py-2 shadow-brutal-sm brutal-hover brutal-press transition-transform cursor-pointer"
                            (click)="choose(place)"
                          >
                            <span
                              class="mode-chip shrink-0"
                              [style.background]="modeFill(place.mode)"
                              >{{ modeLabel(place.mode) }}</span
                            >
                            <span class="min-w-0">
                              <span class="block font-semibold">
                                {{ place.name }}
                                @if (place.code) {
                                  <span class="font-mono text-sm text-text-secondary">{{
                                    place.code
                                  }}</span>
                                }
                                @if (place.platform) {
                                  <span class="text-sm text-text-secondary">
                                    ·
                                    {{
                                      i18n.t('departures.platformShort', {
                                        platform: place.platform,
                                      })
                                    }}</span
                                  >
                                }
                              </span>
                              @if (place.description || place.lines.length) {
                                <span class="block text-xs text-text-secondary truncate">
                                  {{ place.description }}
                                  @if (place.description && place.lines.length) {
                                    ·
                                  }
                                  {{ linesPreview(place.lines) }}
                                </span>
                              }
                            </span>
                          </button>
                        </li>
                      }
                    </ul>
                  }
                }
              </div>
            } @else {
              <div class="flex flex-wrap items-center gap-2 mt-4">
                @if (recents().length) {
                  <span class="control-label">{{ i18n.t('departures.recent') }}</span>
                  @for (recent of recents(); track recent.id) {
                    <button type="button" [class]="optionClass" (click)="choose(recent)">
                      <span
                        class="w-2.5 h-2.5 border-2 border-ink"
                        [style.background]="modeFill(recent.mode)"
                        aria-hidden="true"
                      ></span>
                      {{ recent.name }}
                      @if (recent.code) {
                        <span class="font-mono text-xs">{{ recent.code }}</span>
                      }
                    </button>
                  }
                } @else {
                  <span class="control-label">{{ i18n.t('departures.try') }}</span>
                  @for (name of suggestions; track name) {
                    <button type="button" [class]="optionClass" (click)="query.set(name)">
                      {{ name }}
                    </button>
                  }
                }
              </div>
            }
          </app-glow-card>
        </div>

        <!-- Departure board -->
        @if (selected()) {
          <div class="mb-8 animate-fade-slide-up stagger-2">
            @if (boardState(); as state) {
              @if (state.kind === 'loading') {
                <app-glow-card>
                  <div class="animate-pulse space-y-3">
                    <div class="h-6 bg-ink/10 w-1/2"></div>
                    <div class="h-48 bg-ink/10"></div>
                  </div>
                </app-glow-card>
              } @else if (state.kind === 'error') {
                <app-glow-card>
                  <p class="text-red-400">{{ i18n.t(state.key) }}</p>
                  <button type="button" [class]="optionClass + ' mt-4'" (click)="refresh()">
                    {{ i18n.t('departures.retry') }}
                  </button>
                </app-glow-card>
              } @else {
                <div class="board-frame" data-testid="departure-board">
                  <div class="flex flex-wrap items-start gap-x-4 gap-y-2 mb-4">
                    <div class="min-w-0">
                      <h2 class="text-2xl md:text-3xl font-bold">{{ state.board.place.name }}</h2>
                      <p class="text-sm text-text-secondary mt-1">
                        <span
                          class="mode-chip mr-1"
                          [style.background]="modeFill(state.board.place.mode)"
                          >{{ modeLabel(state.board.place.mode) }}</span
                        >
                        @if (state.board.place.code) {
                          <span class="font-mono">{{ state.board.place.code }}</span>
                        }
                        @if (state.board.place.platform) {
                          ·
                          {{
                            i18n.t('departures.platformShort', {
                              platform: state.board.place.platform,
                            })
                          }}
                        }
                        @if (state.board.place.description) {
                          · {{ state.board.place.description }}
                        }
                      </p>
                    </div>
                    <div class="sm:ml-auto flex items-center gap-2">
                      <span class="text-xs text-text-secondary" data-testid="departures-updated">{{
                        i18n.t('departures.updated', { time: clock(state.updated, true) })
                      }}</span>
                      <button
                        type="button"
                        [class]="optionClass"
                        (click)="refresh()"
                        [disabled]="board.isLoading()"
                      >
                        <span aria-hidden="true">↻</span> {{ i18n.t('departures.refresh') }}
                      </button>
                    </div>
                  </div>

                  @if (rows().length) {
                    <div
                      class="board"
                      role="region"
                      [attr.aria-label]="i18n.t('departures.boardRegion')"
                      tabindex="0"
                    >
                      <table class="w-full">
                        <thead>
                          <tr>
                            <th scope="col" class="w-px whitespace-nowrap">
                              {{ i18n.t('departures.line') }}
                            </th>
                            <th scope="col">{{ i18n.t('departures.destination') }}</th>
                            @if (hasPlatforms()) {
                              <th scope="col" class="w-px text-center">
                                {{ i18n.t('departures.platform') }}
                              </th>
                            }
                            <th scope="col" class="text-right w-px whitespace-nowrap">
                              {{ i18n.t('departures.departs') }}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of rows(); track row.key) {
                            <tr [class.cancelled]="row.cancelled" data-testid="departure-row">
                              <td>
                                <span class="line-chip" [style.background]="row.fill">
                                  <span class="sr-only">{{ modeLabel(row.mode) }} </span
                                  >{{ row.line }}
                                </span>
                              </td>
                              <td class="headsign">
                                <span class="headsign-text">{{ row.headsign }}</span>
                                @if (row.cancelled) {
                                  <span class="sr-only">, </span>
                                  <span class="tag tag-cancelled">{{
                                    i18n.t('departures.cancelled')
                                  }}</span>
                                } @else if (row.late) {
                                  <span class="sr-only">, </span>
                                  <span class="tag tag-late"
                                    >{{ row.late
                                    }}<span class="sr-only">
                                      {{ i18n.t('departures.late') }}</span
                                    ></span
                                  >
                                }
                              </td>
                              @if (hasPlatforms()) {
                                <td class="text-center">{{ row.platform ?? '' }}</td>
                              }
                              <td class="text-right whitespace-nowrap">
                                <span class="when">
                                  @if (row.realtime && !row.cancelled) {
                                    <span class="live" aria-hidden="true">●</span
                                    ><span class="sr-only"
                                      >{{ i18n.t('departures.realtime') }}
                                    </span>
                                  }
                                  {{ row.when }}
                                </span>
                                @if (row.clock) {
                                  <span class="clock">{{ row.clock }}</span>
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    <p class="text-xs text-text-secondary mt-3">
                      <span class="legend-live" aria-hidden="true">●</span>
                      {{ i18n.t('departures.legend') }}
                    </p>
                  } @else {
                    <p class="text-text-secondary">{{ i18n.t('departures.noDepartures') }}</p>
                  }
                </div>
              }
            }
          </div>
        }

        <div class="mt-6 text-center text-xs text-text-secondary space-y-1">
          <p>
            <a
              href="https://digitransit.fi/en/developers/"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-accent-light underline underline-offset-2 transition-colors"
              >{{ i18n.t('departures.attribution') }}</a
            >
          </p>
        </div>
      </div>
    </section>
  `,
  styles: `
    .control-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-right: 0.25rem;
    }
    .mode-chip {
      display: inline-block;
      padding: 0 0.375rem;
      border: 2px solid var(--color-ink);
      color: var(--color-ink);
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1.4;
    }
    .board-frame {
      background: var(--color-bg-card);
      border: 2px solid var(--color-ink);
      box-shadow: var(--shadow-brutal);
      padding: 1rem;
    }
    @media (min-width: 640px) {
      .board-frame {
        padding: 1.5rem;
      }
    }
    .board {
      background: var(--color-ink);
      color: var(--color-bg-card);
      border: 2px solid var(--color-ink);
      font-family: var(--font-mono);
      overflow-x: auto;
    }
    .board table {
      border-collapse: collapse;
    }
    .board th {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      text-align: left;
      color: var(--color-pop-yellow);
      padding: 0.625rem 0.375rem;
      border-bottom: 2px solid var(--color-pop-yellow);
    }
    .board th:first-child,
    .board td:first-child {
      padding-left: 0.625rem;
    }
    .board th:last-child,
    .board td:last-child {
      padding-right: 0.625rem;
    }
    @media (min-width: 640px) {
      .board th,
      .board td {
        padding-left: 0.75rem;
        padding-right: 0.75rem;
      }
    }
    .board table {
      font-size: 0.8125rem;
    }
    @media (min-width: 640px) {
      .board table {
        font-size: 1rem;
      }
    }
    .board td {
      padding: 0.5rem 0.375rem;
      border-bottom: 1px dashed var(--color-text-secondary);
      vertical-align: middle;
    }
    .board tr:last-child td {
      border-bottom: 0;
    }
    .line-chip {
      display: inline-block;
      min-width: 2.25rem;
      padding: 0.125rem 0.375rem;
      text-align: center;
      font-weight: 700;
      color: var(--color-ink);
      border: 2px solid var(--color-bg-card);
    }
    .headsign {
      overflow-wrap: anywhere;
    }
    .headsign-text {
      font-weight: 600;
    }
    .tag {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0 0.375rem;
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--color-ink);
      text-transform: uppercase;
    }
    .tag-late {
      background: var(--color-pop-orange);
    }
    .tag-cancelled {
      background: var(--color-pop-pink);
    }
    .cancelled .headsign-text,
    .cancelled .when,
    .cancelled .clock {
      text-decoration: line-through;
    }
    .when {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-pop-yellow);
    }
    .live {
      font-size: 0.625rem;
      vertical-align: middle;
      margin-right: 0.25rem;
      color: var(--color-pop-lime);
    }
    .legend-live {
      color: var(--color-data-green);
    }
    .clock {
      display: block;
      font-size: 0.75rem;
    }
  `,
})
export class DeparturesPageComponent {
  protected readonly i18n = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly storage = this.document.defaultView?.localStorage;

  protected readonly optionClass = OPTION_CLASS;
  protected readonly suggestions = SUGGESTIONS;
  protected readonly recents = signal<RecentPlace[]>(this.loadRecents());

  /** Ticks so countdowns stay right between refreshes. */
  private readonly now = signal(Date.now());

  // ── Search ──
  protected readonly query = signal('');
  /** The query once typing pauses; empty until it is long enough to search. */
  protected readonly searchTerm = signal('');

  protected readonly search = httpResource<SearchResponse>(() => {
    const term = this.searchTerm();
    return term ? this.post(searchRequest(term)) : undefined;
  });

  protected readonly searchResults = computed((): Place[] | 'error' | null => {
    if (this.search.error()) return 'error';
    if (!this.search.hasValue()) return null;
    try {
      return parseSearch(this.search.value(), this.searchTerm());
    } catch {
      return 'error';
    }
  });

  // ── Board ──
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /** The place in the address, or the one seen most recently when the address has none. */
  protected readonly selected = computed((): PlaceRef | null => {
    const params = this.params();
    const station = params.get('station');
    const stop = params.get('stop');
    if (station) return { kind: 'station', id: station };
    if (stop) return { kind: 'stop', id: stop };
    const [recent] = this.recents();
    return recent ? { kind: recent.kind, id: recent.id } : null;
  });

  protected readonly board = httpResource<BoardResponse>(() => {
    const place = this.selected();
    return place ? this.post(boardRequest(place.kind, place.id)) : undefined;
  });

  /** When the board's data last arrived. */
  private readonly updated = signal(0);

  protected readonly boardState = computed(
    ():
      | { kind: 'loading' }
      | { kind: 'error'; key: TranslationKey }
      | { kind: 'ready'; board: Board; updated: number } => {
      const place = this.selected();
      if (!this.board.hasValue()) {
        return this.board.error()
          ? { kind: 'error', key: 'departures.loadError' }
          : { kind: 'loading' };
      }
      try {
        const board = parseBoard(this.board.value(), place?.kind ?? 'stop');
        return board
          ? { kind: 'ready', board, updated: this.updated() }
          : { kind: 'error', key: 'departures.notFound' };
      } catch {
        return { kind: 'error', key: 'departures.loadError' };
      }
    },
  );

  private readonly departures = computed(() => {
    const state = this.boardState();
    return state.kind === 'ready' ? upcoming(state.board.departures, this.now()) : [];
  });

  protected readonly hasPlatforms = computed(() => this.departures().some((d) => d.platform));

  protected readonly rows = computed(() => {
    const now = this.now();
    return this.departures().map((d) => {
      const shown = countdown(d.time, now);
      return {
        key: d.key,
        line: d.line,
        mode: d.mode,
        fill: this.lineFill(d),
        headsign: d.headsign,
        platform: d.platform,
        cancelled: d.cancelled,
        realtime: d.realtime,
        late: d.delay >= 60 ? `+${Math.floor(d.delay / 60)} min` : null,
        when:
          shown.kind === 'now'
            ? this.i18n.t('departures.now')
            : shown.kind === 'minutes'
              ? `${shown.minutes} min`
              : this.clock(d.time),
        // The clock time under a countdown; a clock time needs no second line.
        clock: shown.kind === 'clock' ? null : this.clock(d.time),
      };
    });
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Search once typing pauses.
    effect((onCleanup) => {
      const term = this.query().trim();
      const timer = setTimeout(
        () => this.searchTerm.set(term.length >= SEARCH_MIN_LENGTH ? term : ''),
        term ? SEARCH_DEBOUNCE_MS : 0,
      );
      onCleanup(() => clearTimeout(timer));
    });

    // Note when fresh departures arrive.
    effect(() => {
      if (this.board.hasValue() && this.board.status() === 'resolved') {
        this.board.value();
        this.updated.set(Date.now());
      }
    });

    // Keep the board fresh while it's on screen; a hidden tab doesn't poll.
    const clock = setInterval(() => this.now.set(Date.now()), CLOCK_MS);
    const poll = setInterval(() => {
      if (this.document.visibilityState === 'visible') this.refresh();
    }, REFRESH_MS);
    const onVisible = () => {
      if (this.document.visibilityState !== 'visible') return;
      this.now.set(Date.now());
      if (Date.now() - this.updated() >= REFRESH_MS) this.refresh();
    };
    this.document.addEventListener('visibilitychange', onVisible);
    destroyRef.onDestroy(() => {
      clearInterval(clock);
      clearInterval(poll);
      this.document.removeEventListener('visibilitychange', onVisible);
    });
  }

  protected refresh(): void {
    this.now.set(Date.now());
    if (this.selected() && !this.board.isLoading()) this.board.reload();
  }

  /** Enter in the search field picks the first result. */
  protected pickFirst(): void {
    const results = this.searchResults();
    if (Array.isArray(results) && results.length) this.choose(results[0]);
  }

  protected choose(place: RecentPlace): void {
    this.query.set('');
    this.searchTerm.set('');
    this.remember(place);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: place.kind === 'station' ? { station: place.id } : { stop: place.id },
    });
  }

  protected modeLabel(mode: Mode): string {
    return this.i18n.t(MODE_KEYS[mode]);
  }

  protected modeFill(mode: Mode): string {
    return MODE_FILLS[mode];
  }

  /** Trams wear their line's colour from the tram map; everything else its mode's. */
  private lineFill(departure: Departure): string {
    if (departure.mode === 'TRAM' && /^\d{1,2}$/.test(departure.line)) {
      return `var(--color-line-${departure.line}, ${MODE_FILLS.TRAM})`;
    }
    return MODE_FILLS[departure.mode];
  }

  protected linesPreview(lines: string[]): string {
    const shown = lines.slice(0, 8).join(', ');
    return lines.length > 8 ? `${shown} …` : shown;
  }

  protected clock(time: number, seconds = false): string {
    return new Date(time).toLocaleTimeString(this.i18n.locale(), {
      hour: '2-digit',
      minute: '2-digit',
      ...(seconds ? { second: '2-digit' } : {}),
    });
  }

  private post(body: object) {
    return {
      url: environment.digitransitUrl,
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10_000,
    };
  }

  private remember(place: RecentPlace): void {
    const entry: RecentPlace = {
      kind: place.kind,
      id: place.id,
      name: place.name,
      code: place.code,
      mode: place.mode,
    };
    const next = [entry, ...this.recents().filter((r) => r.id !== place.id)].slice(0, MAX_RECENTS);
    this.recents.set(next);
    try {
      this.storage?.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      // Storage can be full or blocked; recent stops just won't be remembered.
    }
  }

  private loadRecents(): RecentPlace[] {
    try {
      const stored: unknown = JSON.parse(this.storage?.getItem(RECENTS_KEY) ?? '[]');
      if (!Array.isArray(stored)) return [];
      return stored
        .filter(
          (r): r is RecentPlace =>
            !!r &&
            (r.kind === 'stop' || r.kind === 'station') &&
            typeof r.id === 'string' &&
            typeof r.name === 'string',
        )
        .map((r) => ({
          kind: r.kind,
          id: r.id,
          name: r.name,
          code: typeof r.code === 'string' ? r.code : null,
          mode: r.mode in MODE_FILLS ? r.mode : 'OTHER',
        }))
        .slice(0, MAX_RECENTS);
    } catch {
      return [];
    }
  }
}
