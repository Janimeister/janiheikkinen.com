import type { Route } from '@angular/router';
import type { TranslationKey } from '../i18n/translations';

export const PAGE_GROUPS = [
  { id: 'everyday', labelKey: 'explore.everyday' },
  { id: 'experiments', labelKey: 'explore.experiments' },
  { id: 'play', labelKey: 'explore.play' },
  { id: 'about', labelKey: 'explore.about' },
] as const satisfies readonly { id: string; labelKey: TranslationKey }[];

export interface SitePage {
  path: string;
  title: string;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  keywordsKey: TranslationKey;
  group: (typeof PAGE_GROUPS)[number]['id'];
  loadComponent: NonNullable<Route['loadComponent']>;
}

// Add a page here to register its route, launcher entry and homepage card together.
export const SITE_PAGES: readonly SitePage[] = [
  {
    path: '',
    title: 'Jani Heikkinen',
    labelKey: 'nav.home',
    descriptionKey: 'explore.homeDescription',
    keywordsKey: 'explore.homeKeywords',
    group: 'about',
    loadComponent: () => import('../pages/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'weather',
    title: 'Weather · Jani Heikkinen',
    labelKey: 'nav.weather',
    descriptionKey: 'explore.weatherDescription',
    keywordsKey: 'explore.weatherKeywords',
    group: 'everyday',
    loadComponent: () => import('../pages/weather.component').then((m) => m.WeatherPageComponent),
  },
  {
    path: 'electricity',
    title: 'Electricity Prices · Jani Heikkinen',
    labelKey: 'electricity.title',
    descriptionKey: 'explore.electricityDescription',
    keywordsKey: 'explore.electricityKeywords',
    group: 'everyday',
    loadComponent: () =>
      import('../pages/electricity.component').then((m) => m.ElectricityPageComponent),
  },
  {
    path: 'github',
    title: 'GitHub Profile · Jani Heikkinen',
    labelKey: 'github.title',
    descriptionKey: 'explore.githubDescription',
    keywordsKey: 'explore.githubKeywords',
    group: 'about',
    loadComponent: () => import('../pages/github.component').then((m) => m.GithubPageComponent),
  },
  {
    path: 'ascii',
    title: 'ASCII Art · Jani Heikkinen',
    labelKey: 'ascii.title',
    descriptionKey: 'explore.asciiDescription',
    keywordsKey: 'explore.asciiKeywords',
    group: 'experiments',
    loadComponent: () => import('../pages/ascii.component').then((m) => m.AsciiArtPageComponent),
  },
  {
    path: 'snake',
    title: 'Snake Game · Jani Heikkinen',
    labelKey: 'snake.title',
    descriptionKey: 'explore.snakeDescription',
    keywordsKey: 'explore.snakeKeywords',
    group: 'play',
    loadComponent: () => import('../pages/snake.component').then((m) => m.SnakePageComponent),
  },
  {
    path: 'pet',
    title: 'Virtual Pet · Jani Heikkinen',
    labelKey: 'pet.title',
    descriptionKey: 'explore.petDescription',
    keywordsKey: 'explore.petKeywords',
    group: 'play',
    loadComponent: () => import('../pages/pet.component').then((m) => m.PetPageComponent),
  },
  {
    path: 'sorting',
    title: 'Sorting Algorithms · Jani Heikkinen',
    labelKey: 'sorting.title',
    descriptionKey: 'explore.sortingDescription',
    keywordsKey: 'explore.sortingKeywords',
    group: 'experiments',
    loadComponent: () => import('../pages/sorting.component').then((m) => m.SortingPageComponent),
  },
  {
    path: 'searching',
    title: 'Searching Algorithms · Jani Heikkinen',
    labelKey: 'algorithms.searching',
    descriptionKey: 'explore.searchingDescription',
    keywordsKey: 'explore.searchingKeywords',
    group: 'experiments',
    loadComponent: () =>
      import('../pages/searching.component').then((m) => m.SearchingPageComponent),
  },
];

export function findPageGroups(query: string, translate: (key: TranslationKey) => string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return PAGE_GROUPS.map((group) => ({
    ...group,
    pages: SITE_PAGES.filter((page) => {
      const searchable = [
        page.path,
        translate(page.labelKey),
        translate(page.descriptionKey),
        translate(page.keywordsKey),
        translate(group.labelKey),
      ]
        .join(' ')
        .toLocaleLowerCase();
      return page.group === group.id && words.every((word) => searchable.includes(word));
    }),
  })).filter((group) => group.pages.length > 0);
}
