import { DOCUMENT } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { PageHeaderComponent } from '../components/shared/page-header.component';
import { DepartureBoardComponent } from '../departures/components/departure-board.component';
import { StopSearchComponent } from '../departures/components/stop-search.component';
import {
  boardRequest,
  parseBoard,
  parseSearch,
  SEARCH_MIN_LENGTH,
  searchRequest,
  type Board,
  type BoardResponse,
  type Place,
  type SearchResponse,
} from '../departures/digitransit';
import { OPTION_CLASS } from '../departures/modes';
import {
  parseRecents,
  RECENTS_KEY,
  withRecent,
  type RecentPlace,
} from '../departures/recent-places';
import { registerTranslations } from '../i18n/dictionaries';
import { LanguageService } from '../i18n/language.service';
import { DEPARTURES_EN } from '../i18n/pages/departures.en';
import type { TranslationKey } from '../i18n/translations';

const REFRESH_MS = 30_000;
const CLOCK_MS = 10_000;
const SEARCH_DEBOUNCE_MS = 300;

type PlaceRef = Pick<Place, 'kind' | 'id'>;

/** A board that loaded, for the place it belongs to. */
interface ShownBoard {
  place: string;
  board: Board;
  /** When its data arrived. */
  updated: number;
}

/** The latest board response, parsed; null while none has arrived. */
type Fresh = Board | 'notFound' | 'error' | null;

const placeKey = (place: PlaceRef | null) => (place ? `${place.kind}:${place.id}` : '');

// This page's English copy; the Finnish copy is fetched by the route when it's needed.
registerTranslations('en', DEPARTURES_EN);

@Component({
  selector: 'app-departures-page',
  imports: [
    GlowCardComponent,
    FloatingOrbComponent,
    PageHeaderComponent,
    StopSearchComponent,
    DepartureBoardComponent,
  ],
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
        <app-page-header
          titleKey="departures.title"
          subtitleKey="departures.subtitle"
          marker="pink"
        />

        <!-- Stop search -->
        <div class="mb-8 animate-fade-slide-up stagger-1">
          <app-glow-card>
            <app-stop-search
              [(query)]="query"
              [searchTerm]="searchTerm()"
              [searching]="search.isLoading()"
              [results]="searchResults()"
              [recents]="recents()"
              (chosen)="choose($event)"
            />
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
                <app-departure-board
                  [board]="state.board"
                  [now]="now()"
                  [updated]="state.updated"
                  [failed]="state.failed"
                  [refreshing]="board.isLoading()"
                  (refresh)="refresh()"
                />
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
})
export class DeparturesPageComponent {
  protected readonly i18n = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly storage = this.document.defaultView?.localStorage;

  protected readonly optionClass = OPTION_CLASS;
  protected readonly recents = signal<RecentPlace[]>(
    parseRecents(this.storage?.getItem(RECENTS_KEY)),
  );

  /** Ticks so countdowns stay right between refreshes. */
  protected readonly now = signal(Date.now());

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
  protected readonly selected = computed(
    (): PlaceRef | null => {
      const params = this.params();
      const station = params.get('station');
      const stop = params.get('stop');
      if (station) return { kind: 'station', id: station };
      if (stop) return { kind: 'stop', id: stop };
      const [recent] = this.recents();
      return recent ? { kind: recent.kind, id: recent.id } : null;
    },
    // The same place again (say, once it's also in the address) must not refetch the board.
    { equal: (a, b) => placeKey(a) === placeKey(b) },
  );

  protected readonly board = httpResource<BoardResponse>(() => {
    const place = this.selected();
    return place ? this.post(boardRequest(place.kind, place.id)) : undefined;
  });

  /** The raw response; the same object while a refresh is in flight, so it isn't parsed again. */
  private readonly response = computed(() =>
    this.board.hasValue() ? this.board.value() : undefined,
  );

  private readonly fresh = computed((): Fresh => {
    const response = this.response();
    if (!response) return this.board.error() ? 'error' : null;
    try {
      return parseBoard(response, this.selected()?.kind ?? 'stop') ?? 'notFound';
    } catch {
      return 'error';
    }
  });

  /** The last board that loaded for this place, kept on screen while a refresh fails. */
  private readonly shown = linkedSignal<{ place: string; fresh: Fresh }, ShownBoard | null>({
    source: () => ({ place: placeKey(this.selected()), fresh: this.fresh() }),
    computation: ({ place, fresh }, previous) => {
      if (fresh && typeof fresh === 'object') return { place, board: fresh, updated: Date.now() };
      const kept = previous?.value;
      return fresh !== 'notFound' && kept?.place === place ? kept : null;
    },
  });

  protected readonly boardState = computed(
    ():
      | { kind: 'loading' }
      | { kind: 'error'; key: TranslationKey }
      | { kind: 'ready'; board: Board; updated: number; failed: boolean } => {
      const fresh = this.fresh();
      const shown = this.shown();
      if (shown) {
        return {
          kind: 'ready',
          board: shown.board,
          updated: shown.updated,
          failed: fresh === 'error',
        };
      }
      if (fresh === 'notFound') return { kind: 'error', key: 'departures.notFound' };
      return fresh === 'error'
        ? { kind: 'error', key: 'departures.loadError' }
        : { kind: 'loading' };
    },
  );

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

    // Keep the board fresh while it's on screen; a hidden tab doesn't poll.
    const clock = setInterval(() => this.now.set(Date.now()), CLOCK_MS);
    const poll = setInterval(() => {
      if (this.document.visibilityState === 'visible') this.refresh();
    }, REFRESH_MS);
    const onVisible = () => {
      if (this.document.visibilityState !== 'visible') return;
      this.now.set(Date.now());
      if (Date.now() - (this.shown()?.updated ?? 0) >= REFRESH_MS) this.refresh();
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

  protected choose(place: RecentPlace): void {
    this.query.set('');
    this.searchTerm.set('');
    this.remember(place);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: place.kind === 'station' ? { station: place.id } : { stop: place.id },
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
    const next = withRecent(this.recents(), place);
    this.recents.set(next);
    try {
      this.storage?.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      // Storage can be full or blocked; recent stops just won't be remembered.
    }
  }
}
