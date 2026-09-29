import {
  Component,
  computed,
  signal,
  inject,
  afterNextRender,
  viewChild,
  ElementRef,
  DestroyRef,
  effect,
  Injector,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';
import { LanguageService } from '../i18n/language.service';
import type { TranslationKey } from '../i18n/translations';
import { createGrid, defaultPreset, GRID_PRESETS, type PresetId } from '../trams/grid';
import { ASCII_GLYPHS, lineClass, renderBaseMap, toRuns, UNICODE_GLYPHS } from '../trams/ascii-raster';
import type { TramMapData } from '../trams/tram-map.model';
import { CLUSTER_GLYPH, renderTramOverlay } from '../trams/tram-overlay';
import { isStale, TramFeedService, type FeedStatus } from '../trams/tram-feed.service';

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
/** Full screen has room for bigger text, e.g. on a tablet or a desktop monitor. */
const MAX_FULLSCREEN_FONT_PX = 24;
/** Full-screen zoom, as multiples of the size that fits the screen. */
const ZOOM_STEPS = [1, 1.5, 2, 3] as const;

const STATUS: Readonly<Record<FeedStatus, { labelKey: TranslationKey; cls: string }>> = {
  connecting: { labelKey: 'trams.statusConnecting', cls: 'bg-pop-yellow' },
  live: { labelKey: 'trams.statusLive', cls: 'bg-pop-lime' },
  reconnecting: { labelKey: 'trams.statusReconnecting', cls: 'bg-pop-orange' },
  offline: { labelKey: 'trams.statusOffline', cls: 'bg-bg-card' },
};

type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> };
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
const LOADING_DOTS = Array.from({ length: 14 }, (_, row) => (row % 2 ? ' .' : '. ').repeat(36)).join('\n');

const OPTION_CLASS = 'px-3 py-1.5 text-sm font-semibold text-ink border-2 border-ink shadow-brutal-sm brutal-hover brutal-press transition-transform';

@Component({
  selector: 'app-trams-page',
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink, NgTemplateOutlet],
  providers: [TramFeedService],
  host: { '(document:keydown.escape)': 'exitFullscreen()' },
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
              @if (fullscreen()) {
                <p class="text-text-secondary">{{ i18n.t('trams.fullscreenOpen') }}</p>
              } @else {
                <ng-container [ngTemplateOutlet]="toolbar" />
                <ng-container [ngTemplateOutlet]="mapView" />
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
                <li><span class="legend-glyph tram line-4" aria-hidden="true">4</span> {{ i18n.t('trams.legendTram') }}</li>
                <li><span class="legend-glyph tram tram-dim" aria-hidden="true">4</span> {{ i18n.t('trams.legendDimmed') }}</li>
                <li><span class="legend-glyph tram tram-cluster" aria-hidden="true">{{ clusterGlyph }}</span> {{ i18n.t('trams.legendCluster') }}</li>
              </ul>
            </app-glow-card>
          </div>
        }

        <!-- Notes and attribution -->
        <div class="animate-fade-slide-up stagger-4 text-sm text-text-secondary space-y-2">
          <p>{{ i18n.t('trams.liveNote') }}
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

      @if (fullscreen()) {
        <div #dialog class="tram-fullscreen" role="dialog" aria-modal="true" [attr.aria-label]="i18n.t('trams.fullscreenLabel')" data-testid="tram-fullscreen"
          (keydown)="trapFocus($event, dialog)">
          <ng-container [ngTemplateOutlet]="toolbar" />
          <div #fullscreenArea class="flex-1 min-h-0">
            <ng-container [ngTemplateOutlet]="mapView" />
          </div>
        </div>
      }

      <span #probe class="tram-probe" aria-hidden="true">MMMMMMMMMM</span>
    </section>

    <ng-template #toolbar>
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <span class="status-badge" [class]="status().cls" role="status" data-testid="tram-status">
          <span class="status-dot" [class.animate-pulse]="feed.status() !== 'live'" aria-hidden="true"></span>
          {{ i18n.t(status().labelKey) }}
        </span>
        <span class="text-sm font-semibold text-text-secondary" data-testid="tram-count">{{ i18n.t('trams.tramCount', { count: feed.vehicles().size }) }}</span>
        @if (fullscreen()) {
          <span class="ml-auto inline-flex gap-2">
            <button type="button" (click)="zoomBy(-1)" [disabled]="zoomStep() === 0" [attr.aria-label]="i18n.t('trams.zoomOut')" class="zoom-button {{ optionBase }}">−</button>
            <button type="button" (click)="zoomBy(1)" [disabled]="zoomStep() === zoomSteps.length - 1" [attr.aria-label]="i18n.t('trams.zoomIn')" class="zoom-button {{ optionBase }}">+</button>
          </span>
          <button #exitButton type="button" (click)="exitFullscreen()" class="inline-flex items-center gap-2 bg-pop-yellow {{ optionBase }}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18"/></svg>
            {{ i18n.t('trams.exitFullscreen') }}
          </button>
        } @else {
          <button #enterButton type="button" (click)="enterFullscreen()" class="ml-auto inline-flex items-center gap-2 bg-bg-card {{ optionBase }}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
            {{ i18n.t('trams.fullscreen') }}
          </button>
        }
      </div>
    </ng-template>

    <ng-template #mapView>
      @if (mapData.error()) {
        <p class="text-red-400">{{ i18n.t('trams.loadError') }}</p>
      } @else if (baseMap(); as map) {
        <div [class]="fullscreen() ? 'overflow-auto h-full' : 'overflow-x-auto'" tabindex="0" role="region" [attr.aria-label]="i18n.t('trams.mapRegion')" data-testid="tram-map-region">
          <div class="relative w-max" [class.mx-auto]="fullscreen()">
            <pre class="tram-map" role="img" data-testid="tram-map" [style.font-size.px]="fontSize()" [style.line-height.px]="lineHeight()"
              [attr.aria-label]="i18n.t('trams.mapLabel', { lines: map.lines.length, stops: map.stopCount }) + ' ' + i18n.t('trams.mapTrams', { count: overlay()?.count ?? 0 })">@for (row of rows(); track $index) {<span class="map-row">@for (run of row; track $index) {<span [class]="run.cls">{{ run.text }}</span>}</span>}</pre>
            <pre class="tram-map tram-overlay" aria-hidden="true" data-testid="tram-overlay" [style.font-size.px]="fontSize()" [style.line-height.px]="lineHeight()">@for (row of overlayRows(); track $index) {<span class="map-row">@for (run of row; track $index) {<span [class]="run.cls">{{ run.text }}</span>}</span>}</pre>
          </div>
        </div>
      } @else {
        <p role="status" class="sr-only">{{ i18n.t('trams.loading') }}</p>
        <pre class="tram-map animate-pulse text-text-secondary" aria-hidden="true">{{ loadingDots }}</pre>
      }
    </ng-template>
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
    .line-1 { --line: var(--color-line-1); background: var(--line); }
    .line-2 { --line: var(--color-line-2); background: var(--line); }
    .line-3 { --line: var(--color-line-3); background: var(--line); }
    .line-4 { --line: var(--color-line-4); background: var(--line); }
    .line-5 { --line: var(--color-line-5); background: var(--line); }
    .line-6 { --line: var(--color-line-6); background: var(--line); }
    .line-7 { --line: var(--color-line-7); background: var(--line); }
    .line-8 { --line: var(--color-line-8); background: var(--line); }
    .line-9 { --line: var(--color-line-9); background: var(--line); }
    .line-10 { --line: var(--color-line-10); background: var(--line); }
    .line-11 { --line: var(--color-line-11); background: var(--line); }
    .line-12 { --line: var(--color-line-12); background: var(--line); }
    .line-13 { --line: var(--color-line-13); background: var(--line); }
    .line-h { --line: var(--color-line-h); background: var(--line); }
    .tram-overlay {
      position: absolute;
      inset: 0;
      background: transparent;
      border-color: transparent;
      pointer-events: none;
    }
    /* Ink with the line colour as text, so a tram stands out on its own coloured track. */
    .tram {
      background: var(--color-ink);
      color: var(--line, var(--color-bg-card));
      font-weight: 700;
    }
    .tram-dim {
      background: var(--color-text-secondary);
      color: var(--color-bg-card);
    }
    .tram-cluster { color: var(--color-pop-yellow); }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.625rem;
      border: 2px solid var(--color-ink);
      color: var(--color-ink);
      font-size: 0.875rem;
      font-weight: 700;
    }
    .zoom-button {
      min-width: 2.5rem;
      background: var(--color-bg-card);
    }
    .zoom-button:disabled {
      color: var(--color-text-secondary);
      box-shadow: none;
      cursor: default;
    }
    .status-dot {
      width: 0.625rem;
      height: 0.625rem;
      background: var(--color-ink);
    }
    .tram-fullscreen {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: flex;
      flex-direction: column;
      padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right))
        max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
      background: var(--color-bg-primary);
    }
  `,
})
export class TramsPageComponent {
  protected readonly i18n = inject(LanguageService);
  protected readonly feed = inject(TramFeedService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly mapArea = viewChild.required<ElementRef<HTMLElement>>('mapArea');
  private readonly fullscreenArea = viewChild<ElementRef<HTMLElement>>('fullscreenArea');
  private readonly probe = viewChild.required<ElementRef<HTMLElement>>('probe');
  private readonly enterButton = viewChild<ElementRef<HTMLButtonElement>>('enterButton');
  private readonly exitButton = viewChild<ElementRef<HTMLButtonElement>>('exitButton');

  protected readonly presetOptions = PRESET_OPTIONS;
  protected readonly glyphOptions = GLYPH_OPTIONS;
  protected readonly loadingDots = LOADING_DOTS;
  protected readonly lineClass = lineClass;
  protected readonly clusterGlyph = CLUSTER_GLYPH;
  protected readonly optionBase = OPTION_CLASS;
  protected readonly zoomSteps = ZOOM_STEPS;

  readonly mapData = httpResource<TramMapData>(() =>
    new URL('data/helsinki-trams.json', this.document.baseURI).href,
  );

  /** null until the visitor picks a view; then the default follows the screen width. */
  readonly chosenPreset = signal<PresetId | null>(null);
  readonly glyphMode = signal<GlyphMode>('ascii');
  /** The map fills the viewport, above the site's header, with a button to get back. */
  readonly fullscreen = signal(false);
  readonly zoomStep = signal(0);
  private readonly containerWidth = signal<number | null>(null);
  private readonly fullscreenSize = signal<{ width: number; height: number } | null>(null);
  /** Character width divided by font size, measured once the web font has loaded. */
  private readonly charRatio = signal(0.6);
  /** Whether the browser's own full screen is on too; not every browser has it (iPhone Safari). */
  private nativeFullscreen = false;

  readonly presetId = computed(() => this.chosenPreset() ?? defaultPreset(this.containerWidth() ?? 1024));
  readonly grid = computed(() => createGrid(GRID_PRESETS[this.presetId()]));
  readonly glyphs = computed(() => (this.glyphMode() === 'unicode' ? UNICODE_GLYPHS : ASCII_GLYPHS));
  readonly status = computed(() => STATUS[this.feed.status()]);

  // The static layers are rendered once per data, preset and glyph set, never per frame.
  readonly baseMap = computed(() =>
    this.mapData.hasValue() ? renderBaseMap(this.mapData.value(), this.grid(), this.glyphs()) : null,
  );
  readonly rows = computed(() => toRuns(this.baseMap()?.cells ?? []));

  /** Trams go on a second, transparent `<pre>`, the only part that changes as they move. */
  readonly overlay = computed(() => {
    const base = this.baseMap();
    if (!base) return null;
    const now = this.feed.now();
    return renderTramOverlay(
      this.grid(),
      base.cells,
      this.feed.vehicles().values(),
      (tram) => tram.depotRun || isStale(tram, now),
    );
  });
  readonly overlayRows = computed(() => toRuns(this.overlay()?.cells ?? []));

  /**
   * Fit the grid to the card; below the minimum size the map scrolls sideways instead. In full
   * screen, start with the whole map on screen if the text can stay readable, and zoom from there;
   * whatever doesn't fit scrolls both ways.
   */
  readonly fontSize = computed(() => {
    const grid = this.grid();
    const ratio = this.charRatio();
    const screen = this.fullscreen() ? this.fullscreenSize() : null;
    if (screen) {
      // A few pixels of slack, so rounding never adds scrollbars.
      const fitted = Math.min(
        (screen.width - PRE_CHROME_PX - 4) / (grid.cols * ratio),
        (screen.height - PRE_CHROME_PX - 4) / (grid.rows * ratio * 2),
      );
      const size = Math.min(MAX_FULLSCREEN_FONT_PX, Math.max(MIN_FONT_PX, fitted));
      return Math.floor(size * ZOOM_STEPS[this.zoomStep()] * 100) / 100;
    }
    const fitted = ((this.containerWidth() ?? 960) - PRE_CHROME_PX) / (grid.cols * ratio);
    return Math.floor(Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, fitted)) * 100) / 100;
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

    // Go live once the map is there to draw on, keeping only trams inside its box.
    effect(() => {
      if (this.mapData.hasValue()) this.feed.start(this.mapData.value().bbox);
    });

    effect((onCleanup) => {
      const area = this.fullscreenArea()?.nativeElement;
      if (!area || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.fullscreenSize.set({ width: entry.contentRect.width, height: entry.contentRect.height }),
      );
      observer.observe(area);
      onCleanup(() => observer.disconnect());
    });

    // Leaving the browser's full screen (Esc, the back gesture on Android) leaves ours too.
    const onFullscreenChange = () => {
      const doc = this.document as FullscreenDocument;
      const active = !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
      if (this.nativeFullscreen && !active) this.exitFullscreen();
      this.nativeFullscreen = active;
    };
    this.document.addEventListener('fullscreenchange', onFullscreenChange);
    this.document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('fullscreenchange', onFullscreenChange);
      this.document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      // Navigating away (e.g. with Back) mustn't leave the next page unscrollable.
      if (this.fullscreen()) this.leaveFullscreen();
    });
  }

  protected optionClass(active: boolean): string {
    return `${OPTION_CLASS} ${active ? 'bg-pop-yellow' : 'bg-bg-card'}`;
  }

  enterFullscreen(): void {
    if (this.fullscreen()) return;
    this.fullscreen.set(true);
    // The page behind must not scroll, especially on phones where the overlay is the whole view.
    this.document.documentElement.style.overflow = 'hidden';
    // Hide the browser's own bars too where that's possible. If it isn't, or it's refused, the
    // overlay still covers the page.
    const root = this.document.documentElement as FullscreenElement;
    try {
      const request = root.requestFullscreen ?? root.webkitRequestFullscreen;
      Promise.resolve(request?.call(root)).catch(() => undefined);
    } catch {
      // Not allowed here; the overlay is enough.
    }
    afterNextRender(() => this.exitButton()?.nativeElement.focus(), { injector: this.injector });
  }

  /** Zooms the full-screen map, keeping the point in the middle of the view in the middle. */
  zoomBy(direction: 1 | -1): void {
    const step = Math.max(0, Math.min(ZOOM_STEPS.length - 1, this.zoomStep() + direction));
    const region = this.fullscreenArea()?.nativeElement.querySelector<HTMLElement>('[role="region"]');
    if (step === this.zoomStep() || !region) return;
    const centreX = (region.scrollLeft + region.clientWidth / 2) / region.scrollWidth;
    const centreY = (region.scrollTop + region.clientHeight / 2) / region.scrollHeight;
    this.zoomStep.set(step);
    afterNextRender(
      () => {
        region.scrollLeft = centreX * region.scrollWidth - region.clientWidth / 2;
        region.scrollTop = centreY * region.scrollHeight - region.clientHeight / 2;
      },
      { injector: this.injector },
    );
  }

  exitFullscreen(): void {
    if (!this.fullscreen()) return;
    this.leaveFullscreen();
    afterNextRender(() => this.enterButton()?.nativeElement.focus(), { injector: this.injector });
  }

  private leaveFullscreen(): void {
    this.fullscreen.set(false);
    this.zoomStep.set(0);
    this.document.documentElement.style.overflow = '';
    const doc = this.document as FullscreenDocument;
    if (doc.fullscreenElement ?? doc.webkitFullscreenElement) {
      this.nativeFullscreen = false;
      try {
        const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
        Promise.resolve(exit?.call(doc)).catch(() => undefined);
      } catch {
        // Already left.
      }
    }
  }

  /** Keeps Tab inside the full-screen dialog. */
  protected trapFocus(event: KeyboardEvent, dialog: HTMLElement): void {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  private measureCharacter(): void {
    const probe = this.probe().nativeElement;
    const ratio = probe.getBoundingClientRect().width / (probe.textContent!.length * 100);
    if (ratio > 0) this.charRatio.set(ratio);
  }
}
