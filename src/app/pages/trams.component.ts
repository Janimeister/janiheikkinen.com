import { Component, computed, signal, inject, afterNextRender, viewChild, ElementRef, DestroyRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';
import { LanguageService } from '../i18n/language.service';
import type { TranslationKey } from '../i18n/translations';
import { createGrid, defaultPreset, GRID_PRESETS, type PresetId } from '../trams/grid';
import { ASCII_GLYPHS, lineClass, renderBaseMap, toRuns, UNICODE_GLYPHS } from '../trams/ascii-raster';
import type { TramMapData } from '../trams/tram-map.model';

type GlyphMode = 'ascii' | 'unicode';

const PRESET_OPTIONS: readonly { id: PresetId; labelKey: TranslationKey }[] = [
  { id: 'centre', labelKey: 'trams.presetCentre' },
  { id: 'network', labelKey: 'trams.presetNetwork' },
  { id: 'mobile', labelKey: 'trams.presetMobile' },
];

const GLYPH_OPTIONS: readonly { id: GlyphMode; labelKey: TranslationKey }[] = [
  { id: 'ascii', labelKey: 'trams.glyphsAscii' },
  { id: 'unicode', labelKey: 'trams.glyphsUnicode' },
];

/** Padding plus border of the map `<pre>`, which the characters can't use. */
const PRE_CHROME_PX = 2 * 12 + 2 * 2;
const MIN_FONT_PX = 8;
const MAX_FONT_PX = 16;
const LOADING_DOTS = Array.from({ length: 14 }, (_, row) => (row % 2 ? ' .' : '. ').repeat(36)).join('\n');

const OPTION_CLASS = 'px-3 py-1.5 text-sm font-semibold text-ink border-2 border-ink shadow-brutal-sm brutal-hover brutal-press transition-transform';

@Component({
  selector: 'app-trams-page',
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink],
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20 overflow-hidden">
      <app-floating-orb class="hidden md:block absolute top-[12%] right-[10%] z-[1]" delay="0s" [size]="60" shape="circle" color="lime" rotate="6deg" />
      <app-floating-orb class="hidden md:block absolute bottom-[20%] left-[6%] z-[1]" delay="2.5s" [size]="50" shape="square" color="sky" rotate="-4deg" />

      <div class="relative z-10 max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8 animate-fade-slide-up">
          <a routerLink="/" class="text-sm font-semibold text-ink hover:text-accent-light transition-transform mb-4 inline-flex items-center gap-2 border-2 border-ink bg-bg-card px-3 py-2 shadow-brutal-sm brutal-hover brutal-press">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            {{ i18n.t('common.backToHome') }}
          </a>
          <h1 class="text-4xl md:text-5xl font-bold mt-3 leading-tight">
            <span class="marker marker-lime">{{ i18n.t('trams.title') }}</span>
          </h1>
          <p class="text-text-secondary mt-3 text-lg">{{ i18n.t('trams.subtitle') }}</p>
        </div>

        <!-- Controls -->
        <div class="mb-6 animate-fade-slide-up stagger-1">
          <app-glow-card>
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-sm font-semibold text-text-secondary mr-1 uppercase tracking-wider">{{ i18n.t('trams.view') }}</span>
              @for (option of presetOptions; track option.id) {
                <button type="button" (click)="chosenPreset.set(option.id)"
                  [class]="optionClass(presetId() === option.id)"
                  [attr.aria-pressed]="presetId() === option.id">
                  {{ i18n.t(option.labelKey) }}
                </button>
              }
              <span class="text-sm font-semibold text-text-secondary mr-1 sm:ml-auto uppercase tracking-wider">{{ i18n.t('trams.glyphs') }}</span>
              @for (option of glyphOptions; track option.id) {
                <button type="button" (click)="glyphMode.set(option.id)"
                  [class]="optionClass(glyphMode() === option.id)"
                  [attr.aria-pressed]="glyphMode() === option.id">
                  {{ i18n.t(option.labelKey) }}
                </button>
              }
            </div>
          </app-glow-card>
        </div>

        <!-- Map -->
        <div class="mb-6 animate-fade-slide-up stagger-2">
          <app-glow-card>
            <div #mapArea>
              @if (mapData.error()) {
                <p class="text-red-400">{{ i18n.t('trams.loadError') }}</p>
              } @else if (baseMap(); as map) {
                <div class="overflow-x-auto" tabindex="0" role="region" [attr.aria-label]="i18n.t('trams.mapRegion')" data-testid="tram-map-region">
                  <pre class="tram-map" role="img" data-testid="tram-map"
                    [attr.aria-label]="i18n.t('trams.mapLabel', { lines: map.lines.length, stops: map.stopCount })"
                    [style.font-size.px]="fontSize()" [style.line-height.px]="lineHeight()">@for (row of rows(); track $index) {<span class="map-row">@for (run of row; track $index) {<span [class]="run.cls">{{ run.text }}</span>}</span>}</pre>
                </div>
              } @else {
                <p role="status" class="sr-only">{{ i18n.t('trams.loading') }}</p>
                <pre class="tram-map animate-pulse text-text-secondary" aria-hidden="true">{{ loadingDots }}</pre>
              }
            </div>
          </app-glow-card>
        </div>

        <!-- Legend -->
        @if (baseMap(); as map) {
          <div class="mb-6 animate-fade-slide-up stagger-3">
            <app-glow-card>
              <h2 class="text-lg font-semibold mb-3">{{ i18n.t('trams.legend') }}</h2>
              <ul class="flex flex-wrap gap-2 font-mono text-sm">
                @for (desi of map.lines; track desi) {
                  <li class="legend-chip" [class]="lineClass(desi)" [attr.aria-label]="i18n.t('trams.line', { line: desi })">{{ desi }}</li>
                }
              </ul>
              <ul class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-text-secondary">
                <li><span class="legend-glyph line-shared" aria-hidden="true">{{ glyphs().track.h }}</span> {{ i18n.t('trams.legendShared') }}</li>
                <li><span class="legend-glyph stop" aria-hidden="true">{{ glyphs().stop }}</span> {{ i18n.t('trams.legendStop') }}</li>
                <li><span class="legend-glyph sea" aria-hidden="true">{{ glyphs().sea[0] }}</span> {{ i18n.t('trams.legendSea') }}</li>
                <li><span class="legend-glyph park" aria-hidden="true">{{ glyphs().park }}</span> {{ i18n.t('trams.legendPark') }}</li>
              </ul>
            </app-glow-card>
          </div>
        }

        <!-- Notes and attribution -->
        <div class="animate-fade-slide-up stagger-4 text-sm text-text-secondary space-y-2">
          <p>{{ i18n.t('trams.liveSoon') }}
            @if (mapData.hasValue()) { {{ i18n.t('trams.dataVersion', { version: mapData.value().gtfsVersion }) }} }
          </p>
          <p>
            {{ i18n.t('trams.attributionHsl') }}:
            <a href="https://www.hsl.fi/en/hsl/open-data" target="_blank" rel="noopener noreferrer" class="text-accent-light underline">© HSL / Digitransit</a>
            (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" class="text-accent-light underline">CC BY 4.0</a>).
            {{ i18n.t('trams.attributionOsm') }}:
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" class="text-accent-light underline">© {{ i18n.t('trams.osmContributors') }}</a>
            (<a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer" class="text-accent-light underline">ODbL</a>).
          </p>
        </div>
      </div>

      <span #probe class="tram-probe" aria-hidden="true">MMMMMMMMMM</span>
    </section>
  `,
  styles: `
    .tram-map {
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 14px;
      color: var(--color-ink);
      background: var(--color-bg-card);
      border: 2px solid var(--color-ink);
      padding: 12px;
      margin: 0;
      width: max-content;
      white-space: pre;
    }
    .map-row { display: block; }
    .tram-probe {
      position: absolute;
      visibility: hidden;
      font-family: var(--font-mono);
      font-size: 100px;
      white-space: pre;
      top: 0;
      left: 0;
    }
    .sea { color: var(--color-data-blue); }
    .park { color: var(--color-data-green); }
    .stop, .label, .line-shared { font-weight: 700; }
    .legend-chip {
      min-width: 2.25rem;
      padding: 0.125rem 0.5rem;
      text-align: center;
      font-weight: 700;
      border: 2px solid var(--color-ink);
      color: var(--color-ink);
    }
    .legend-glyph {
      display: inline-block;
      width: 1.5rem;
      text-align: center;
      font-family: var(--font-mono);
      color: var(--color-ink);
    }
    .legend-glyph.sea { color: var(--color-data-blue); }
    .legend-glyph.park { color: var(--color-data-green); }
    .line-1 { background: var(--color-line-1); }
    .line-2 { background: var(--color-line-2); }
    .line-3 { background: var(--color-line-3); }
    .line-4 { background: var(--color-line-4); }
    .line-5 { background: var(--color-line-5); }
    .line-6 { background: var(--color-line-6); }
    .line-7 { background: var(--color-line-7); }
    .line-8 { background: var(--color-line-8); }
    .line-9 { background: var(--color-line-9); }
    .line-10 { background: var(--color-line-10); }
    .line-11 { background: var(--color-line-11); }
    .line-12 { background: var(--color-line-12); }
    .line-13 { background: var(--color-line-13); }
    .line-h { background: var(--color-line-h); }
  `,
})
export class TramsPageComponent {
  protected readonly i18n = inject(LanguageService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mapArea = viewChild.required<ElementRef<HTMLElement>>('mapArea');
  private readonly probe = viewChild.required<ElementRef<HTMLElement>>('probe');

  protected readonly presetOptions = PRESET_OPTIONS;
  protected readonly glyphOptions = GLYPH_OPTIONS;
  protected readonly loadingDots = LOADING_DOTS;
  protected readonly lineClass = lineClass;

  readonly mapData = httpResource<TramMapData>(() =>
    new URL('data/helsinki-trams.json', this.document.baseURI).href,
  );

  /** null until the visitor picks a view; then the default follows the screen width. */
  readonly chosenPreset = signal<PresetId | null>(null);
  readonly glyphMode = signal<GlyphMode>('ascii');
  private readonly containerWidth = signal<number | null>(null);
  /** Character width divided by font size, measured once the web font has loaded. */
  private readonly charRatio = signal(0.6);

  readonly presetId = computed(() => this.chosenPreset() ?? defaultPreset(this.containerWidth() ?? 1024));
  readonly grid = computed(() => createGrid(GRID_PRESETS[this.presetId()]));
  readonly glyphs = computed(() => (this.glyphMode() === 'unicode' ? UNICODE_GLYPHS : ASCII_GLYPHS));

  // The static layers are rendered once per data, preset and glyph set, never per frame.
  readonly baseMap = computed(() =>
    this.mapData.hasValue() ? renderBaseMap(this.mapData.value(), this.grid(), this.glyphs()) : null,
  );
  readonly rows = computed(() => toRuns(this.baseMap()?.cells ?? []));

  /** Fit the grid to the card; below the minimum size the map scrolls sideways instead. */
  readonly fontSize = computed(() => {
    const available = (this.containerWidth() ?? 960) - PRE_CHROME_PX;
    const fitted = available / (this.grid().cols * this.charRatio());
    return Math.round(Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, fitted)) * 100) / 100;
  });
  /** A cell is exactly twice as tall as it is wide, like 0.001° of latitude vs. longitude. */
  readonly lineHeight = computed(() => Math.round(this.fontSize() * this.charRatio() * 2 * 100) / 100);

  constructor() {
    afterNextRender(() => {
      this.measureCharacter();
      this.document.fonts?.ready.then(() => this.measureCharacter());
      const area = this.mapArea().nativeElement;
      this.containerWidth.set(area.clientWidth);
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => this.containerWidth.set(entry.contentRect.width));
      observer.observe(area);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected optionClass(active: boolean): string {
    return `${OPTION_CLASS} ${active ? 'bg-pop-yellow' : 'bg-bg-card'}`;
  }

  private measureCharacter(): void {
    const probe = this.probe().nativeElement;
    const ratio = probe.getBoundingClientRect().width / (probe.textContent!.length * 100);
    if (ratio > 0) this.charRatio.set(ratio);
  }
}
