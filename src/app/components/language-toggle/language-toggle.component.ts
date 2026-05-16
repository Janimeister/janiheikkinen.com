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
      gap: 0.125rem;
      padding: 0.125rem;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      background: rgba(255, 255, 255, 0.035);
      backdrop-filter: blur(10px);
    }

    button {
      min-width: 2rem;
      height: 1.75rem;
      border: 0;
      border-radius: 0.375rem;
      color: var(--color-text-secondary);
      background: transparent;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0;
      line-height: 1;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease;
    }

    button:hover,
    button.active {
      color: var(--color-accent-light);
      background: rgba(99, 102, 241, 0.18);
    }
  `,
})
export class LanguageToggleComponent {
  protected readonly i18n = inject(LanguageService);

  protected setLanguage(language: Language): void {
    this.i18n.setLanguage(language);
  }
}
