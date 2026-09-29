import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { LanguageService } from '../i18n/language.service';
import { canonicalUrl, pageTitle, type PageMeta } from './page-registry';
import { PageTitleStrategy } from './page-title.strategy';

@Component({ template: '' })
class BlankComponent {}

describe('PageTitleStrategy', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.querySelectorAll('link[rel="canonical"], meta').forEach((el) => el.remove());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: BlankComponent, data: { metaKey: 'meta.home' } satisfies PageMeta },
          {
            path: 'weather',
            component: BlankComponent,
            data: { titleKey: 'weather.title', metaKey: 'meta.weather' } satisfies PageMeta,
          },
          {
            path: '**',
            component: BlankComponent,
            data: { titleKey: 'notFound.title', metaKey: 'meta.home', noindex: true } satisfies PageMeta,
          },
        ]),
        { provide: TitleStrategy, useClass: PageTitleStrategy },
      ],
    });
  });

  const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
  const metaContent = (selector: string) => document.head.querySelector(selector)?.getAttribute('content');

  it('builds titles and canonical URLs', () => {
    expect(pageTitle(null)).toBe('Jani Heikkinen');
    expect(pageTitle('Tram Map')).toBe('Tram Map · Jani Heikkinen');
    expect(canonicalUrl('/')).toBe('https://janiheikkinen.com/');
    expect(canonicalUrl('/weather?x=1#top')).toBe('https://janiheikkinen.com/weather');
    expect(canonicalUrl('/weather/')).toBe('https://janiheikkinen.com/weather');
  });

  it('sets the title, description and canonical link for each page', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/weather');
    TestBed.tick();
    expect(document.title).toBe('Weather Conditions · Jani Heikkinen');
    expect(canonical()).toBe('https://janiheikkinen.com/weather');
    expect(metaContent('meta[name="description"]')).toContain('Open-Meteo');
    expect(metaContent('meta[property="og:url"]')).toBe('https://janiheikkinen.com/weather');

    await router.navigateByUrl('/');
    TestBed.tick();
    expect(document.title).toBe('Jani Heikkinen');
    expect(canonical()).toBe('https://janiheikkinen.com/');
  });

  it('keeps unknown pages out of search results', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/nope');
    TestBed.tick();
    expect(document.title).toBe('Page not found · Jani Heikkinen');
    expect(canonical()).toBeUndefined();
    expect(metaContent('meta[name="robots"]')).toBe('noindex');

    await router.navigateByUrl('/weather');
    TestBed.tick();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    expect(canonical()).toBe('https://janiheikkinen.com/weather');
  });

  it('translates the title when the language changes', async () => {
    await TestBed.inject(Router).navigateByUrl('/weather');
    await TestBed.inject(LanguageService).setLanguage('fi');
    TestBed.tick();

    expect(document.title).toBe('Sääolosuhteet · Jani Heikkinen');
    expect(metaContent('meta[name="description"]')).toContain('Open-Meteon');
  });
});
