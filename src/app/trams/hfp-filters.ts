/** MQTT subscription filters for HSL's High-frequency positioning (HFP) feed. */

export const HFP_BROKER_URL = 'wss://mqtt.hsl.fi:443/';

/**
 * Geohash levels 0–3: the tram crossed a 0.001° line, which on our grid means it entered another
 * character cell. Level 0 also fires on other topic changes, like a new next stop. Levels 4 and 5
 * (92 % of the traffic) are movements inside a cell, so the map loses nothing without them.
 */
export const CELL_CHANGE_LEVELS: readonly number[] = [0, 1, 2, 3];

/**
 * The GTFS `route_id` of a line's normal trips: `4` → `1004`, `13` → `1013`, `H` → `100H`.
 * Variants carry a suffix (`1004H`, `100HA5`, even `1004 4`), which MQTT doesn't match with it.
 */
export function routeIdForLine(line: string): string {
  return /^\d+$/.test(line) ? `10${line.padStart(2, '0')}` : `100${line}`;
}

/**
 * Tram positions at the given geohash levels, plus `vjout` (the vehicle left its journey) so a
 * tram can be removed straight away. Every filter ends in `/#`, because HSL may add topic levels.
 *
 * With `routeIds`, only those routes: one filter per route and level, all in one SUBSCRIBE. An
 * empty list leaves just the sign-offs.
 */
export function tramFilters(
  levels: readonly number[] = CELL_CHANGE_LEVELS,
  routeIds: readonly string[] | null = null,
): string[] {
  // Operator, vehicle, route, direction, headsign, start time and next stop, then the level.
  const positions = (routeId: string) =>
    levels.map((level) => `/hfp/v2/journey/ongoing/vp/tram/+/+/${routeId}/+/+/+/+/${level}/#`);
  return [
    ...(routeIds === null ? positions('+') : routeIds.flatMap(positions)),
    '/hfp/v2/journey/ongoing/vjout/tram/#',
  ];
}
