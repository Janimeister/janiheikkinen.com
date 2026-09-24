import { Routes } from '@angular/router';
import { SITE_PAGES } from './navigation/page-registry';

export const routes: Routes = [
  ...SITE_PAGES.map(({ path, title, loadComponent }) => ({ path, title, loadComponent })),
  {
    path: 'third-party-notices',
    title: 'Third-Party Notices · Jani Heikkinen',
    loadComponent: () =>
      import('./pages/third-party-notices.component').then((m) => m.ThirdPartyNoticesComponent),
  },
  { path: '**', redirectTo: '' },
];
