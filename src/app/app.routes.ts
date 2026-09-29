import { Routes } from '@angular/router';
import { NOT_FOUND_PAGE, NOTICES_PAGE, SITE_PAGES, type PageMeta } from './navigation/page-registry';

export const routes: Routes = [
  ...SITE_PAGES.map(({ path, titleKey, metaKey, loadComponent }) => ({
    path,
    loadComponent,
    data: { titleKey, metaKey } satisfies PageMeta,
  })),
  {
    path: NOTICES_PAGE.path,
    loadComponent: () =>
      import('./pages/third-party-notices.component').then((m) => m.ThirdPartyNoticesComponent),
    data: { titleKey: NOTICES_PAGE.titleKey, metaKey: NOTICES_PAGE.metaKey } satisfies PageMeta,
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found.component').then((m) => m.NotFoundComponent),
    data: NOT_FOUND_PAGE satisfies PageMeta,
  },
];
