import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { dictionaries, registerTranslations } from './dictionaries';
import { DEFAULT_LANGUAGE, localizeUrl } from './localized-url';
import { FI_PAGE_LOADERS } from './pages';
import {
  SUPPORTED_LANGUAGES,
  type Dictionary,
  type Language,
  type TranslationKey,
} from './translations';

/** Where the language toggle remembers its last choice; `index.html` reads it before the app. */
export const LANGUAGE_STORAGE_KEY = 'app-language';

/** English ships with the app and its pages; Finnish is fetched the first time it's needed. */
const FI_CORE = 'core';
const loadFinnish = (part: string): Promise<Dictionary> | undefined =>
  part === FI_CORE
    ? import('./translations.fi').then((m) => m.FI_TRANSLATIONS)
    : FI_PAGE_LOADERS[part]?.();

/** Parts of the Finnish copy already fetched or on their way, shared by every request. */
const finnishParts = new Map<string, Promise<void>>();

function ensureFinnish(part: string): Promise<void> {
  let pending = finnishParts.get(part);
  if (!pending) {
    pending = (loadFinnish(part) ?? Promise.resolve({})).then((dictionary) =>
      registerTranslations('fi', dictionary),
    );
    finnishParts.set(part, pending);
    // A failed download may be retried on the next visit to the page.
    pending.catch(() => finnishParts.delete(part));
  }
  return pending;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly selectedLanguage = signal<Language>(DEFAULT_LANGUAGE);
  /** The language asked for most recently; an older request that resolves later is dropped. */
  private requested: Language = DEFAULT_LANGUAGE;

  readonly languages = SUPPORTED_LANGUAGES;
  readonly language = this.selectedLanguage.asReadonly();
  readonly locale = computed(() => (this.language() === 'fi' ? 'fi-FI' : 'en-GB'));

  constructor() {
    this.document.documentElement.lang = this.language();
  }

  /**
   * Switches once the language's copy has loaded, so text never shows half-translated. The
   * router calls this for every page (see `app.routes.ts`): the address decides the language,
   * and `page` is the path whose own copy the page needs.
   */
  async setLanguage(language: Language, page?: string): Promise<void> {
    this.requested = language;
    if (language === 'fi') {
      try {
        await Promise.all([ensureFinnish(FI_CORE), ...(page ? [ensureFinnish(page)] : [])]);
      } catch {
        // The chunk couldn't be fetched (offline?). The page still opens, in English.
      }
    }
    if (this.requested !== language) return;

    this.selectedLanguage.set(language);
    this.document.documentElement.lang = language;
  }

  /** Remembers a choice made with the language toggle, for the visitor's next visit. */
  remember(language: Language): void {
    try {
      this.document.defaultView?.localStorage?.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Storage can be unavailable in privacy modes or tests.
    }
  }

  isLanguage(language: Language): boolean {
    return this.language() === language;
  }

  /** A link to a page of this site in the current language: `/weather` or `/fi/weather`. */
  path(url: string): string {
    return localizeUrl(url, this.language());
  }

  t(key: TranslationKey, params: Record<string, string | number> = {}): string {
    const all = dictionaries();
    const template = all[this.language()][key] ?? all.en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, paramKey: string) => String(params[paramKey] ?? ''));
  }
}
