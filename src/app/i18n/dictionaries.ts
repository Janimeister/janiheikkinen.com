import { signal } from '@angular/core';
import { EN_TRANSLATIONS, type Dictionary, type Language } from './translations';

// Module state rather than service state, so a lazily loaded page can add its copy as its chunk
// is evaluated, before any component asks for it. The entries are immutable text.
const loaded = signal<Record<Language, Dictionary>>({ en: EN_TRANSLATIONS, fi: {} });

/** Everything loaded so far, per language. */
export const dictionaries = loaded.asReadonly();

/** Adds copy to a language. Page components call this for their English copy. */
export function registerTranslations(language: Language, dictionary: Dictionary): void {
  loaded.update((all) => ({ ...all, [language]: { ...all[language], ...dictionary } }));
}
