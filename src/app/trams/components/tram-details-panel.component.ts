import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';
import type { TramState } from '../hfp';
import { TRAM_LINE_STYLES, TRAM_OPTION_CLASS, tramChipClass } from './tram-styles';

/** The selected tram, in words ready to show. */
export interface TramDetailsView {
  desi: string;
  headsign: string;
  /** The tram's full name, for screen readers. */
  name: string;
  chipClass: string;
  depotRun: boolean;
  speed: string | null;
  schedule: string | null;
  doors: string;
  nextStop: string | null;
  updated: string;
}

/**
 * The panel under the map for the selected tram: where it's going, how fast, how late, and
 * which other trams share its map cell.
 */
@Component({
  selector: 'app-tram-details-panel',
  imports: [NgTemplateOutlet],
  template: `
    @if (details(); as d) {
      <div class="flex items-start gap-3">
        <span class="legend-chip" [class]="d.chipClass" aria-hidden="true">{{ d.desi }}</span>
        <h2 class="text-lg font-semibold leading-tight" [attr.aria-label]="d.name">
          {{ d.headsign }}
        </h2>
        @if (d.depotRun) {
          <span
            class="text-xs font-semibold uppercase tracking-wider border-2 border-ink px-1.5 py-0.5"
            >{{ i18n.t('trams.depotRun') }}</span
          >
        }
        <ng-container [ngTemplateOutlet]="closeButton" />
      </div>
      <dl class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mt-3 text-sm">
        <div>
          <dt class="text-text-secondary">{{ i18n.t('trams.speed') }}</dt>
          <dd class="font-semibold" data-testid="tram-speed">{{ d.speed ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-text-secondary">{{ i18n.t('trams.schedule') }}</dt>
          <dd class="font-semibold" data-testid="tram-schedule">
            {{ d.schedule ?? '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-text-secondary">{{ i18n.t('trams.doors') }}</dt>
          <dd class="font-semibold">{{ d.doors }}</dd>
        </div>
        <div class="col-span-2 sm:col-span-2">
          <dt class="text-text-secondary">{{ i18n.t('trams.nextStop') }}</dt>
          <dd class="font-semibold" data-testid="tram-next-stop">
            {{ d.nextStop ?? '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-text-secondary">{{ i18n.t('trams.updated') }}</dt>
          <dd class="font-semibold" data-testid="tram-updated">{{ d.updated }}</dd>
        </div>
      </dl>
      @if (companions().length > 0) {
        <div class="flex flex-wrap items-center gap-2 mt-3 text-sm">
          <span class="text-text-secondary">{{ i18n.t('trams.alsoHere') }}</span>
          @for (other of companions(); track other.key) {
            <button
              type="button"
              (click)="selectTram.emit(other.key)"
              [attr.aria-label]="tramName(other)"
              class="font-mono {{ optionBase }} {{ chipClass(other) }}"
            >
              {{ other.desi }}
            </button>
          }
        </div>
      }
    } @else {
      <div class="flex items-start gap-3">
        <p class="text-text-secondary">{{ i18n.t('trams.tramGone') }}</p>
        <ng-container [ngTemplateOutlet]="closeButton" />
      </div>
    }

    <ng-template #closeButton>
      <button
        type="button"
        (click)="closed.emit()"
        [attr.aria-label]="i18n.t('trams.closeDetails')"
        class="ml-auto shrink-0 bg-bg-card {{ optionBase }}"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </ng-template>
  `,
  styles: [TRAM_LINE_STYLES],
  host: { class: 'block' },
})
export class TramDetailsPanelComponent {
  protected readonly i18n = inject(LanguageService);

  /** null once the selected tram has left the map. */
  readonly details = input.required<TramDetailsView | null>();
  /** Other trams under the same `*` as the selected one. */
  readonly companions = input<readonly TramState[]>([]);
  readonly selectTram = output<string>();
  readonly closed = output<void>();

  protected readonly optionBase = TRAM_OPTION_CLASS;
  protected readonly chipClass = tramChipClass;

  protected tramName(tram: TramState): string {
    return this.i18n.t('trams.tramName', { line: tram.desi, headsign: tram.headsign });
  }
}
