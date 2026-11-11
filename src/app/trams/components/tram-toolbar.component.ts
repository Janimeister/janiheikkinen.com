import { Component, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';
import type { TranslationKey } from '../../i18n/translations';
import { TRAM_OPTION_CLASS } from './tram-styles';

/**
 * The row above the map: whether the feed is live, how many trams are shown, pause, and the
 * way into or out of full screen (with zoom while in it).
 */
@Component({
  selector: 'app-tram-toolbar',
  template: `
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <span class="status-badge" [class]="status().cls" role="status" data-testid="tram-status">
        <span class="status-dot" [class.animate-pulse]="pulsing()" aria-hidden="true"></span>
        {{ i18n.t(status().labelKey) }}
      </span>
      <span class="text-sm font-semibold text-text-secondary" data-testid="tram-count">{{
        i18n.t('trams.tramCount', { count: count() })
      }}</span>
      <button
        type="button"
        (click)="pauseToggle.emit()"
        class="inline-flex items-center gap-2 bg-bg-card {{ optionBase }}"
      >
        @if (paused()) {
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 4l13 8-13 8z" />
          </svg>
          {{ i18n.t('trams.resume') }}
        } @else {
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
          </svg>
          {{ i18n.t('trams.pause') }}
        }
      </button>
      @if (fullscreen()) {
        <span class="ml-auto inline-flex gap-2">
          <button
            type="button"
            (click)="zoom.emit(-1)"
            [disabled]="zoomStep() === 0"
            [attr.aria-label]="i18n.t('trams.zoomOut')"
            class="zoom-button {{ optionBase }}"
          >
            −
          </button>
          <button
            type="button"
            (click)="zoom.emit(1)"
            [disabled]="zoomStep() === zoomSteps() - 1"
            [attr.aria-label]="i18n.t('trams.zoomIn')"
            class="zoom-button {{ optionBase }}"
          >
            +
          </button>
        </span>
        <button
          #exitButton
          type="button"
          (click)="exit.emit()"
          class="inline-flex items-center gap-2 bg-pop-yellow {{ optionBase }}"
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
          {{ i18n.t('trams.exitFullscreen') }}
        </button>
      } @else {
        <button
          #enterButton
          type="button"
          (click)="enter.emit()"
          class="ml-auto inline-flex items-center gap-2 bg-bg-card {{ optionBase }}"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
            />
          </svg>
          {{ i18n.t('trams.fullscreen') }}
        </button>
      }
    </div>
  `,
  styles: `
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
    .status-dot {
      width: 0.625rem;
      height: 0.625rem;
      background: var(--color-ink);
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
  `,
  host: { class: 'block' },
})
export class TramToolbarComponent {
  protected readonly i18n = inject(LanguageService);
  private readonly enterButton = viewChild<ElementRef<HTMLButtonElement>>('enterButton');
  private readonly exitButton = viewChild<ElementRef<HTMLButtonElement>>('exitButton');

  /** The feed's state, as a label and the fill its badge wears. */
  readonly status = input.required<{ labelKey: TranslationKey; cls: string }>();
  /** Whether the feed is still on its way to live. */
  readonly pulsing = input(false);
  /** How many trams are on the map. */
  readonly count = input.required<number>();
  readonly paused = input(false);
  readonly fullscreen = input(false);
  readonly zoomStep = input(0);
  /** How many zoom steps there are. */
  readonly zoomSteps = input(1);

  readonly pauseToggle = output<void>();
  readonly zoom = output<1 | -1>();
  readonly enter = output<void>();
  readonly exit = output<void>();

  protected readonly optionBase = TRAM_OPTION_CLASS;

  /** Puts focus on the button that enters or leaves full screen, whichever is shown. */
  focusFullscreenButton(): void {
    (this.exitButton() ?? this.enterButton())?.nativeElement.focus();
  }
}
