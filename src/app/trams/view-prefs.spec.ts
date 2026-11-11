import { describe, expect, it } from 'vitest';
import { parseViewPrefs } from './view-prefs';

describe('tram map view settings', () => {
  it('reads back what was stored', () => {
    const prefs = { preset: 'network', glyphs: 'unicode', smooth: true, trails: false };

    expect(parseViewPrefs(JSON.stringify(prefs))).toEqual(prefs);
  });

  it('uses the defaults when nothing usable is stored', () => {
    expect(parseViewPrefs(null)).toEqual({});
    expect(parseViewPrefs(undefined)).toEqual({});
    expect(parseViewPrefs('not json')).toEqual({});
    expect(parseViewPrefs('null')).toEqual({});
  });

  it('ignores values it does not understand, keeping the rest', () => {
    const raw = JSON.stringify({ preset: 'moon', glyphs: 'emoji', smooth: 'yes', trails: true });

    expect(parseViewPrefs(raw)).toEqual({ trails: true });
  });
});
