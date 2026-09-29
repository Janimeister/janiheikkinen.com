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
import { lineOf, type TramState } from '../trams/hfp';
import { age, schedule, speedKmh, tramTargets } from '../trams/tram-details';

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

/** Padding plus border of the map `<pre>`, on each side. The characters start after it. */
const PRE_INSET_PX = 12 + 2;
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

const NO_LINES: ReadonlySet<string> = new Set();

type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> };
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
const LOADING_DOTS = Array.from({ length: 14 }, (_, row) => (row % 2 ? ' .' : '. ').repeat(36)).join('\n');

const OPTION_CLASS = 'px-3 py-1.5 text-sm font-semibold text-ink border-2 border-ink shadow-brutal-sm brutal-hover brutal-press transition-transform';

@Component({
  selector: 'app-trams-page',
  imports: [GlowCardComponent, FloatingOrbComponent, RouterLink, NgTemplateOutlet],
  providers: [TramFeedService],
  host: { '(document:keydown.escape)': 'onEscape()' },
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
            @if (lineChoices().length > 0) {
              <div class="flex flex-wrap items-center gap-2 mt-4" data-testid="tram-line-filter">
                <span class="text-sm font-semibold text-text-secondary mr-1 uppercase tracking-wider">{{ i18n.t('trams.lines') }}</span>
                <button type="button" (click)="lineSelection.set(null)"
                  [class]="optionClass(lineSelection() === null)"
                  [attr.aria-pressed]="lineSelection() === null">
                  {{ i18n.t('trams.allLines') }}
                </button>
                <button type="button" (click)="lineSelection.set(noLines)"
                  [class]="optionClass(lineSelection()?.size === 0)"
                  [attr.aria-pressed]="lineSelection()?.size === 0">
                  {{ i18n.t('trams.noLines') }}
                </button>
                @for (line of lineChoices(); track line) {
                  <button type="button" (click)="toggleLine(line)"
                    [class]="lineChipClass(line)"
                    [attr.aria-pressed]="follows(line)"
                    [attr.aria-label]="i18n.t('trams.line', { line })">
                    {{ line }}
                  </button>
                }
                <label class="sm:ml-auto inline-flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
                  <input type="checkbox" class="depot-toggle" [checked]="showDepotRuns()" (change)="onDepotToggle($event)" />
                  {{ i18n.t('trams.showDepotRuns') }}
                </label>
              </div>
              @if (lineSelection() !== null) {
                <p class="text-sm text-text-secondary mt-2">{{ i18n.t('trams.filterNote') }}</p>
              }
            }
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
          <span class="status-dot" [class.animate-pulse]="feed.status() !== 'live' && feed.status() !== 'paused'" aria-hidden="true"></span>
          {{ i18n.t(status().labelKey) }}
        </span>
        <span class="text-sm font-semibold text-text-secondary" data-testid="tram-count">{{ i18n.t('trams.tramCount', { count: shownTrams().size }) }}</span>
        <button type="button" (click)="togglePause()" class="inline-flex items-center gap-2 bg-bg-card {{ optionBase }}">
          @if (feed.paused()) {
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>
            {{ i18n.t('trams.resume') }}
          } @else {
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
            {{ i18n.t('trams.pause') }}
          }
        </button>
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
        <div [class]="fullscreen() ? 'flex flex-col h-full' : ''">
          <!-- In full screen the map fits the space the details leave, so they never cover a tram. -->
          <div #mapFit [class]="fullscreen() ? 'flex-1 min-h-0' : ''">
            <div [class]="fullscreen() ? 'overflow-auto h-full' : 'overflow-x-auto'" tabindex="0" role="region" [attr.aria-label]="i18n.t('trams.mapRegion')" data-testid="tram-map-region">
              <div class="relative w-max" [class.mx-auto]="fullscreen()">
                <pre class="tram-map" role="img" data-testid="tram-map" [style.font-size.px]="fontSize()" [style.line-height.px]="lineHeight()"
                  [attr.aria-label]="i18n.t('trams.mapLabel', { lines: map.lines.length, stops: map.stopCount }) + ' ' + i18n.t('trams.mapTrams', { count: overlay()?.count ?? 0 })">@for (row of rows(); track $index) {<span class="map-row">@for (run of row; track $index) {<span [class]="run.cls">{{ run.text }}</span>}</span>}</pre>
                <pre class="tram-map tram-overlay" aria-hidden="true" data-testid="tram-overlay" [style.font-size.px]="fontSize()" [style.line-height.px]="lineHeight()">@for (row of overlayRows(); track $index) {<span class="map-row">@for (run of row; track $index) {<span [class]="run.cls">{{ run.text }}</span>}</span>}</pre>
                <!-- One invisible button over each tram: the map's click targets and, for keyboards and screen readers, its list of trams. -->
                <nav class="tram-targets" [attr.aria-label]="i18n.t('trams.tramList')" [style.font-size.px]="fontSize()" (keydown)="moveFocus($event)" data-testid="tram-list">
                  @for (group of tramGroups(); track group.line) {
                    <ul [attr.aria-label]="i18n.t('trams.line', { line: group.line })">
                      @for (target of group.targets; track target.tram.key) {
                        <li><button type="button" class="tram-target"
                          [style.left]="'calc(' + preInset + 'px + ' + target.col + 'ch)'"
                          [style.top.px]="preInset + target.row * lineHeight()"
                          [style.width.ch]="target.width"
                          [style.height.px]="lineHeight()"
                          [attr.tabindex]="target.tram.key === rovingKey() ? 0 : -1"
                          [attr.aria-pressed]="target.tram.key === selectedKey()"
                          [attr.aria-label]="tramName(target.tram)"
                          [attr.data-tram-key]="target.tram.key"
                          (focus)="focusedKey.set(target.tram.key)"
                          (click)="select(target.tram.key)"></button></li>
                      }
                    </ul>
                  }
                </nav>
              </div>
            </div>
          </div>
          <p class="sr-only" aria-live="polite" data-testid="tram-announcement">{{ announcement() }}</p>
          @if (selectedKey()) {
            <div class="tram-details" data-testid="tram-details">
              @if (details(); as d) {
                <div class="flex items-start gap-3">
                  <span class="legend-chip" [class]="d.chipClass" aria-hidden="true">{{ d.desi }}</span>
                  <h2 class="text-lg font-semibold leading-tight" [attr.aria-label]="d.name">{{ d.headsign }}</h2>
                  @if (d.depotRun) {
                    <span class="text-xs font-semibold uppercase tracking-wider border-2 border-ink px-1.5 py-0.5">{{ i18n.t('trams.depotRun') }}</span>
                  }
                  <ng-container [ngTemplateOutlet]="closeButton" />
                </div>
                <dl class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mt-3 text-sm">
                  <div><dt class="text-text-secondary">{{ i18n.t('trams.speed') }}</dt><dd class="font-semibold" data-testid="tram-speed">{{ d.speed ?? '—' }}</dd></div>
                  <div><dt class="text-text-secondary">{{ i18n.t('trams.schedule') }}</dt><dd class="font-semibold" data-testid="tram-schedule">{{ d.schedule ?? '—' }}</dd></div>
                  <div><dt class="text-text-secondary">{{ i18n.t('trams.doors') }}</dt><dd class="font-semibold">{{ d.doors }}</dd></div>
                  <div class="col-span-2 sm:col-span-2"><dt class="text-text-secondary">{{ i18n.t('trams.nextStop') }}</dt><dd class="font-semibold" data-testid="tram-next-stop">{{ d.nextStop ?? '—' }}</dd></div>
                  <div><dt class="text-text-secondary">{{ i18n.t('trams.updated') }}</dt><dd class="font-semibold" data-testid="tram-updated">{{ d.updated }}</dd></div>
                </dl>
                @if (companions().length > 0) {
                  <div class="flex flex-wrap items-center gap-2 mt-3 text-sm">
                    <span class="text-text-secondary">{{ i18n.t('trams.alsoHere') }}</span>
                    @for (other of companions(); track other.key) {
                      <button type="button" (click)="select(other.key)" [attr.aria-label]="tramName(other)"
                        class="font-mono {{ optionBase }} {{ chipClass(other) }}">{{ other.desi }}</button>
                    }
                  </div>
                }
              } @else {
                <div class="flex items-start gap-3">
                  <p class="text-text-secondary">{{ i18n.t('trams.tramGone') }}</p>
                  <ng-container [ngTemplateOutlet]="closeButton" />
                </div>
              }
            </div>
          } @else if (!fullscreen()) {
            <p class="text-sm text-text-secondary mt-3">{{ i18n.t('trams.selectHint') }}</p>
          }
        </div>
      } @else {
        <p role="status" class="sr-only">{{ i18n.t('trams.loading') }}</p>
        <pre class="tram-map animate-pulse text-text-secondary" aria-hidden="true">{{ loadingDots }}</pre>
      }
    </ng-template>

    <ng-template #closeButton>
      <button type="button" (click)="closeDetails()" [attr.aria-label]="i18n.t('trams.closeDetails')" class="ml-auto shrink-0 bg-bg-card {{ optionBase }}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
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
    .tram-targets {
      position: absolute;
      inset: 0;
      font-family: var(--font-mono);
      pointer-events: none;
    }
    .tram-targets ul { margin: 0; padding: 0; list-style: none; }
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
    .tram-target[aria-pressed='true'] {
      outline: 3px solid var(--color-accent-primary);
      outline-offset: 1px;
    }
    .tram-target:focus-visible {
      outline: 3px solid var(--color-ink);
      outline-offset: 1px;
      box-shadow: 0 0 0 5px var(--color-pop-yellow);
    }
    .tram-details {
      margin-top: 0.75rem;
      padding: 1rem;
      background: var(--color-bg-card);
      border: 2px solid var(--color-ink);
      box-shadow: var(--shadow-brutal-sm);
    }
    .depot-toggle {
      width: 1.125rem;
      height: 1.125rem;
      accent-color: var(--color-ink);
    }
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
  private readonly mapFit = viewChild<ElementRef<HTMLElement>>('mapFit');
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
  protected readonly preInset = PRE_INSET_PX;
  protected readonly noLines = NO_LINES;

  readonly mapData = httpResource<TramMapData>(() =>
    new URL('data/helsinki-trams.json', this.document.baseURI).href,
  );

  /** null until the visitor picks a view; then the default follows the screen width. */
  readonly chosenPreset = signal<PresetId | null>(null);
  readonly glyphMode = signal<GlyphMode>('ascii');
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
  private readonly containerWidth = signal<number | null>(null);
  private readonly fullscreenSize = signal<{ width: number; height: number } | null>(null);
  /** Character width divided by font size, measured once the web font has loaded. */
  private readonly charRatio = signal(0.6);
  /**
   * Whether the browser's own full screen is on, or asked for and not refused. Not every browser
   * has it (iPhone Safari).
   */
  private nativeFullscreen = false;

  readonly presetId = computed(() => this.chosenPreset() ?? defaultPreset(this.containerWidth() ?? 1024));
  readonly grid = computed(() => createGrid(GRID_PRESETS[this.presetId()]));
  readonly glyphs = computed(() => (this.glyphMode() === 'unicode' ? UNICODE_GLYPHS : ASCII_GLYPHS));
  readonly status = computed(() => STATUS[this.feed.status()]);
  readonly lineChoices = computed(() =>
    this.mapData.hasValue() ? this.mapData.value().lines.map((line) => line.desi) : [],
  );
  private readonly stopNames = computed(
    () => new Map(this.mapData.hasValue() ? this.mapData.value().stops.map((s) => [s.id, s.name]) : []),
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
      this.shownTrams().values(),
      (tram) => tram.depotRun || isStale(tram, now),
    );
  });
  readonly overlayRows = computed(() => toRuns(this.overlay()?.cells ?? []));

  readonly tramGroups = computed(() => tramTargets(this.overlay()?.markers ?? [], this.shownTrams()));
  /** Only one tram button is in the Tab order; the arrow keys move between them. */
  readonly rovingKey = computed(() => {
    const keys = new Set(this.tramGroups().flatMap((group) => group.targets.map((t) => t.tram.key)));
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
  readonly details = computed(() => {
    const tram = this.selected();
    if (!tram) return null;
    const speed = speedKmh(tram.speed);
    const updated = age(tram.receivedAt, this.clock());
    return {
      desi: tram.desi,
      headsign: tram.headsign,
      name: this.tramName(tram),
      chipClass: this.chipClass(tram),
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
    effect(() => this.feed.setLines(this.lineSelection()));

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
        this.fullscreenSize.set({ width: entry.contentRect.width, height: entry.contentRect.height }),
      );
      observer.observe(area);
      onCleanup(() => observer.disconnect());
    });

    // Leaving the browser's full screen (Esc, the back gesture on Android) leaves ours too.
    const onFullscreenChange = () => {
      const doc = this.document as FullscreenDocument;
      const active = !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
      if (active && !this.fullscreen()) {
        // It arrived after the map was already closed again.
        this.exitNativeFullscreen();
      } else if (!active && this.nativeFullscreen) {
        // Even if it never quite started: Esc during the switch cancels it without a key event.
        this.nativeFullscreen = false;
        this.exitFullscreen();
      }
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

  protected lineChipClass(line: string): string {
    return `${OPTION_CLASS} min-w-10 font-mono ${this.follows(line) ? lineClass(line) : 'bg-bg-card line-through'}`;
  }

  protected chipClass(tram: TramState): string {
    return tram.depotRun ? 'line-h' : lineClass(lineOf(tram.desi));
  }

  follows(line: string): boolean {
    return this.lineSelection()?.has(line) ?? true;
  }

  /** Shows or hides one line. Once every line is on again, that's "all", depot runs included. */
  toggleLine(line: string): void {
    const all = this.lineChoices();
    const next = new Set(this.lineSelection() ?? all);
    if (!next.delete(line)) next.add(line);
    this.lineSelection.set(all.every((l) => next.has(l)) ? null : next);
  }

  protected onDepotToggle(event: Event): void {
    this.showDepotRuns.set((event.target as HTMLInputElement).checked);
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
        return this.i18n.t(s.kind === 'ahead' ? 'trams.ahead' : 'trams.late', { minutes: s.minutes });
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
        const root = this.fullscreen() ? this.fullscreenArea()?.nativeElement : this.mapArea().nativeElement;
        const target =
          root?.querySelector<HTMLElement>(`[data-tram-key="${key}"]`) ??
          root?.querySelector<HTMLElement>('[role="region"]');
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  /** Arrow keys, Home and End move between the tram buttons in list order. */
  protected moveFocus(event: KeyboardEvent): void {
    const buttons = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button')];
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
    const root = this.document.documentElement as FullscreenElement;
    const request = root.requestFullscreen ?? root.webkitRequestFullscreen;
    if (request) {
      this.nativeFullscreen = true;
      try {
        Promise.resolve(request.call(root)).catch(() => (this.nativeFullscreen = false));
      } catch {
        // Not allowed here; the overlay is enough.
        this.nativeFullscreen = false;
      }
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
    this.nativeFullscreen = false;
    this.exitNativeFullscreen();
  }

  private exitNativeFullscreen(): void {
    const doc = this.document as FullscreenDocument;
    if (!(doc.fullscreenElement ?? doc.webkitFullscreenElement)) return;
    try {
      const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
      Promise.resolve(exit?.call(doc)).catch(() => undefined);
    } catch {
      // Already left.
    }
  }

  /** Keeps Tab inside the full-screen dialog. */
  protected trapFocus(event: KeyboardEvent, dialog: HTMLElement): void {
    if (event.key !== 'Tab') return;
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), [tabindex="0"]'),
    ];
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
