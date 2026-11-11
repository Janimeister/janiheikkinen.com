import { describe, expect, it } from 'vitest';
import { SITE_PAGES } from '../../navigation/page-registry';
import { EN_TRANSLATIONS } from '../translations';
import { FI_TRANSLATIONS } from '../translations.fi';
import { FI_PAGE_LOADERS } from './index';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('page translations', () => {
  it('has Finnish copy for every page that has its own', () => {
    const pagesWithCopy = SITE_PAGES.map((page) => page.path).filter(Boolean);

    expect(Object.keys(FI_PAGE_LOADERS).sort()).toEqual([...pagesWithCopy].sort());
  });

  it.each(Object.keys(FI_PAGE_LOADERS))(
    '%s has the same keys and placeholders in both languages',
    async (page) => {
      const english = await import(`./${page}.en.ts`);
      const en: Record<string, string> = english[`${page.toUpperCase()}_EN`];
      const fi = (await FI_PAGE_LOADERS[page]!()) as Record<string, string>;

      expect(Object.keys(fi).sort()).toEqual(Object.keys(en).sort());
      for (const key of Object.keys(en)) {
        expect(fi[key], key).toBeTruthy();
        expect(placeholders(fi[key]), key).toEqual(placeholders(en[key]));
      }
    },
  );

  it('keeps page copy out of the shared copy, apart from each page heading', async () => {
    for (const page of Object.keys(FI_PAGE_LOADERS)) {
      const shared = Object.keys(EN_TRANSLATIONS).filter((key) => key.startsWith(`${page}.`));
      expect(shared, page).toEqual([`${page}.title`]);
    }
    expect(Object.keys(FI_TRANSLATIONS).sort()).toEqual(Object.keys(EN_TRANSLATIONS).sort());
  });
});
