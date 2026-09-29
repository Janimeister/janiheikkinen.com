import { describe, expect, it } from 'vitest';
import { routeIdForLine, tramFilters } from './hfp-filters';

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

  it('subscribes per route and level when lines are chosen', () => {
    expect(tramFilters([2, 3], ['1004', '1004 4'])).toEqual([
      '/hfp/v2/journey/ongoing/vp/tram/+/+/1004/+/+/+/+/2/#',
      '/hfp/v2/journey/ongoing/vp/tram/+/+/1004/+/+/+/+/3/#',
      '/hfp/v2/journey/ongoing/vp/tram/+/+/1004 4/+/+/+/+/2/#',
      '/hfp/v2/journey/ongoing/vp/tram/+/+/1004 4/+/+/+/+/3/#',
      '/hfp/v2/journey/ongoing/vjout/tram/#',
    ]);
    expect(tramFilters([2], ['1004'])[0].split('/')[9]).toBe('1004');
  });

  it('keeps only the sign-offs when no line is chosen', () => {
    expect(tramFilters(undefined, [])).toEqual(['/hfp/v2/journey/ongoing/vjout/tram/#']);
  });
});

describe('routeIdForLine', () => {
  it.each([
    ['1', '1001'],
    ['4', '1004'],
    ['10', '1010'],
    ['13', '1013'],
    ['H', '100H'],
  ])('maps line %s to route %s', (line, routeId) => {
    expect(routeIdForLine(line)).toBe(routeId);
  });
});
