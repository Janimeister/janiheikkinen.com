import { Component, inject, input } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';
import { lineClass, type ASCII_GLYPHS } from '../ascii-raster';
import { CLUSTER_GLYPH, TRAIL_GLYPH } from '../tram-overlay';
import { TRAM_GLYPH_STYLES, TRAM_LINE_STYLES } from './tram-styles';

/** What the map's colours and characters mean. */
@Component({
  selector: 'app-tram-legend',
  template: `
    <h2 class="text-lg font-semibold mb-3">{{ i18n.t('trams.legend') }}</h2>
    <ul class="flex flex-wrap gap-2 font-mono text-sm">
      @for (desi of lines(); track desi) {
        <li
          class="legend-chip"
          [class]="lineClass(desi)"
          [attr.aria-label]="i18n.t('trams.line', { line: desi })"
        >
          {{ desi }}
        </li>
      }
    </ul>
    <ul class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-text-secondary">
      <li>
        <span class="legend-glyph line-shared" aria-hidden="true">{{ glyphs().track.h }}</span>
        {{ i18n.t('trams.legendShared') }}
      </li>
      <li>
        <span class="legend-glyph stop" aria-hidden="true">{{ glyphs().stop }}</span>
        {{ i18n.t('trams.legendStop') }}
      </li>
      <li>
        <span class="legend-glyph sea" aria-hidden="true">{{ glyphs().sea[0] }}</span>
        {{ i18n.t('trams.legendSea') }}
      </li>
      <li>
        <span class="legend-glyph park" aria-hidden="true">{{ glyphs().park }}</span>
        {{ i18n.t('trams.legendPark') }}
      </li>
      <li>
        <span class="legend-glyph tram line-4" aria-hidden="true">4</span>
        {{ i18n.t('trams.legendTram') }}
      </li>
      <li>
        <span class="legend-glyph tram tram-dim" aria-hidden="true">4</span>
        {{ i18n.t(smooth() ? 'trams.legendDimmedSmooth' : 'trams.legendDimmed') }}
      </li>
      <li>
        <span class="legend-glyph tram tram-cluster" aria-hidden="true">{{ clusterGlyph }}</span>
        {{ i18n.t('trams.legendCluster') }}
      </li>
      @if (trails()) {
        <li>
          <span class="legend-glyph trail line-4" aria-hidden="true">{{ trailGlyph }}</span>
          {{ i18n.t('trams.legendTrail') }}
        </li>
      }
    </ul>
  `,
  styles: [
    TRAM_LINE_STYLES,
    TRAM_GLYPH_STYLES,
    `
      .legend-glyph {
        display: inline-block;
        width: 1.5rem;
        text-align: center;
        font-family: var(--font-mono);
        color: var(--color-ink);
      }
      .legend-glyph.sea {
        color: var(--color-data-blue);
      }
      .legend-glyph.park {
        color: var(--color-data-green);
      }
    `,
  ],
  host: { class: 'block' },
})
export class TramLegendComponent {
  protected readonly i18n = inject(LanguageService);

  /** The lines drawn on the map. */
  readonly lines = input.required<readonly string[]>();
  /** The character set the map is drawn with. */
  readonly glyphs = input.required<typeof ASCII_GLYPHS>();
  readonly smooth = input.required<boolean>();
  readonly trails = input.required<boolean>();

  protected readonly lineClass = lineClass;
  protected readonly clusterGlyph = CLUSTER_GLYPH;
  protected readonly trailGlyph = TRAIL_GLYPH;
}
