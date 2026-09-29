import type { Route } from '@angular/router';
import type { TranslationKey } from '../i18n/translations';

export const PAGE_GROUPS = [
  { id: 'everyday', labelKey: 'explore.everyday' },
  { id: 'experiments', labelKey: 'explore.experiments' },
  { id: 'play', labelKey: 'explore.play' },
  { id: 'about', labelKey: 'explore.about' },
] as const satisfies readonly { id: string; labelKey: TranslationKey }[];

export const SITE_NAME = 'Jani Heikkinen';
export const SITE_URL = 'https://janiheikkinen.com';

/** What a route tells the title strategy: its page heading and its meta description. */
export interface PageMeta {
  /** The page's heading, shown before the site name; the home page shows the name alone. */
  titleKey?: TranslationKey;
  metaKey: TranslationKey;
  /** Keeps a page out of search results, e.g. "not found". */
  noindex?: boolean;
}

/** The same heading as the page's `<h1>`, then the site name; the home page is the name alone. */
export function pageTitle(heading: string | null): string {
  return heading ? `${heading} · ${SITE_NAME}` : SITE_NAME;
}

/** The address search engines should index for a path, without query or fragment. */
export function canonicalUrl(url: string): string {
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '');
  return `${SITE_URL}${path || '/'}`;
}

export interface SitePage extends PageMeta {
  path: string;
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
    metaKey: 'meta.home',
    labelKey: 'nav.home',
    descriptionKey: 'explore.homeDescription',
    keywordsKey: 'explore.homeKeywords',
    group: 'about',
    loadComponent: () => import('../pages/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'weather',
    titleKey: 'weather.title',
    metaKey: 'meta.weather',
    labelKey: 'nav.weather',
    descriptionKey: 'explore.weatherDescription',
    keywordsKey: 'explore.weatherKeywords',
    group: 'everyday',
    loadComponent: () => import('../pages/weather.component').then((m) => m.WeatherPageComponent),
  },
  {
    path: 'electricity',
    titleKey: 'electricity.title',
    metaKey: 'meta.electricity',
    labelKey: 'electricity.title',
    descriptionKey: 'explore.electricityDescription',
    keywordsKey: 'explore.electricityKeywords',
    group: 'everyday',
    loadComponent: () =>
      import('../pages/electricity.component').then((m) => m.ElectricityPageComponent),
  },
  {
    path: 'trams',
    titleKey: 'trams.title',
    metaKey: 'meta.trams',
    labelKey: 'trams.title',
    descriptionKey: 'explore.tramsDescription',
    keywordsKey: 'explore.tramsKeywords',
    group: 'everyday',
    loadComponent: () => import('../pages/trams.component').then((m) => m.TramsPageComponent),
  },
  {
    path: 'github',
    titleKey: 'github.title',
    metaKey: 'meta.github',
    labelKey: 'github.title',
    descriptionKey: 'explore.githubDescription',
    keywordsKey: 'explore.githubKeywords',
    group: 'about',
    loadComponent: () => import('../pages/github.component').then((m) => m.GithubPageComponent),
  },
  {
    path: 'ascii',
    titleKey: 'ascii.title',
    metaKey: 'meta.ascii',
    labelKey: 'ascii.title',
    descriptionKey: 'explore.asciiDescription',
    keywordsKey: 'explore.asciiKeywords',
    group: 'experiments',
    loadComponent: () => import('../pages/ascii.component').then((m) => m.AsciiArtPageComponent),
  },
  {
    path: 'snake',
    titleKey: 'snake.title',
    metaKey: 'meta.snake',
    labelKey: 'snake.title',
    descriptionKey: 'explore.snakeDescription',
    keywordsKey: 'explore.snakeKeywords',
    group: 'play',
    loadComponent: () => import('../pages/snake.component').then((m) => m.SnakePageComponent),
  },
  {
    path: 'pet',
    titleKey: 'pet.title',
    metaKey: 'meta.pet',
    labelKey: 'pet.title',
    descriptionKey: 'explore.petDescription',
    keywordsKey: 'explore.petKeywords',
    group: 'play',
    loadComponent: () => import('../pages/pet.component').then((m) => m.PetPageComponent),
  },
  {
    path: 'sorting',
    titleKey: 'sorting.title',
    metaKey: 'meta.sorting',
    labelKey: 'sorting.title',
    descriptionKey: 'explore.sortingDescription',
    keywordsKey: 'explore.sortingKeywords',
    group: 'experiments',
    loadComponent: () => import('../pages/sorting.component').then((m) => m.SortingPageComponent),
  },
  {
    path: 'searching',
    titleKey: 'searching.title',
    metaKey: 'meta.searching',
    labelKey: 'algorithms.searching',
    descriptionKey: 'explore.searchingDescription',
    keywordsKey: 'explore.searchingKeywords',
    group: 'experiments',
    loadComponent: () =>
      import('../pages/searching.component').then((m) => m.SearchingPageComponent),
  },
  {
    path: 'pathfinding',
    titleKey: 'pathfinding.title',
    metaKey: 'meta.pathfinding',
    labelKey: 'algorithms.pathfinding',
    descriptionKey: 'explore.pathfindingDescription',
    keywordsKey: 'explore.pathfindingKeywords',
    group: 'experiments',
    loadComponent: () =>
      import('../pages/pathfinding.component').then((m) => m.PathfindingPageComponent),
  },
];

/** Pages outside the launcher, reached from the footer. */
export const NOTICES_PAGE = {
  path: 'third-party-notices',
  titleKey: 'thirdParty.title',
  metaKey: 'meta.thirdParty',
} as const satisfies PageMeta & { path: string };

export const NOT_FOUND_PAGE = {
  titleKey: 'notFound.title',
  metaKey: 'meta.home',
  noindex: true,
} as const satisfies PageMeta;

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
