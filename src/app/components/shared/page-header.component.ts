import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../i18n/language.service';
import type { TranslationKey } from '../../i18n/translations';

export type MarkerColor = 'yellow' | 'pink' | 'lime' | 'sky' | 'orange';

/**
 * The top of every detail page: the way back home, the marker-highlighted heading and an
 * optional subtitle. Anything a page puts inside it (a search form, a section nav) follows the
 * subtitle.
 */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  template: `
    <header class="mb-8 animate-fade-slide-up">
      <a
        [routerLink]="i18n.path('/')"
        class="text-sm font-semibold text-ink hover:text-accent-light transition-transform mb-4 inline-flex items-center gap-2 border-2 border-ink bg-bg-card px-3 py-2 shadow-brutal-sm brutal-hover brutal-press"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {{ i18n.t('common.backToHome') }}
      </a>
      <h1 class="text-4xl md:text-5xl font-bold mt-3 leading-tight">
        <span class="marker" [class]="'marker-' + marker()">{{ i18n.t(titleKey()) }}</span>
      </h1>
      @if (subtitleKey(); as subtitle) {
        <p class="text-text-secondary mt-3 text-lg max-w-2xl">{{ i18n.t(subtitle) }}</p>
      }
      <ng-content />
    </header>
  `,
  host: { class: 'block' },
})
export class PageHeaderComponent {
  protected readonly i18n = inject(LanguageService);
  readonly titleKey = input.required<TranslationKey>();
  readonly subtitleKey = input<TranslationKey>();
  /** The pop color of the stripe behind the heading. */
  readonly marker = input<MarkerColor>('yellow');
}
