import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../i18n/language.service';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="relative flex-1 flex items-center justify-center px-6 pt-24 pb-16">
      <div class="max-w-xl text-center">
        <p class="sticker mb-6">404</p>
        <h1 class="text-4xl md:text-5xl font-bold mb-4">
          <span class="marker">{{ i18n.t('notFound.title') }}</span>
        </h1>
        <p class="text-text-secondary mb-8">{{ i18n.t('notFound.body') }}</p>
        <a
          routerLink="/"
          class="inline-flex items-center gap-2 border-2 border-ink bg-pop-yellow px-5 py-3 font-semibold text-ink shadow-brutal-sm brutal-hover brutal-press"
        >
          {{ i18n.t('notFound.home') }}
        </a>
      </div>
    </section>
  `,
  host: { class: 'flex-1 flex flex-col' },
})
export class NotFoundComponent {
  protected readonly i18n = inject(LanguageService);
}
