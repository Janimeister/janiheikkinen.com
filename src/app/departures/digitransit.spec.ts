import { describe, expect, it } from 'vitest';
import {
  boardRequest,
  countdown,
  DigitransitError,
  parseBoard,
  parseSearch,
  searchRequest,
  STATION_QUERY,
  STOP_QUERY,
  toMode,
  upcoming,
  type BoardResponse,
  type Departure,
} from './digitransit';

// Service day 2026-10-04 in Helsinki (UTC+3): local midnight as epoch seconds.
const SERVICE_DAY = Date.UTC(2026, 9, 3, 21) / 1000;
const at = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;

function stoptime(overrides: Record<string, unknown> = {}) {
  return {
    serviceDay: SERVICE_DAY,
    scheduledDeparture: at(13, 10),
    realtimeDeparture: at(13, 12),
    departureDelay: 120,
    realtime: true,
    realtimeState: 'UPDATED',
    headsign: 'Kauppatori',
    stop: { platformCode: null },
    trip: { gtfsId: 'HSL:1004_20261004_Su_1_1300', route: { shortName: '4', mode: 'TRAM' } },
    ...overrides,
  };
}

const board = (stoptimes: unknown[]): BoardResponse => ({
  data: {
    place: {
      gtfsId: 'HSL:1130446',
      name: 'Kauppatori',
      code: 'H0405',
      platformCode: null,
      desc: 'Pohjoisesplanadi',
      vehicleMode: 'TRAM',
      routes: [{ shortName: '4' }, { shortName: '2' }, { shortName: '4' }],
      stoptimesWithoutPatterns: stoptimes as never,
    },
  },
});

describe('requests', () => {
  it('asks for stops or stations with the same variables', () => {
    expect(searchRequest('kamppi')).toEqual({
      query: expect.stringContaining('stations(name: $name)'),
      variables: { name: 'kamppi' },
    });
    expect(boardRequest('stop', 'HSL:1')).toEqual({
      query: STOP_QUERY,
      variables: { id: 'HSL:1', count: 12 },
    });
    expect(boardRequest('station', 'HSL:2').query).toBe(STATION_QUERY);
    expect(STOP_QUERY).toContain('omitCanceled: false');
  });
});

describe('parseBoard', () => {
  it('turns service-day seconds into times and keeps real-time delays', () => {
    const result = parseBoard(board([stoptime()]), 'stop')!;
    expect(result.place).toEqual({
      kind: 'stop',
      id: 'HSL:1130446',
      name: 'Kauppatori',
      code: 'H0405',
      platform: null,
      description: 'Pohjoisesplanadi',
      mode: 'TRAM',
      lines: ['2', '4'],
    });
    const [departure] = result.departures;
    expect(new Date(departure.time).toISOString()).toBe('2026-10-04T10:12:00.000Z');
    expect(new Date(departure.scheduled).toISOString()).toBe('2026-10-04T10:10:00.000Z');
    expect(departure).toMatchObject({
      line: '4',
      mode: 'TRAM',
      headsign: 'Kauppatori',
      delay: 120,
      realtime: true,
      cancelled: false,
    });
  });

  it('uses the timetable when there is no real-time prediction', () => {
    const [departure] = parseBoard(
      board([stoptime({ realtime: false, realtimeState: 'SCHEDULED', departureDelay: 0 })]),
      'stop',
    )!.departures;
    expect(departure.time).toBe(departure.scheduled);
    expect(departure.realtime).toBe(false);
  });

  it('marks cancellations, reads platforms and sorts by expected time', () => {
    const { departures } = parseBoard(
      board([
        stoptime({ realtimeDeparture: at(13, 20), scheduledDeparture: at(13, 5) }),
        stoptime({
          realtimeState: 'CANCELED',
          scheduledDeparture: at(13, 15),
          realtimeDeparture: at(13, 15),
          stop: { platformCode: '2' },
          trip: { gtfsId: 'HSL:3001I', route: { shortName: 'I', mode: 'RAIL' } },
        }),
      ]),
      'station',
    )!;
    expect(departures.map((d) => d.line)).toEqual(['I', '4']);
    expect(departures[0]).toMatchObject({ cancelled: true, platform: '2', mode: 'RAIL' });
    expect(new Set(departures.map((d) => d.key)).size).toBe(2);
  });

  it('returns null for an unknown stop and throws on API errors', () => {
    expect(parseBoard({ data: { place: null } }, 'stop')).toBeNull();
    expect(() => parseBoard({ errors: [{ message: 'Bad' }] }, 'stop')).toThrow(DigitransitError);
  });
});

describe('parseSearch', () => {
  const place = (gtfsId: string, name: string, code: string | null = null) => ({
    gtfsId,
    name,
    code,
    platformCode: null,
    desc: name,
    vehicleMode: 'BUS',
    routes: [],
  });

  it('lists stations first and ranks names that start with the query higher', () => {
    const results = parseSearch(
      {
        data: {
          stations: [place('HSL:1000003', 'Kamppi (M)')],
          stops: [place('HSL:1', 'Etelä-Kamppi', 'H1111'), place('HSL:2', 'Kamppi', 'H1112')],
        },
      },
      'kamppi',
    );
    expect(results.map((p) => p.id)).toEqual(['HSL:1000003', 'HSL:2', 'HSL:1']);
    expect(results[0].kind).toBe('station');
    expect(results[1]).toMatchObject({ kind: 'stop', code: 'H1112', description: null });
  });

  it('puts an exact stop code first', () => {
    const results = parseSearch(
      { data: { stops: [place('HSL:1', 'Lasipalatsi', 'H2000'), place('HSL:2', 'X', 'H2001')] } },
      'h2001',
    );
    expect(results[0].id).toBe('HSL:2');
  });

  it('throws on API errors', () => {
    expect(() => parseSearch({ errors: [{ message: 'Bad' }] }, 'x')).toThrow(DigitransitError);
  });
});

describe('countdown and upcoming', () => {
  const now = Date.UTC(2026, 9, 4, 10, 0);

  it('shows now, minutes under ten, then the clock', () => {
    expect(countdown(now + 59_000, now)).toEqual({ kind: 'now' });
    expect(countdown(now - 20_000, now)).toEqual({ kind: 'now' });
    expect(countdown(now + 3 * 60_000 + 30_000, now)).toEqual({ kind: 'minutes', minutes: 3 });
    expect(countdown(now + 10 * 60_000, now)).toEqual({ kind: 'clock' });
  });

  it('drops departures more than half a minute gone', () => {
    const departure = (offset: number) =>
      ({ key: String(offset), time: now + offset }) as Departure;
    expect(upcoming([departure(-31_000), departure(-29_000), departure(60_000)], now)).toHaveLength(
      2,
    );
  });

  it('knows HSL modes', () => {
    expect(toMode('SUBWAY')).toBe('SUBWAY');
    expect(toMode('AIRPLANE')).toBe('OTHER');
    expect(toMode(null)).toBe('OTHER');
  });
});
