import { describe, expect, it } from 'vitest';
import { languageOfUrl, localizeUrl, pageOfUrl, stripLanguage } from './localized-url';

describe('localized URLs', () => {
  it('reads the language from the address', () => {
    expect(languageOfUrl('/')).toBe('en');
    expect(languageOfUrl('/weather')).toBe('en');
    expect(languageOfUrl('/fi')).toBe('fi');
    expect(languageOfUrl('/fi/')).toBe('fi');
    expect(languageOfUrl('/fi/weather')).toBe('fi');
    expect(languageOfUrl('/fi?x=1')).toBe('fi');
  });

  it('does not mistake a page whose name starts with "fi" for Finnish', () => {
    expect(languageOfUrl('/finland')).toBe('en');
    expect(stripLanguage('/finland')).toBe('/finland');
    expect(localizeUrl('/finland', 'fi')).toBe('/fi/finland');
  });

  it('removes the language prefix', () => {
    expect(stripLanguage('/fi')).toBe('/');
    expect(stripLanguage('/fi/')).toBe('/');
    expect(stripLanguage('/fi/weather')).toBe('/weather');
    expect(stripLanguage('/fi?stop=1')).toBe('/?stop=1');
    expect(stripLanguage('/weather')).toBe('/weather');
  });

  it('moves an address to another language, keeping query and fragment', () => {
    expect(localizeUrl('/', 'fi')).toBe('/fi');
    expect(localizeUrl('/weather', 'fi')).toBe('/fi/weather');
    expect(localizeUrl('/departures?stop=HSL:1#board', 'fi')).toBe(
      '/fi/departures?stop=HSL:1#board',
    );
    expect(localizeUrl('/?x=1', 'fi')).toBe('/fi?x=1');
    expect(localizeUrl('/fi/departures?stop=HSL:1', 'en')).toBe('/departures?stop=HSL:1');
    expect(localizeUrl('/fi', 'en')).toBe('/');
  });

  it('names the page an address is for', () => {
    expect(pageOfUrl('/')).toBe('');
    expect(pageOfUrl('/fi')).toBe('');
    expect(pageOfUrl('/weather')).toBe('weather');
    expect(pageOfUrl('/fi/weather?x=1#top')).toBe('weather');
    expect(pageOfUrl('/fi/departures/')).toBe('departures');
  });

  it('leaves an address alone when it is already in that language', () => {
    expect(localizeUrl('/weather', 'en')).toBe('/weather');
    expect(localizeUrl('/fi/weather', 'fi')).toBe('/fi/weather');
  });
});
