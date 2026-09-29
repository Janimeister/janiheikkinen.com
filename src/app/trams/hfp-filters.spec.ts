import { describe, expect, it } from 'vitest';
import { tramFilters } from './hfp-filters';

describe('HFP subscription filters', () => {
  it('subscribes to geohash levels 0–3 and sign-offs by default', () => {
    expect(tramFilters()).toEqual([
      '/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/0/#',
      '/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/1/#',
      '/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/2/#',
      '/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/3/#',
      '/hfp/v2/journey/ongoing/vjout/tram/#',
    ]);
  });

  it('puts the level at the geohash level position of the topic, index 14', () => {
    expect(tramFilters([2])[0].split('/')[14]).toBe('2');
  });
});
