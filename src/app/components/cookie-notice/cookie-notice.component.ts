import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';

@Component({
  selector: 'app-cookie-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="fixed bottom-0 inset-x-0 z-50 p-4 md:p-6">
        <div class="max-w-3xl mx-auto bg-bg-card border-2 border-ink p-5 shadow-brutal">
          <div class="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div class="flex-1">
              <h3 class="text-sm font-bold text-text-primary mb-1.5">{{ i18n.t('cookie.title') }}</h3>
              <p class="text-xs text-text-secondary leading-relaxed">
                {{ i18n.t('cookie.bodyStart') }}
                <strong class="text-text-primary">{{ i18n.t('cookie.localStorage') }}</strong>
                {{ i18n.t('cookie.bodyMiddle') }}
                <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" class="text-accent-light font-semibold underline hover:no-underline">Open-Meteo</a>{{ i18n.t('cookie.bodyEnd') }}
              </p>
            </div>
            <button (click)="accept()"
                    class="shrink-0 px-5 py-2 text-sm font-bold border-2 border-ink bg-pop-lime text-ink shadow-brutal-sm brutal-hover brutal-press cursor-pointer">
              {{ i18n.t('cookie.accept') }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CookieNoticeComponent {
  protected readonly i18n = inject(LanguageService);
  visible = signal(!this.hasConsented());

  accept() {
    localStorage.setItem('cookie-consent', 'accepted');
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
