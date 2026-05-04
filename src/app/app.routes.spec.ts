import { describe, it, expect } from 'vitest';
import { routes } from './app.routes';

describe('App Routes', () => {
  it('should have routes defined', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it('should have a home route at empty path', () => {
    const homeRoute = routes.find(r => r.path === '');
    expect(homeRoute).toBeTruthy();
    expect(homeRoute!.loadComponent).toBeDefined();
  });

  it('should have a weather route', () => {
    const route = routes.find(r => r.path === 'weather');
    expect(route).toBeTruthy();
    expect(route!.loadComponent).toBeDefined();
  });

  it('should have an electricity route', () => {
    const route = routes.find(r => r.path === 'electricity');
    expect(route).toBeTruthy();
    expect(route!.loadComponent).toBeDefined();
  });

  it('should have a github route', () => {
    const route = routes.find(r => r.path === 'github');
    expect(route).toBeTruthy();
    expect(route!.loadComponent).toBeDefined();
  });

  it('should have an ascii route', () => {
    const route = routes.find(r => r.path === 'ascii');
    expect(route).toBeTruthy();
    expect(route!.loadComponent).toBeDefined();
  });

  it('should have a snake route', () => {
    const route = routes.find(r => r.path === 'snake');
    expect(route).toBeTruthy();
    expect(route!.loadComponent).toBeDefined();
  });

  it('should have a pet route', () => {
    const route = routes.find(r => r.path === 'pet');
    expect(route).toBeTruthy();
    expect(route!.loadComponent).toBeDefined();
  });

  it('should have a wildcard redirect to home', () => {
    const wildcardRoute = routes.find(r => r.path === '**');
    expect(wildcardRoute).toBeTruthy();
    expect(wildcardRoute!.redirectTo).toBe('');
  });
});
