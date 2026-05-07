import { describe, it, expect } from 'vitest';
import { routes } from './app.routes';

const EXPECTED_ROUTES = ['', 'weather', 'electricity', 'github', 'ascii', 'snake', 'pet'];

describe('App Routes', () => {
  it('should have routes defined', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it.each(EXPECTED_ROUTES)('should have a lazy-loaded route for "%s"', (path) => {
    const route = routes.find(r => r.path === path);
    expect(route).toBeTruthy();
    expect(route!.loadComponent).toBeDefined();
  });

  it('should have a wildcard redirect to home', () => {
    const wildcardRoute = routes.find(r => r.path === '**');
    expect(wildcardRoute).toBeTruthy();
    expect(wildcardRoute!.redirectTo).toBe('');
  });
});
