import { Component, inject, input, model, output } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';
import { SEARCH_MAX_LENGTH, type Mode, type Place } from '../digitransit';
import { MODE_CHIP_STYLES, MODE_FILLS, MODE_KEYS, OPTION_CLASS } from '../modes';
import type { RecentPlace } from '../recent-places';

/** Busy places to try, searched by name so no stop id goes stale. */
const SUGGESTIONS = ['Rautatientori', 'Kamppi', 'Hakaniemi', 'Pasila', 'Kauppatori'];

/**
 * The "Find a stop" card: the search field with its results, or, while nothing is being searched
 * for, the stops opened recently (suggestions on a first visit). The page does the searching.
 */
@Component({
  selector: 'app-stop-search',
  template: `
    <h2 class="text-lg font-semibold mb-3">{{ i18n.t('departures.findStop') }}</h2>
    <!-- Not a form: Enter must never submit the page, even before the app has started. -->
    <div class="flex gap-2" role="search">
      <input
        type="search"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
        (keydown.enter)="pickFirst()"
        [attr.placeholder]="i18n.t('departures.searchPlaceholder')"
        [attr.aria-label]="i18n.t('departures.searchPlaceholder')"
        aria-describedby="departures-search-help"
        autocomplete="off"
        [attr.maxlength]="searchMaxLength"
        class="flex-1 min-w-0 bg-bg-card border-2 border-ink px-4 py-2 text-sm text-text-primary placeholder-text-secondary/70 shadow-brutal-sm"
        data-testid="departures-search"
      />
    </div>
    <p id="departures-search-help" class="text-xs text-text-secondary mt-2">
      {{ i18n.t('departures.searchHelp') }}
    </p>

    @if (searchTerm()) {
      <div class="mt-4" aria-live="polite">
        @if (searching()) {
          <p class="text-sm text-text-secondary">{{ i18n.t('departures.searching') }}</p>
        } @else if (results(); as results) {
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
                    (click)="chosen.emit(place)"
                  >
                    <span class="mode-chip shrink-0" [style.background]="modeFill(place.mode)">{{
                      modeLabel(place.mode)
                    }}</span>
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
            <button type="button" [class]="optionClass" (click)="chosen.emit(recent)">
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
  `,
  styles: [
    MODE_CHIP_STYLES,
    `
      .control-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-right: 0.25rem;
      }
    `,
  ],
  host: { class: 'block' },
})
export class StopSearchComponent {
  protected readonly i18n = inject(LanguageService);

  /** What is typed in the field. */
  readonly query = model('');
  /** The query being searched for; empty until typing pauses on something long enough. */
  readonly searchTerm = input.required<string>();
  readonly searching = input(false);
  /** The places found, or null before any result has arrived. */
  readonly results = input<Place[] | 'error' | null>(null);
  readonly recents = input<readonly RecentPlace[]>([]);
  /** A place picked from the results or the recent stops. */
  readonly chosen = output<RecentPlace>();

  protected readonly optionClass = OPTION_CLASS;
  protected readonly suggestions = SUGGESTIONS;
  protected readonly searchMaxLength = SEARCH_MAX_LENGTH;

  /** Enter in the search field picks the first result. */
  protected pickFirst(): void {
    const results = this.results();
    if (Array.isArray(results) && results.length) this.chosen.emit(results[0]);
  }

  protected modeLabel(mode: Mode): string {
    return this.i18n.t(MODE_KEYS[mode]);
  }

  protected modeFill(mode: Mode): string {
    return MODE_FILLS[mode];
  }

  protected linesPreview(lines: string[]): string {
    const shown = lines.slice(0, 8).join(', ');
    return lines.length > 8 ? `${shown} …` : shown;
  }
}
