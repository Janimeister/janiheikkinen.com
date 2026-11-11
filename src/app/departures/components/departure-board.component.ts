import { Component, computed, inject, input, output } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';
import { countdown, upcoming, type Board, type Departure, type Mode } from '../digitransit';
import { MODE_CHIP_STYLES, MODE_FILLS, MODE_KEYS, OPTION_CLASS } from '../modes';

/**
 * A stop's departure board: its name, when the data arrived, and the next departures as a
 * station-style table. The page loads and refreshes the data; this draws it.
 */
@Component({
  selector: 'app-departure-board',
  template: `
    <div class="board-frame" data-testid="departure-board">
      <div class="flex flex-wrap items-start gap-x-4 gap-y-2 mb-4">
        <div class="min-w-0">
          <h2 class="text-2xl md:text-3xl font-bold">{{ board().place.name }}</h2>
          <p class="text-sm text-text-secondary mt-1">
            <span class="mode-chip mr-1" [style.background]="modeFill(board().place.mode)">{{
              modeLabel(board().place.mode)
            }}</span>
            @if (board().place.code) {
              <span class="font-mono">{{ board().place.code }}</span>
            }
            @if (board().place.platform; as platform) {
              · {{ i18n.t('departures.platformShort', { platform }) }}
            }
            @if (board().place.description) {
              · {{ board().place.description }}
            }
          </p>
        </div>
        <div class="sm:ml-auto flex items-center gap-2">
          <span
            class="text-xs"
            [class]="failed() ? 'text-red-400' : 'text-text-secondary'"
            data-testid="departures-updated"
            >{{
              i18n.t(failed() ? 'departures.refreshFailed' : 'departures.updated', {
                time: clock(updated(), true),
              })
            }}</span
          >
          <button
            type="button"
            [class]="optionClass"
            (click)="refresh.emit()"
            [disabled]="refreshing()"
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
                      <span class="sr-only">{{ modeLabel(row.mode) }} </span>{{ row.line }}
                    </span>
                  </td>
                  <td class="headsign">
                    <span class="headsign-text">{{ row.headsign }}</span>
                    @if (row.cancelled) {
                      <span class="sr-only">, </span>
                      <span class="tag tag-cancelled">{{ i18n.t('departures.cancelled') }}</span>
                    } @else if (row.late) {
                      <span class="sr-only">, </span>
                      <span class="tag tag-late"
                        >{{ row.late
                        }}<span class="sr-only"> {{ i18n.t('departures.late') }}</span></span
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
                        ><span class="sr-only">{{ i18n.t('departures.realtime') }} </span>
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
  `,
  styles: [
    MODE_CHIP_STYLES,
    `
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
  ],
  host: { class: 'block' },
})
export class DepartureBoardComponent {
  protected readonly i18n = inject(LanguageService);

  readonly board = input.required<Board>();
  /** The current time in ms, ticking from the page so countdowns stay right. */
  readonly now = input.required<number>();
  /** When the board's data arrived. */
  readonly updated = input.required<number>();
  /** Whether the latest refresh failed, leaving older data on screen. */
  readonly failed = input(false);
  readonly refreshing = input(false);
  readonly refresh = output<void>();

  protected readonly optionClass = OPTION_CLASS;

  private readonly departures = computed(() => upcoming(this.board().departures, this.now()));

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

  protected clock(time: number, seconds = false): string {
    return new Date(time).toLocaleTimeString(this.i18n.locale(), {
      hour: '2-digit',
      minute: '2-digit',
      ...(seconds ? { second: '2-digit' } : {}),
    });
  }
}
