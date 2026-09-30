import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import {
  EN_TRANSLATIONS,
  SUPPORTED_LANGUAGES,
  type Language,
  type TranslationKey,
  type Translations,
} from './translations';

const STORAGE_KEY = 'app-language';

/** English ships in the main bundle; other languages are fetched the first time they're needed. */
const LOADERS: Record<Exclude<Language, 'en'>, () => Promise<Translations>> = {
  fi: () => import('./translations.fi').then((m) => m.FI_TRANSLATIONS),
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly selectedLanguage = signal<Language>('en');
  private readonly dictionaries = signal<Partial<Record<Language, Translations>>>({
    en: EN_TRANSLATIONS,
  });
  /** The language asked for most recently; an older request that resolves later is dropped. */
  private requested: Language = 'en';

  readonly languages = SUPPORTED_LANGUAGES;
  readonly language = this.selectedLanguage.asReadonly();
  readonly locale = computed(() => (this.language() === 'fi' ? 'fi-FI' : 'en-GB'));
  /** Settles once the stored language is ready to show; the app waits for it before starting. */
  readonly ready: Promise<void>;

  constructor() {
    // Set the initial <html lang> attribute without writing to localStorage.
    this.document.documentElement.lang = this.language();
    const initial = this.getInitialLanguage();
    this.ready = initial === 'en' ? Promise.resolve() : this.switchTo(initial, false);
  }

  /** Switches once the language's translations have loaded, so text never shows half-translated. */
  setLanguage(language: Language): Promise<void> {
    return this.switchTo(language, true);
  }

  isLanguage(language: Language): boolean {
    return this.language() === language;
  }

  t(key: TranslationKey, params: Record<string, string | number> = {}): string {
    const template = this.dictionaries()[this.language()]?.[key] ?? EN_TRANSLATIONS[key];
    return template.replace(/\{(\w+)\}/g, (_, paramKey: string) => String(params[paramKey] ?? ''));
  }

  private async switchTo(language: Language, persist: boolean): Promise<void> {
    this.requested = language;
    if (!this.dictionaries()[language] && language !== 'en') {
      try {
        const dictionary = await LOADERS[language]();
        this.dictionaries.update((loaded) => ({ ...loaded, [language]: dictionary }));
      } catch {
        // The chunk couldn't be fetched (offline?); stay in the current language.
        return;
      }
    }
    if (this.requested !== language) return;

    this.selectedLanguage.set(language);
    this.document.documentElement.lang = language;
    if (!persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Storage can be unavailable in privacy modes or tests.
    }
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
}
