import { describe, it, expect } from 'vitest';
import type { Route } from '@angular/router';
import { routes } from './app.routes';

const EXPECTED_ROUTES = [
  '',
  'weather',
  'electricity',
  'trams',
  'departures',
  'github',
  'ascii',
  'snake',
  'pet',
  'sorting',
  'searching',
  'pathfinding',
  'third-party-notices',
];

const finnish = routes.find((r) => r.path === 'fi')!.children!;

describe('App Routes', () => {
  it('should have routes defined', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  describe.each([
    ['English, at the root', routes],
    ['Finnish, under /fi', finnish],
  ])('%s', (_, list: Route[]) => {
    it.each(EXPECTED_ROUTES)('should have a lazy-loaded route for "%s"', (path) => {
      const route = list.find((r) => r.path === path);
      expect(route).toBeTruthy();
      expect(route!.loadComponent).toBeDefined();
    });

    it.each(EXPECTED_ROUTES)('should give "%s" a title and description', (path) => {
      const route = list.find((r) => r.path === path)!;
      expect(route.data?.['metaKey']).toMatch(/^meta\./);
      if (path) expect(route.data?.['titleKey']).toBeTruthy();
    });

    it('should set the language before any page is shown', () => {
      for (const route of list.filter((r) => r.loadComponent)) {
        expect(route.resolve?.['language'], route.path).toBeTypeOf('function');
      }
    });

    it('should end with a not-found page that is kept out of search results', () => {
      const wildcardRoute = list[list.length - 1];
      expect(wildcardRoute.path).toBe('**');
      expect(wildcardRoute.redirectTo).toBeUndefined();
      expect(wildcardRoute.loadComponent).toBeDefined();
      expect(wildcardRoute.data?.['noindex']).toBe(true);
    });
  });

  it('should list the Finnish pages before the English catch-all', () => {
    const paths = routes.map((r) => r.path);
    expect(paths.indexOf('fi')).toBeLessThan(paths.indexOf('**'));
  });

  it('should give the not-found page an address the build can prerender', () => {
    const route = routes.find((r) => r.path === '404');
    expect(route?.loadComponent).toBeDefined();
    expect(route?.data?.['noindex']).toBe(true);
  });
});
