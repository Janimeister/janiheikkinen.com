import type { Language } from './translations';

/** English lives at the root (`/weather`); every other language under its code (`/fi/weather`). */
export const DEFAULT_LANGUAGE: Language = 'en';

const PREFIX = /^\/fi(?=\/|$|[?#])/;

/** The language an address is written in. */
export function languageOfUrl(url: string): Language {
  return PREFIX.test(url) ? 'fi' : DEFAULT_LANGUAGE;
}

/** The address without its language prefix: `/fi/weather?x=1` becomes `/weather?x=1`. */
export function stripLanguage(url: string): string {
  const rest = url.replace(PREFIX, '');
  return rest.startsWith('/') ? rest : `/${rest}`;
}

/** The same page in another language, keeping the query and fragment. */
export function localizeUrl(url: string, language: Language): string {
  const rest = stripLanguage(url);
  if (language === DEFAULT_LANGUAGE) return rest;
  return rest === '/' ? `/${language}` : `/${language}${rest.replace(/^\/(?=[?#])/, '')}`;
}

/** The page an address is for, as the page registry lists it: `/fi/weather?x=1` is `weather`. */
export function pageOfUrl(url: string): string {
  return stripLanguage(url).split(/[?#]/)[0].split('/')[1] ?? '';
}
