import { describe, expect, it } from 'vitest';
import { EN_TRANSLATIONS, FI_TRANSLATIONS } from '../i18n/translations';
import { routes } from '../app.routes';
import { findPageGroups, SITE_PAGES } from './page-registry';

const en = (key: keyof typeof EN_TRANSLATIONS) => EN_TRANSLATIONS[key];

describe('Page registry', () => {
  it('registers unique destinations with routes and complete bilingual metadata', () => {
    expect(new Set(SITE_PAGES.map((page) => page.path)).size).toBe(SITE_PAGES.length);
    for (const page of SITE_PAGES) {
      expect(routes.find((route) => route.path === page.path)?.loadComponent).toBe(
        page.loadComponent,
      );
      for (const key of [page.labelKey, page.descriptionKey, page.keywordsKey]) {
        expect(EN_TRANSLATIONS[key]).toBeTruthy();
        expect(FI_TRANSLATIONS[key]).toBeTruthy();
      }
    }
  });

  it('lists all pages for blank searches and hides empty groups when filtering', () => {
    expect(findPageGroups('   ', en).flatMap((group) => group.pages)).toHaveLength(
      SITE_PAGES.length,
    );
    expect(findPageGroups('MERGE algorithms', en).map((group) => group.id)).toEqual([
      'experiments',
    ]);
    expect(findPageGroups('MERGE algorithms', en)[0].pages.map((page) => page.path)).toEqual([
      'sorting',
    ]);
    expect(findPageGroups('no-such-page', en)).toEqual([]);
  });

  it('searches descriptions, group names and Finnish keywords', () => {
    expect(findPageGroups('forecast', en)[0].pages[0].path).toBe('weather');
    expect(findPageGroups('Everyday', en)[0].pages.map((page) => page.path)).toEqual([
      'weather',
      'electricity',
    ]);
    expect(findPageGroups('LÄMPÖTILA', (key) => FI_TRANSLATIONS[key])[0].pages[0].path).toBe(
      'weather',
    );
    expect(findPageGroups('binary search', en)[0].pages.map((page) => page.path)).toContain(
      'searching',
    );
  });
});
