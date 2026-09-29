import { Component, signal, inject } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';

@Component({
  selector: 'app-cookie-notice',
  template: `
    @if (visible()) {
      <aside
        class="fixed bottom-0 inset-x-0 z-50 p-4 md:p-6"
        aria-labelledby="privacy-note-title"
      >
        <div class="max-w-3xl mx-auto bg-bg-card border-2 border-ink p-5 shadow-brutal">
          <div class="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div class="flex-1">
              <h2 id="privacy-note-title" class="text-sm font-bold text-text-primary mb-1.5">
                {{ i18n.t('cookie.title') }}
              </h2>
              <p class="text-xs text-text-secondary leading-relaxed">{{ i18n.t('cookie.storage') }}</p>
              <p class="text-xs text-text-secondary leading-relaxed mt-1">{{ i18n.t('cookie.services') }}</p>
            </div>
            <button
              type="button"
              (click)="accept()"
              class="shrink-0 px-5 py-2 text-sm font-bold border-2 border-ink bg-pop-lime text-ink shadow-brutal-sm brutal-hover brutal-press cursor-pointer"
            >
              {{ i18n.t('cookie.accept') }}
            </button>
          </div>
        </div>
      </aside>
    }
  `,
})
export class CookieNoticeComponent {
  protected readonly i18n = inject(LanguageService);
  visible = signal(!this.hasConsented());

  accept() {
    try {
      localStorage.setItem('cookie-consent', 'accepted');
    } catch {
      // Storage may be unavailable (e.g. private browsing) - still dismiss the notice.
    }
    this.visible.set(false);
  }

  private hasConsented(): boolean {
    try {
      return localStorage.getItem('cookie-consent') === 'accepted';
    } catch {
      return false;
    }
  }
}
