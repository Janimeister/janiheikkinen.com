import { describe, it, expect } from 'vitest';
import { routes } from './app.routes';

const EXPECTED_ROUTES = [
  '',
  'weather',
  'electricity',
  'trams',
  'github',
  'ascii',
  'snake',
  'pet',
  'sorting',
  'searching',
  'pathfinding',
  'third-party-notices',
];

describe('App Routes', () => {
  it('should have routes defined', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it.each(EXPECTED_ROUTES)('should have a lazy-loaded route for "%s"', (path) => {
    const route = routes.find((r) => r.path === path);
    expect(route).toBeTruthy();
    expect(route!.loadComponent).toBeDefined();
  });

  it('should send unknown paths to a not-found page that is kept out of search results', () => {
    const wildcardRoute = routes.find((r) => r.path === '**');
    expect(wildcardRoute).toBeTruthy();
    expect(wildcardRoute!.redirectTo).toBeUndefined();
    expect(wildcardRoute!.loadComponent).toBeDefined();
    expect(wildcardRoute!.data?.['noindex']).toBe(true);
  });

  it.each(EXPECTED_ROUTES)('should give "%s" a title and description', (path) => {
    const route = routes.find((r) => r.path === path)!;
    expect(route.data?.['metaKey']).toMatch(/^meta\./);
    if (path) expect(route.data?.['titleKey']).toBeTruthy();
  });
});
