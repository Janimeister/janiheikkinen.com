import { Component, inject, input, output } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';
import type { toRuns } from '../ascii-raster';
import type { TramState } from '../hfp';
import type { tramTargets } from '../tram-details';
import { PRE_INSET_PX, TRAM_GLYPH_STYLES, TRAM_LINE_STYLES, TRAM_MAP_STYLES } from './tram-styles';

type Rows = ReturnType<typeof toRuns>;

/**
 * The map itself, as three layers of the same size: the static network, the trams on a
 * transparent layer that is the only part redrawn as they move, and an invisible button over
 * each tram.
 */
@Component({
  selector: 'app-tram-canvas',
  template: `
    <pre
      class="tram-map"
      role="img"
      data-testid="tram-map"
      [style.font-size.px]="fontSize()"
      [style.line-height.px]="lineHeight()"
      [attr.aria-label]="label()"
    >@for (row of rows(); track $index) {<span class="map-row">@for (run of row; track $index) {<span [class]="run.cls">{{ run.text }}</span>}</span>}</pre>
    <pre
      class="tram-map tram-overlay"
      aria-hidden="true"
      data-testid="tram-overlay"
      [style.font-size.px]="fontSize()"
      [style.line-height.px]="lineHeight()"
    >@for (row of overlayRows(); track $index) {<span class="map-row">@for (run of row; track $index) {<span [class]="run.cls">{{ run.text }}</span>}</span>}</pre>
    <!-- One invisible button over each tram: the map's click targets and, for keyboards and screen readers, its list of trams. -->
    <nav
      class="tram-targets"
      [attr.aria-label]="i18n.t('trams.tramList')"
      [style.font-size.px]="fontSize()"
      (keydown)="moveFocus($event)"
      data-testid="tram-list"
    >
      @for (group of groups(); track group.line) {
        <ul [attr.aria-label]="i18n.t('trams.line', { line: group.line })">
          @for (target of group.targets; track target.tram.key) {
            <li>
              <button
                type="button"
                class="tram-target"
                [style.left]="'calc(' + preInset + 'px + ' + target.col + 'ch)'"
                [style.top.px]="preInset + target.row * lineHeight()"
                [style.width.ch]="target.width"
                [style.height.px]="lineHeight()"
                [attr.tabindex]="target.tram.key === rovingKey() ? 0 : -1"
                [attr.aria-pressed]="target.tram.key === selectedKey()"
                [attr.aria-label]="tramName(target.tram)"
                [attr.data-tram-key]="target.tram.key"
                (focus)="focusTram.emit(target.tram.key)"
                (click)="selectTram.emit(target.tram.key)"
              ></button>
            </li>
          }
        </ul>
      }
    </nav>
  `,
  styles: [
    TRAM_MAP_STYLES,
    TRAM_LINE_STYLES,
    TRAM_GLYPH_STYLES,
    `
      .map-row {
        display: block;
      }
      .tram-overlay {
        position: absolute;
        inset: 0;
        background: transparent;
        border-color: transparent;
        pointer-events: none;
      }
      .tram-targets {
        position: absolute;
        inset: 0;
        font-family: var(--font-mono);
        pointer-events: none;
      }
      .tram-targets ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .tram-target {
        position: absolute;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
        pointer-events: auto;
      }
      /* A few pixels more to aim at, since a cell can be tiny on a phone. */
      .tram-target::before {
        content: '';
        position: absolute;
        inset: -3px;
      }
      /* Fingers need more: a phone's cells are about 5 × 10 px. */
      @media (pointer: coarse) {
        .tram-target::before {
          inset: -8px;
        }
      }
      .tram-target[aria-pressed='true'] {
        outline: 3px solid var(--color-accent-primary);
        outline-offset: 1px;
      }
      .tram-target:focus-visible {
        outline: 3px solid var(--color-ink);
        outline-offset: 1px;
        box-shadow: 0 0 0 5px var(--color-pop-yellow);
      }
    `,
  ],
  host: { class: 'block relative w-max' },
})
export class TramCanvasComponent {
  protected readonly i18n = inject(LanguageService);

  /** The static map, as rows of same-styled runs of characters. */
  readonly rows = input.required<Rows>();
  /** The trams, on a grid the same size. */
  readonly overlayRows = input.required<Rows>();
  /** A click target for each tram, grouped by line. */
  readonly groups = input.required<ReturnType<typeof tramTargets>>();
  readonly fontSize = input.required<number>();
  readonly lineHeight = input.required<number>();
  /** What the map shows, for screen readers. */
  readonly label = input.required<string>();
  /** The one tram button in the Tab order; the arrow keys move between the rest. */
  readonly rovingKey = input<string | null>(null);
  readonly selectedKey = input<string | null>(null);

  readonly selectTram = output<string>();
  readonly focusTram = output<string>();

  protected readonly preInset = PRE_INSET_PX;

  protected tramName(tram: TramState): string {
    return this.i18n.t('trams.tramName', { line: tram.desi, headsign: tram.headsign });
  }

  /** Arrow keys, Home and End move between the tram buttons in list order. */
  protected moveFocus(event: KeyboardEvent): void {
    const buttons = [
      ...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button'),
    ];
    const index = buttons.indexOf(event.target as HTMLElement);
    if (index < 0) return;
    const next = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: buttons.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    buttons[Math.max(0, Math.min(buttons.length - 1, next))].focus();
  }
}
