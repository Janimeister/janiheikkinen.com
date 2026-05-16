import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    TestBed.configureTestingModule({});
  });

  it('defaults to English', () => {
    const service = TestBed.inject(LanguageService);

    expect(service.language()).toBe('en');
    expect(service.locale()).toBe('en-GB');
    expect(service.t('nav.weather')).toBe('Weather');
  });

  it('persists selected language and updates document language', () => {
    const service = TestBed.inject(LanguageService);

    service.setLanguage('fi');

    expect(service.language()).toBe('fi');
    expect(service.locale()).toBe('fi-FI');
    expect(service.t('nav.weather')).toBe('Sää');
    expect(localStorage.getItem('app-language')).toBe('fi');
    expect(document.documentElement.lang).toBe('fi');
  });

  it('interpolates translation parameters', () => {
    const service = TestBed.inject(LanguageService);

    expect(service.t('weather.noResults', { location: 'Tampere' })).toBe('No results found for "Tampere".');
  });
});
