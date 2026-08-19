import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../i18n/language.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="relative z-10 border-t-2 border-ink py-6 px-6 bg-bg-card">
      <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-text-secondary">
        <span>&copy; {{ year }} Jani Heikkinen</span>
        <div class="flex items-center gap-4">
          <a routerLink="/third-party-notices"
             class="text-text-primary font-semibold underline decoration-2 decoration-pop-pink underline-offset-4 hover:bg-pop-pink hover:no-underline transition-colors">
            {{ i18n.t('footer.thirdPartyNotices') }}
          </a>
          <span class="flex items-center gap-1">
            {{ i18n.t('footer.builtWith') }}
          </span>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  protected readonly i18n = inject(LanguageService);
  year = new Date().getFullYear();
}
