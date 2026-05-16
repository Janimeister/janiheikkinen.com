import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  type Language,
  type TranslationKey,
} from './translations';

const STORAGE_KEY = 'app-language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly selectedLanguage = signal<Language>(this.getInitialLanguage());

  readonly languages = SUPPORTED_LANGUAGES;
  readonly language = this.selectedLanguage.asReadonly();
  readonly locale = computed(() => (this.language() === 'fi' ? 'fi-FI' : 'en-GB'));

  constructor() {
    this.syncLanguage(this.language());
    effect(() => this.syncLanguage(this.language()));
  }

  setLanguage(language: Language): void {
    this.selectedLanguage.set(language);
    this.syncLanguage(language);
  }

  isLanguage(language: Language): boolean {
    return this.language() === language;
  }

  t(key: TranslationKey, params: Record<string, string | number> = {}): string {
    const template = TRANSLATIONS[this.language()][key] ?? TRANSLATIONS.en[key];
    return template.replace(/\{(\w+)\}/g, (_, paramKey: string) => String(params[paramKey] ?? ''));
  }

  private getInitialLanguage(): Language {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'fi') {
        return stored;
      }
    } catch {
      // Keep English as the stable default if storage cannot be read.
    }

    return 'en';
  }

  private syncLanguage(language: Language): void {
    this.document.documentElement.lang = language;
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Storage can be unavailable in privacy modes or tests.
    }
  }
}
