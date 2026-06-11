import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../../i18n/language.service';
import type { Language } from '../../i18n/translations';

@Component({
  selector: 'app-language-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="language-toggle" role="group" [attr.aria-label]="i18n.t('language.label')">
      @for (language of i18n.languages; track language.code) {
        <button
          type="button"
          (click)="setLanguage(language.code)"
          [class.active]="i18n.isLanguage(language.code)"
          [attr.aria-label]="language.nativeName"
          [attr.aria-pressed]="i18n.isLanguage(language.code)"
          [attr.title]="language.nativeName"
          [attr.data-testid]="'language-' + language.code">
          {{ language.label }}
        </button>
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

    button {
      min-width: 2rem;
      height: 1.75rem;
      border: 0;
      color: var(--color-text-primary);
      background: transparent;
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0;
      line-height: 1;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    button + button {
      border-left: 2px solid var(--color-ink);
    }

    button:hover {
      background: var(--color-pop-yellow);
    }

    button.active {
      background: var(--color-pop-pink);
    }
  `,
})
export class LanguageToggleComponent {
  protected readonly i18n = inject(LanguageService);

  protected setLanguage(language: Language): void {
    this.i18n.setLanguage(language);
  }
}
