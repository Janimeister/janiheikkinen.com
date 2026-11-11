import { Component, inject } from '@angular/core';
import { Router, RouterLink, type UrlTree } from '@angular/router';
import { LanguageService } from '../../i18n/language.service';
import { localizeUrl } from '../../i18n/localized-url';
import type { Language } from '../../i18n/translations';
import { injectCurrentUrl } from '../../navigation/current-url';

/**
 * Each language is a link to the same page at that language's address (`/weather`,
 * `/fi/weather`), so the choice can be shared, bookmarked and indexed.
 */
@Component({
  selector: 'app-language-toggle',
  imports: [RouterLink],
  template: `
    <div class="language-toggle" role="group" [attr.aria-label]="i18n.t('language.label')">
      @for (language of i18n.languages; track language.code) {
        <a
          [routerLink]="link(language.code)"
          [attr.hreflang]="language.code"
          (click)="i18n.remember(language.code)"
          [class.active]="i18n.isLanguage(language.code)"
          [attr.aria-current]="i18n.isLanguage(language.code) ? 'true' : null"
          [attr.title]="language.nativeName"
          [attr.data-testid]="'language-' + language.code"
        >
          {{ language.label
          }}<span class="sr-only" [attr.lang]="language.code"> {{ language.nativeName }}</span>
        </a>
      }
    </div>
  `,
  styles: `
    .language-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0;
      border: 2px solid var(--color-ink);
      background: var(--color-bg-card);
      box-shadow: var(--shadow-brutal-sm);
    }

    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2rem;
      height: 1.75rem;
      color: var(--color-text-primary);
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0;
      line-height: 1;
      text-decoration: none;
      transition: background 0.15s ease;
    }

    a + a {
      border-left: 2px solid var(--color-ink);
    }

    a:hover {
      background: var(--color-pop-yellow);
    }

    a.active {
      background: var(--color-pop-pink);
    }
  `,
})
export class LanguageToggleComponent {
  protected readonly i18n = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly url = injectCurrentUrl();

  /** The page being shown, at the address of another language, with its query and fragment. */
  protected link(language: Language): UrlTree {
    return this.router.parseUrl(localizeUrl(this.url(), language));
  }
}
