import type { ResolveFn, Route, Routes } from '@angular/router';
import { inject } from '@angular/core';
import { LanguageService } from './i18n/language.service';
import { DEFAULT_LANGUAGE } from './i18n/localized-url';
import type { Language } from './i18n/translations';
import {
  NOT_FOUND_PAGE,
  NOT_FOUND_PATH,
  NOTICES_PAGE,
  SITE_PAGES,
  type PageMeta,
} from './navigation/page-registry';

/**
 * The address decides the language. Resolvers are the router's last step before it shows a
 * page, so the language's copy (and, for Finnish, the page's own) is loaded first and the
 * switch lands together with the new page.
 */
const useLanguage =
  (language: Language, page: string): ResolveFn<void> =>
  () =>
    inject(LanguageService).setLanguage(language, page);

/** Every page of the site, once per language: at the root for English, under `/fi` for Finnish. */
function pageRoutes(language: Language): Routes {
  const localized = (page: string, route: Route & { data: PageMeta }): Route => ({
    ...route,
    resolve: { language: useLanguage(language, page) },
  });
  const notFound = () => import('./pages/not-found.component').then((m) => m.NotFoundComponent);
  return [
    ...SITE_PAGES.map(({ path, titleKey, metaKey, loadComponent }) =>
      localized(path, { path, loadComponent, data: { titleKey, metaKey } }),
    ),
    localized(NOTICES_PAGE.path, {
      path: NOTICES_PAGE.path,
      loadComponent: () =>
        import('./pages/third-party-notices.component').then((m) => m.ThirdPartyNoticesComponent),
      data: { titleKey: NOTICES_PAGE.titleKey, metaKey: NOTICES_PAGE.metaKey },
    }),
    // A real address for the not-found page, so the build can prerender it as Pages' 404.html.
    ...(language === DEFAULT_LANGUAGE
      ? [localized('', { path: NOT_FOUND_PATH, loadComponent: notFound, data: NOT_FOUND_PAGE })]
      : []),
    localized('', { path: '**', loadComponent: notFound, data: NOT_FOUND_PAGE }),
  ];
}

const english = pageRoutes(DEFAULT_LANGUAGE);

export const routes: Routes = [
  // English pages, then the Finnish prefix, then English's catch-all for everything else.
  ...english.slice(0, -1),
  { path: 'fi', children: pageRoutes('fi') },
  ...english.slice(-1),
];
