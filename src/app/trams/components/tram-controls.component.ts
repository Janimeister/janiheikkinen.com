import { Component, inject, input, model, output } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';
import { lineClass } from '../ascii-raster';
import type { PresetId } from '../grid';
import { GLYPH_OPTIONS, PRESET_OPTIONS, type GlyphMode } from '../view-prefs';
import { TRAM_LINE_STYLES, TRAM_OPTION_CLASS } from './tram-styles';

const NO_LINES: ReadonlySet<string> = new Set();

/**
 * The settings above the map: which part of the network to show, how to draw it, how trams
 * move, and which lines to follow.
 */
@Component({
  selector: 'app-tram-controls',
  template: `
    <!-- Each group wraps as a unit, so a label never ends a line on its own. -->
    <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="control-label">{{ i18n.t('trams.view') }}</span>
        @for (option of presetOptions; track option.id) {
          <button
            type="button"
            (click)="presetChange.emit(option.id)"
            [class]="optionClass(presetId() === option.id)"
            [attr.aria-pressed]="presetId() === option.id"
          >
            {{ i18n.t(option.labelKey) }}
          </button>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="control-label">{{ i18n.t('trams.glyphs') }}</span>
        @for (option of glyphOptions; track option.id) {
          <button
            type="button"
            (click)="glyphModeChange.emit(option.id)"
            [class]="optionClass(glyphMode() === option.id)"
            [attr.aria-pressed]="glyphMode() === option.id"
          >
            {{ i18n.t(option.labelKey) }}
          </button>
        }
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span class="control-label">{{ i18n.t('trams.motion') }}</span>
        <label class="toggle-label">
          <input
            type="checkbox"
            class="control-toggle"
            [checked]="smooth()"
            (change)="smoothChange.emit(checked($event))"
            data-testid="tram-smooth"
          />
          {{ i18n.t('trams.smooth') }}
        </label>
        <label class="toggle-label">
          <input
            type="checkbox"
            class="control-toggle"
            [checked]="trails()"
            (change)="trailsChange.emit(checked($event))"
            data-testid="tram-trails"
          />
          {{ i18n.t('trams.trails') }}
        </label>
      </div>
    </div>
    @if (smooth()) {
      <p class="text-sm text-text-secondary mt-2" data-testid="tram-smooth-note">
        {{ i18n.t('trams.smoothNote') }}
      </p>
    }
    @if (lineChoices().length > 0) {
      <div class="flex flex-wrap items-center gap-2 mt-4" data-testid="tram-line-filter">
        <span class="control-label">{{ i18n.t('trams.lines') }}</span>
        <button
          type="button"
          (click)="lineSelection.set(null)"
          [class]="optionClass(lineSelection() === null)"
          [attr.aria-pressed]="lineSelection() === null"
        >
          {{ i18n.t('trams.allLines') }}
        </button>
        <button
          type="button"
          (click)="lineSelection.set(noLines)"
          [class]="optionClass(lineSelection()?.size === 0)"
          [attr.aria-pressed]="lineSelection()?.size === 0"
        >
          {{ i18n.t('trams.noLines') }}
        </button>
        @for (line of lineChoices(); track line) {
          <button
            type="button"
            (click)="toggleLine(line)"
            [class]="lineChipClass(line)"
            [attr.aria-pressed]="follows(line)"
            [attr.aria-label]="i18n.t('trams.line', { line })"
          >
            {{ line }}
          </button>
        }
        <label class="sm:ml-auto toggle-label">
          <input
            type="checkbox"
            class="control-toggle"
            [checked]="showDepotRuns()"
            (change)="showDepotRuns.set(checked($event))"
          />
          {{ i18n.t('trams.showDepotRuns') }}
        </label>
      </div>
      @if (lineSelection() !== null) {
        <p class="text-sm text-text-secondary mt-2">{{ i18n.t('trams.filterNote') }}</p>
      }
    }
  `,
  styles: [
    TRAM_LINE_STYLES,
    `
      .control-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-right: 0.25rem;
      }
      @media (min-width: 640px) {
        .control-label {
          font-size: 0.875rem;
        }
      }
      .toggle-label {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--color-ink);
        cursor: pointer;
      }
      .control-toggle {
        width: 1.125rem;
        height: 1.125rem;
        accent-color: var(--color-ink);
      }
    `,
  ],
  host: { class: 'block' },
})
export class TramControlsComponent {
  protected readonly i18n = inject(LanguageService);

  readonly presetId = input.required<PresetId>();
  readonly glyphMode = input.required<GlyphMode>();
  readonly smooth = input.required<boolean>();
  readonly trails = input.required<boolean>();
  /** Every line on the map, in the order to list them. */
  readonly lineChoices = input.required<readonly string[]>();
  /** The lines to show, or null for all of them, depot runs included. */
  readonly lineSelection = model<ReadonlySet<string> | null>(null);
  readonly showDepotRuns = model(true);

  readonly presetChange = output<PresetId>();
  readonly glyphModeChange = output<GlyphMode>();
  readonly smoothChange = output<boolean>();
  readonly trailsChange = output<boolean>();

  protected readonly presetOptions = PRESET_OPTIONS;
  protected readonly glyphOptions = GLYPH_OPTIONS;
  protected readonly noLines = NO_LINES;

  protected optionClass(active: boolean): string {
    return `${TRAM_OPTION_CLASS} ${active ? 'bg-pop-yellow' : 'bg-bg-card'}`;
  }

  protected lineChipClass(line: string): string {
    return `${TRAM_OPTION_CLASS} min-w-8 sm:min-w-10 font-mono ${this.follows(line) ? lineClass(line) : 'bg-bg-card line-through'}`;
  }

  protected follows(line: string): boolean {
    return this.lineSelection()?.has(line) ?? true;
  }

  /** Shows or hides one line. Once every line is on again, that's "all", depot runs included. */
  protected toggleLine(line: string): void {
    const all = this.lineChoices();
    const next = new Set(this.lineSelection() ?? all);
    if (!next.delete(line)) next.add(line);
    this.lineSelection.set(all.every((l) => next.has(l)) ? null : next);
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }
}
