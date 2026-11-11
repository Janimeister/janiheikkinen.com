import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { registerTranslations } from './dictionaries';
import { LANGUAGE_STORAGE_KEY, LanguageService } from './language.service';
import { WEATHER_EN } from './pages/weather.en';

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    TestBed.configureTestingModule({});
    // What the weather page does as its chunk loads.
    registerTranslations('en', WEATHER_EN);
  });

  it('defaults to English', () => {
    const service = TestBed.inject(LanguageService);

    expect(service.language()).toBe('en');
    expect(service.locale()).toBe('en-GB');
    expect(service.t('nav.weather')).toBe('Weather');
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches language and updates the document language', async () => {
    const service = TestBed.inject(LanguageService);

    await service.setLanguage('fi');

    expect(service.language()).toBe('fi');
    expect(service.locale()).toBe('fi-FI');
    expect(service.t('nav.weather')).toBe('Sää');
    expect(document.documentElement.lang).toBe('fi');
  });

  it('does not remember a language until the visitor chooses one', async () => {
    const service = TestBed.inject(LanguageService);

    await service.setLanguage('fi');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();

    service.remember('fi');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fi');
  });

  it("loads a page's own Finnish copy along with the shared copy", async () => {
    const service = TestBed.inject(LanguageService);

    await service.setLanguage('fi', 'weather');

    expect(service.t('weather.title')).toBe('Sääolosuhteet');
    expect(service.t('weather.search')).toBe('Hae');
  });

  it('falls back to English for copy that has not been loaded in Finnish', async () => {
    const service = TestBed.inject(LanguageService);
    registerTranslations('en', { 'test.onlyEnglish': 'Only in English' });

    await service.setLanguage('fi', 'no-such-page');

    expect(service.t('test.onlyEnglish' as never)).toBe('Only in English');
    expect(service.t('test.missing' as never)).toBe('test.missing');
  });

  it('interpolates translation parameters', () => {
    const service = TestBed.inject(LanguageService);

    expect(service.t('weather.noResults', { location: 'Tampere' })).toBe(
      'No results found for "Tampere".',
    );
  });

  it('keeps the latest choice when switches overlap', async () => {
    const service = TestBed.inject(LanguageService);

    const toFinnish = service.setLanguage('fi');
    const toEnglish = service.setLanguage('en');
    await Promise.all([toFinnish, toEnglish]);

    expect(service.language()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('writes links in the current language', async () => {
    const service = TestBed.inject(LanguageService);

    expect(service.path('/')).toBe('/');
    expect(service.path('/weather')).toBe('/weather');

    await service.setLanguage('fi');

    expect(service.path('/')).toBe('/fi');
    expect(service.path('/weather')).toBe('/fi/weather');
  });
});
