/** MQTT subscription filters for HSL's High-frequency positioning (HFP) feed. */

export const HFP_BROKER_URL = 'wss://mqtt.hsl.fi:443/';

/**
 * Geohash levels 0–3: the tram crossed a 0.001° line, which on our grid means it entered another
 * character cell. Level 0 also fires on other topic changes, like a new next stop. Levels 4 and 5
 * (92 % of the traffic) are movements inside a cell, so the map loses nothing without them.
 */
export const CELL_CHANGE_LEVELS: readonly number[] = [0, 1, 2, 3];

/**
 * Tram positions at the given geohash levels, plus `vjout` (the vehicle left its journey) so a
 * tram can be removed straight away. Every filter ends in `/#`, because HSL may add topic levels.
 */
export function tramFilters(levels: readonly number[] = CELL_CHANGE_LEVELS): string[] {
  return [
    // Operator, vehicle, route, direction, headsign, start time and next stop, then the level.
    ...levels.map((level) => `/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/${level}/#`),
    '/hfp/v2/journey/ongoing/vjout/tram/#',
  ];
}
