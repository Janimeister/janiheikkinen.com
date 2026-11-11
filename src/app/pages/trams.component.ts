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
import { GlowCardComponent } from '../components/shared/glow-card.component';
import { PageHeaderComponent } from '../components/shared/page-header.component';
import { FloatingOrbComponent } from '../components/shared/floating-orb.component';
import { registerTranslations } from '../i18n/dictionaries';
import { LanguageService } from '../i18n/language.service';
import { TRAMS_EN } from '../i18n/pages/trams.en';
import type { TranslationKey } from '../i18n/translations';
import { injectIsBrowser } from '../platform';
import { ASCII_GLYPHS, renderBaseMap, toRuns, UNICODE_GLYPHS } from '../trams/ascii-raster';
import { TramCanvasComponent } from '../trams/components/tram-canvas.component';
import { TramControlsComponent } from '../trams/components/tram-controls.component';
import {
  TramDetailsPanelComponent,
  type TramDetailsView,
} from '../trams/components/tram-details-panel.component';
import { TramLegendComponent } from '../trams/components/tram-legend.component';
import { PRE_INSET_PX, TRAM_MAP_STYLES, tramChipClass } from '../trams/components/tram-styles';
import { TramToolbarComponent } from '../trams/components/tram-toolbar.component';
import {
  exitNativeFullscreen,
  FULLSCREEN_EVENTS,
  isNativeFullscreen,
  requestNativeFullscreen,
  trapFocus,
} from '../trams/fullscreen';
import { createGrid, defaultPreset, GRID_PRESETS, type PresetId } from '../trams/grid';
import type { TramState } from '../trams/hfp';
import { age, schedule, speedKmh, tramTargets } from '../trams/tram-details';
import { isStale, TramFeedService, type FeedStatus } from '../trams/tram-feed.service';
import type { TramMapData } from '../trams/tram-map.model';
import { interpolate } from '../trams/tram-motion';
import { renderTramOverlay } from '../trams/tram-overlay';
import { parseViewPrefs, PREFS_KEY, type GlyphMode, type ViewPrefs } from '../trams/view-prefs';

/** How often gliding trams are redrawn in smooth mode: about as often as they report. */
const FRAME_MS = 500;

const PRE_CHROME_PX = 2 * PRE_INSET_PX;
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
  paused: { labelKey: 'trams.statusPaused', cls: 'bg-pop-sky' },
};

const LOADING_DOTS = Array.from({ length: 14 }, (_, row) =>
  (row % 2 ? ' .' : '. ').repeat(36),
).join('\n');

// This page's English copy; the Finnish copy is fetched by the route when it's needed.
registerTranslations('en', TRAMS_EN);

@Component({
  selector: 'app-trams-page',
  imports: [
    GlowCardComponent,
    FloatingOrbComponent,
    PageHeaderComponent,
    NgTemplateOutlet,
    TramControlsComponent,
    TramToolbarComponent,
    TramCanvasComponent,
    TramDetailsPanelComponent,
    TramLegendComponent,
  ],
  providers: [TramFeedService],
  host: { '(document:keydown.escape)': 'onEscape()' },
  template: `
    <section class="relative min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-20 overflow-hidden">
      <app-floating-orb
        class="hidden md:block absolute top-[12%] right-[10%] z-[1]"
        delay="0s"
        [size]="60"
        shape="circle"
        color="lime"
        rotate="6deg"
      />
      <app-floating-orb
        class="hidden md:block absolute bottom-[20%] left-[6%] z-[1]"
        delay="2.5s"
        [size]="50"
        shape="square"
        color="sky"
        rotate="-4deg"
      />

      <div class="relative z-10 max-w-6xl mx-auto">
        <app-page-header titleKey="trams.title" subtitleKey="trams.subtitle" marker="lime" />

        <!-- Controls -->
        <div class="mb-6 animate-fade-slide-up stagger-1">
          <app-glow-card>
            <app-tram-controls
              [presetId]="presetId()"
              [glyphMode]="glyphMode()"
              [smooth]="feed.smooth()"
              [trails]="trails()"
              [lineChoices]="lineChoices()"
              [(lineSelection)]="lineSelection"
              [(showDepotRuns)]="showDepotRuns"
              (presetChange)="choosePreset($event)"
              (glyphModeChange)="chooseGlyphs($event)"
              (smoothChange)="setSmooth($event)"
              (trailsChange)="setTrails($event)"
            />
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
              <app-tram-legend
                [lines]="map.lines"
                [glyphs]="glyphs()"
                [smooth]="feed.smooth()"
                [trails]="trails()"
              />
            </app-glow-card>
          </div>
        }

        <!-- Notes and attribution -->
        <div class="animate-fade-slide-up stagger-4 text-sm text-text-secondary space-y-2">
          <p>
            {{ i18n.t('trams.liveNote') }}
            @if (mapData.hasValue()) {
              {{ i18n.t('trams.dataVersion', { version: mapData.value().gtfsVersion }) }}
            }
          </p>
          <p>
            {{ i18n.t('trams.attributionHsl') }}:
            <a
              href="https://www.hsl.fi/en/hsl/open-data"
              target="_blank"
              rel="noopener noreferrer"
              class="text-accent-light underline"
              >© HSL / Digitransit</a
            >
            (<a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-accent-light underline"
              >CC BY 4.0</a
            >). {{ i18n.t('trams.attributionOsm') }}:
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              class="text-accent-light underline"
              >© {{ i18n.t('trams.osmContributors') }}</a
            >
            (<a
              href="https://opendatacommons.org/licenses/odbl/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-accent-light underline"
              >ODbL</a
            >).
          </p>
        </div>
      </div>

      @if (fullscreen()) {
        <div
          #dialog
          class="tram-fullscreen"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="i18n.t('trams.fullscreenLabel')"
          data-testid="tram-fullscreen"
          (keydown)="trapFocus($event, dialog)"
        >
          <ng-container [ngTemplateOutlet]="toolbar" />
          <div #fullscreenArea class="flex-1 min-h-0">
            <ng-container [ngTemplateOutlet]="mapView" />
          </div>
        </div>
      }

      <span #probe class="tram-probe" aria-hidden="true">MMMMMMMMMM</span>
    </section>

    <ng-template #toolbar>
      <app-tram-toolbar
        [status]="status()"
        [pulsing]="feed.status() !== 'live' && feed.status() !== 'paused'"
        [count]="shownTrams().size"
        [paused]="feed.paused()"
        [fullscreen]="fullscreen()"
        [zoomStep]="zoomStep()"
        [zoomSteps]="zoomSteps.length"
        (pauseToggle)="togglePause()"
        (zoom)="zoomBy($event)"
        (enter)="enterFullscreen()"
        (exit)="exitFullscreen()"
      />
    </ng-template>

    <ng-template #mapView>
      @if (mapData.error()) {
        <p class="text-red-400">{{ i18n.t('trams.loadError') }}</p>
      } @else if (baseMap(); as map) {
        <div [class]="fullscreen() ? 'flex flex-col h-full' : ''">
          <!-- In full screen the map fits the space the details leave, so they never cover a tram. -->
          <div #mapFit [class]="fullscreen() ? 'flex-1 min-h-0' : ''">
            <div
              [class]="fullscreen() ? 'overflow-auto h-full' : 'overflow-x-auto'"
              tabindex="0"
              role="region"
              [attr.aria-label]="i18n.t('trams.mapRegion')"
              data-testid="tram-map-region"
            >
              <app-tram-canvas
                [class.mx-auto]="fullscreen()"
                [rows]="rows()"
                [overlayRows]="overlayRows()"
                [groups]="tramGroups()"
                [fontSize]="fontSize()"
                [lineHeight]="lineHeight()"
                [label]="
                  i18n.t('trams.mapLabel', { lines: map.lines.length, stops: map.stopCount }) +
                  ' ' +
                  i18n.t('trams.mapTrams', { count: overlay()?.count ?? 0 })
                "
                [rovingKey]="rovingKey()"
                [selectedKey]="selectedKey()"
                (selectTram)="select($event)"
                (focusTram)="focusedKey.set($event)"
              />
            </div>
          </div>
          <p class="sr-only" aria-live="polite" data-testid="tram-announcement">
            {{ announcement() }}
          </p>
          @if (selectedKey()) {
            <app-tram-details-panel
              #detailsPanel
              class="tram-details"
              data-testid="tram-details"
              [details]="details()"
              [companions]="companions()"
              (selectTram)="select($event)"
              (closed)="closeDetails()"
            />
          } @else if (!fullscreen()) {
            <p class="text-sm text-text-secondary mt-3">{{ i18n.t('trams.selectHint') }}</p>
          }
        </div>
      } @else {
        <p role="status" class="sr-only">{{ i18n.t('trams.loading') }}</p>
        <pre class="tram-map animate-pulse text-text-secondary" aria-hidden="true">{{
          loadingDots
        }}</pre>
      }
    </ng-template>
  `,
  styles: [
    TRAM_MAP_STYLES,
    `
      .tram-probe {
        position: absolute;
        visibility: hidden;
        font-family: var(--font-mono);
        font-size: 100px;
        white-space: pre;
        top: 0;
        left: 0;
      }
      .tram-details {
        margin-top: 0.75rem;
        padding: 1rem;
        background: var(--color-bg-card);
        border: 2px solid var(--color-ink);
        box-shadow: var(--shadow-brutal-sm);
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
  ],
})
export class TramsPageComponent {
  protected readonly i18n = inject(LanguageService);
  protected readonly feed = inject(TramFeedService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly mapArea = viewChild.required<ElementRef<HTMLElement>>('mapArea');
  private readonly fullscreenArea = viewChild<ElementRef<HTMLElement>>('fullscreenArea');
  private readonly mapFit = viewChild<ElementRef<HTMLElement>>('mapFit');
  private readonly probe = viewChild.required<ElementRef<HTMLElement>>('probe');
  private readonly toolbar = viewChild(TramToolbarComponent);
  private readonly detailsPanel = viewChild('detailsPanel', { read: ElementRef<HTMLElement> });
  private readonly isBrowser = injectIsBrowser();
  private readonly storage = this.document.defaultView?.localStorage;
  private readonly prefs = this.loadPrefs();

  protected readonly loadingDots = LOADING_DOTS;
  protected readonly zoomSteps = ZOOM_STEPS;

  // The map is a file of this site, but it's still fetched in the browser: the prerendered page
  // shows the loading placeholder rather than the whole map as text.
  readonly mapData = httpResource<TramMapData>(() =>
    this.isBrowser ? new URL('data/helsinki-trams.json', this.document.baseURI).href : undefined,
  );

  /** null until the visitor picks a view; then the default follows the screen width. */
  readonly chosenPreset = signal<PresetId | null>(this.prefs.preset ?? null);
  readonly glyphMode = signal<GlyphMode>(this.prefs.glyphs ?? 'ascii');
  /** Trails are on unless the visitor turned them off, or asked for reduced motion. */
  private readonly trailChoice = signal<boolean | null>(this.prefs.trails ?? null);
  private readonly reducedMotion = signal(false);
  readonly trails = computed(() => this.trailChoice() ?? !this.reducedMotion());
  /** The map fills the viewport, above the site's header, with a button to get back. */
  readonly fullscreen = signal(false);
  readonly zoomStep = signal(0);
  /** The lines to show, or null for all of them, depot runs included. */
  readonly lineSelection = signal<ReadonlySet<string> | null>(null);
  readonly showDepotRuns = signal(true);
  readonly selectedKey = signal<string | null>(null);
  /** The tram button that last had focus, which Tab returns to. */
  readonly focusedKey = signal<string | null>(null);
  /** Read out once when a tram is selected; never on updates. */
  readonly announcement = signal('');
  /** Ticks every second while a tram is selected, for "updated 12 s ago". */
  private readonly clock = signal(Date.now());
  /** Ticks every {@link FRAME_MS} while trams glide, in smooth mode. */
  private readonly frame = signal(Date.now());
  /** Smooth mode glides trams between fixes, except with reduced motion. */
  private readonly gliding = computed(
    () => this.feed.smooth() && !this.reducedMotion() && this.feed.status() === 'live',
  );
  private readonly containerWidth = signal<number | null>(null);
  private readonly fullscreenSize = signal<{ width: number; height: number } | null>(null);
  /** Character width divided by font size, measured once the web font has loaded. */
  private readonly charRatio = signal(0.6);
  /**
   * Whether the browser's own full screen is on, or asked for and not refused. Not every browser
   * has it (iPhone Safari).
   */
  private nativeFullscreen = false;

  readonly presetId = computed(
    () => this.chosenPreset() ?? defaultPreset(this.containerWidth() ?? 1024),
  );
  readonly grid = computed(() => createGrid(GRID_PRESETS[this.presetId()]));
  readonly glyphs = computed(() =>
    this.glyphMode() === 'unicode' ? UNICODE_GLYPHS : ASCII_GLYPHS,
  );
  readonly status = computed(() => STATUS[this.feed.status()]);
  readonly lineChoices = computed(() =>
    this.mapData.hasValue() ? this.mapData.value().lines.map((line) => line.desi) : [],
  );
  private readonly stopNames = computed(
    () =>
      new Map(this.mapData.hasValue() ? this.mapData.value().stops.map((s) => [s.id, s.name]) : []),
  );

  /** The feed only carries the chosen lines; depot runs are hidden here. */
  readonly shownTrams = computed(() => {
    const depotRuns = this.showDepotRuns();
    const shown = new Map<string, TramState>();
    for (const [key, tram] of this.feed.vehicles()) {
      if (depotRuns || !tram.depotRun) shown.set(key, tram);
    }
    return shown;
  });

  // The static layers are rendered once per data, preset and glyph set, never per frame.
  readonly baseMap = computed(() =>
    this.mapData.hasValue()
      ? renderBaseMap(this.mapData.value(), this.grid(), this.glyphs())
      : null,
  );
  readonly rows = computed(() => toRuns(this.baseMap()?.cells ?? []));

  /** Trams go on a second, transparent `<pre>`, the only part that changes as they move. */
  readonly overlay = computed(() => {
    const base = this.baseMap();
    if (!base) return null;
    const now = this.feed.now();
    const smooth = this.feed.smooth();
    const frame = this.gliding() ? this.frame() : null;
    return renderTramOverlay(this.grid(), base.cells, this.shownTrams().values(), {
      isDim: (tram) => tram.depotRun || isStale(tram, now, smooth),
      position: frame === null ? undefined : (tram) => interpolate(tram, frame),
      trails: this.trails(),
    });
  });
  readonly overlayRows = computed(() => toRuns(this.overlay()?.cells ?? []));

  readonly tramGroups = computed(() =>
    tramTargets(this.overlay()?.markers ?? [], this.shownTrams()),
  );
  /** Only one tram button is in the Tab order; the arrow keys move between them. */
  readonly rovingKey = computed(() => {
    const keys = new Set(
      this.tramGroups().flatMap((group) => group.targets.map((t) => t.tram.key)),
    );
    const preferred = [this.focusedKey(), this.selectedKey()].find((key) => key && keys.has(key));
    return preferred ?? keys.values().next().value ?? null;
  });

  readonly selected = computed(() => {
    const key = this.selectedKey();
    return key === null ? null : (this.shownTrams().get(key) ?? null);
  });
  /** Other trams under the same `*` as the selected one. */
  readonly companions = computed(() => {
    const key = this.selectedKey();
    const marker = this.overlay()?.markers.find((m) => key !== null && m.keys.includes(key));
    const trams = this.shownTrams();
    return (marker?.keys ?? [])
      .filter((k) => k !== key)
      .map((k) => trams.get(k))
      .filter((tram): tram is TramState => !!tram);
  });
  readonly details = computed((): TramDetailsView | null => {
    const tram = this.selected();
    if (!tram) return null;
    const speed = speedKmh(tram.speed);
    const updated = age(tram.receivedAt, this.clock());
    return {
      desi: tram.desi,
      headsign: tram.headsign,
      name: this.tramName(tram),
      chipClass: tramChipClass(tram),
      depotRun: tram.depotRun,
      speed: speed === null ? null : this.i18n.t('trams.speedValue', { speed }),
      schedule: this.scheduleText(tram),
      doors: this.i18n.t(tram.doorsOpen ? 'trams.doorsOpen' : 'trams.doorsClosed'),
      nextStop: this.nextStopName(tram),
      updated:
        updated.unit === 'seconds'
          ? this.i18n.t('trams.secondsAgo', { seconds: updated.value })
          : this.i18n.t('trams.minutesAgo', { minutes: updated.value }),
    };
  });

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
  readonly lineHeight = computed(
    () => Math.round(this.fontSize() * this.charRatio() * 2 * 100) / 100,
  );

  constructor() {
    if (this.prefs.smooth) this.feed.setSmooth(true);

    const motionQuery = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (motionQuery) {
      this.reducedMotion.set(motionQuery.matches);
      const onMotionChange = (event: MediaQueryListEvent) => this.reducedMotion.set(event.matches);
      motionQuery.addEventListener?.('change', onMotionChange);
      this.destroyRef.onDestroy(() => motionQuery.removeEventListener?.('change', onMotionChange));
    }

    afterNextRender(() => {
      this.measureCharacter();
      this.document.fonts?.ready.then(() => this.measureCharacter());
      const area = this.mapArea().nativeElement;
      this.containerWidth.set(area.clientWidth);
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.containerWidth.set(entry.contentRect.width),
      );
      observer.observe(area);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // Go live once the map is there to draw on, keeping only trams inside its box.
    effect(() => {
      if (this.mapData.hasValue()) this.feed.start(this.mapData.value().bbox);
    });
    effect(() => this.feed.setLines(this.lineSelection()));

    effect((onCleanup) => {
      if (!this.gliding()) return;
      this.frame.set(Date.now());
      const timer = setInterval(() => this.frame.set(Date.now()), FRAME_MS);
      onCleanup(() => clearInterval(timer));
    });

    effect((onCleanup) => {
      if (this.selectedKey() === null) return;
      this.clock.set(Date.now());
      const timer = setInterval(() => this.clock.set(Date.now()), 1000);
      onCleanup(() => clearInterval(timer));
    });

    effect((onCleanup) => {
      const area = this.fullscreen() ? this.mapFit()?.nativeElement : undefined;
      if (!area || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.fullscreenSize.set({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        }),
      );
      observer.observe(area);
      onCleanup(() => observer.disconnect());
    });

    // Leaving the browser's full screen (Esc, the back gesture on Android) leaves ours too.
    const onFullscreenChange = () => {
      const active = isNativeFullscreen(this.document);
      if (active && !this.fullscreen()) {
        // It arrived after the map was already closed again.
        exitNativeFullscreen(this.document);
      } else if (!active && this.nativeFullscreen) {
        // Even if it never quite started: Esc during the switch cancels it without a key event.
        this.nativeFullscreen = false;
        this.exitFullscreen();
      }
    };
    for (const event of FULLSCREEN_EVENTS) {
      this.document.addEventListener(event, onFullscreenChange);
    }
    this.destroyRef.onDestroy(() => {
      for (const event of FULLSCREEN_EVENTS) {
        this.document.removeEventListener(event, onFullscreenChange);
      }
      // Navigating away (e.g. with Back) mustn't leave the next page unscrollable.
      if (this.fullscreen()) this.leaveFullscreen();
    });
  }

  choosePreset(preset: PresetId): void {
    this.chosenPreset.set(preset);
    this.savePrefs();
  }

  chooseGlyphs(glyphs: GlyphMode): void {
    this.glyphMode.set(glyphs);
    this.savePrefs();
  }

  protected setSmooth(smooth: boolean): void {
    this.feed.setSmooth(smooth);
    this.savePrefs();
  }

  protected setTrails(trails: boolean): void {
    this.trailChoice.set(trails);
    this.savePrefs();
  }

  /** Storage can be missing or refuse (private windows, blocked site data); defaults do then. */
  private loadPrefs(): ViewPrefs {
    try {
      return parseViewPrefs(this.storage?.getItem(PREFS_KEY));
    } catch {
      return {};
    }
  }

  private savePrefs(): void {
    const prefs: ViewPrefs = {
      preset: this.chosenPreset() ?? undefined,
      glyphs: this.glyphMode(),
      smooth: this.feed.smooth(),
      trails: this.trailChoice() ?? undefined,
    };
    try {
      this.storage?.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Not remembered, then.
    }
  }

  togglePause(): void {
    if (this.feed.paused()) this.feed.resume();
    else this.feed.pause();
  }

  tramName(tram: TramState): string {
    return this.i18n.t('trams.tramName', { line: tram.desi, headsign: tram.headsign });
  }

  private scheduleText(tram: TramState): string | null {
    const s = schedule(tram.delay);
    switch (s.kind) {
      case 'unknown':
        return null;
      case 'onTime':
        return this.i18n.t('trams.onTime');
      default:
        return this.i18n.t(s.kind === 'ahead' ? 'trams.ahead' : 'trams.late', {
          minutes: s.minutes,
        });
    }
  }

  private nextStopName(tram: TramState): string | null {
    return tram.nextStop === null ? null : (this.stopNames().get(tram.nextStop) ?? tram.nextStop);
  }

  /** Selects a tram, or deselects it when it already is, like a toggle button. */
  select(key: string): void {
    if (this.selectedKey() === key) {
      this.selectedKey.set(null);
      this.announcement.set('');
      return;
    }
    this.selectedKey.set(key);
    // Under the map, the details can be off screen, especially on a phone.
    afterNextRender(
      () =>
        this.detailsPanel()?.nativeElement.scrollIntoView?.({
          block: 'nearest',
          behavior: this.reducedMotion() ? 'auto' : 'smooth',
        }),
      { injector: this.injector },
    );
    const tram = this.shownTrams().get(key);
    if (!tram) return;
    const unknown = this.i18n.t('trams.unknown');
    this.announcement.set(
      [
        this.tramName(tram),
        `${this.i18n.t('trams.schedule')}: ${this.scheduleText(tram) ?? unknown}`,
        `${this.i18n.t('trams.nextStop')}: ${this.nextStopName(tram) ?? unknown}`,
      ].join('. ') + '.',
    );
  }

  /** Closes the details and puts focus back on the tram, or on the map if it's gone. */
  closeDetails(): void {
    const key = this.selectedKey();
    this.selectedKey.set(null);
    this.announcement.set('');
    afterNextRender(
      () => {
        const root = this.fullscreen()
          ? this.fullscreenArea()?.nativeElement
          : this.mapArea().nativeElement;
        const target =
          root?.querySelector<HTMLElement>(`[data-tram-key="${key}"]`) ??
          root?.querySelector<HTMLElement>('[role="region"]');
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  onEscape(): void {
    if (this.fullscreen()) this.exitFullscreen();
    else if (this.selectedKey() !== null) this.closeDetails();
  }

  enterFullscreen(): void {
    if (this.fullscreen()) return;
    this.fullscreen.set(true);
    // The page behind must not scroll, especially on phones where the overlay is the whole view.
    this.document.documentElement.style.overflow = 'hidden';
    // Hide the browser's own bars too where that's possible. If it isn't, or it's refused, the
    // overlay still covers the page.
    this.nativeFullscreen = requestNativeFullscreen(
      this.document,
      () => (this.nativeFullscreen = false),
    );
    afterNextRender(() => this.toolbar()?.focusFullscreenButton(), { injector: this.injector });
  }

  /** Zooms the full-screen map, keeping the point in the middle of the view in the middle. */
  zoomBy(direction: 1 | -1): void {
    const step = Math.max(0, Math.min(ZOOM_STEPS.length - 1, this.zoomStep() + direction));
    const region =
      this.fullscreenArea()?.nativeElement.querySelector<HTMLElement>('[role="region"]');
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
    afterNextRender(() => this.toolbar()?.focusFullscreenButton(), { injector: this.injector });
  }

  private leaveFullscreen(): void {
    this.fullscreen.set(false);
    this.zoomStep.set(0);
    this.document.documentElement.style.overflow = '';
    this.nativeFullscreen = false;
    exitNativeFullscreen(this.document);
  }

  protected readonly trapFocus = trapFocus;

  private measureCharacter(): void {
    const probe = this.probe().nativeElement;
    const ratio = probe.getBoundingClientRect().width / (probe.textContent!.length * 100);
    if (ratio > 0) this.charRatio.set(ratio);
  }
}
