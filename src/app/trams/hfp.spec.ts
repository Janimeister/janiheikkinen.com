import { describe, expect, it } from 'vitest';
import {
  Deduplicator,
  isDepotRun,
  isExcludedLine,
  isInside,
  parseHfpMessage,
  parseTopic,
  type TramState,
} from './hfp';

// Real messages, recorded from wss://mqtt.hsl.fi on 29 Sep 2026 (see e2e/fixtures/hfp-sample.json).
const LINE_4_VARIANT = {
  topic:
    '/hfp/v2/journey/ongoing/vp/tram/0040/00648/1004 4/2/Katajanokka/07:40/1080403/3/60;24/19/66/72',
  payload:
    '{"VP":{"desi":"4","dir":"2","oper":40,"veh":648,"tst":"2026-09-29T04:53:45.256Z","tsi":1790657625,"spd":4.20,"hdg":36,"lat":60.167548,"long":24.962017,"acc":0.20,"dl":-111,"odo":3011,"drst":0,"oday":"2026-09-29","jrn":3584,"line":32,"start":"07:40","loc":"GPS","stop":null,"route":"1004 4","occu":0}}',
};
const LINE_13_NO_DELAY = {
  topic: '/hfp/v2/journey/ongoing/vp/tram/0040/00641/1013/1/Ilmala/07:55/1100403/3/60;24/19/77/81',
  payload:
    '{"VP":{"desi":"13","dir":"1","oper":40,"veh":641,"tst":"2026-09-29T04:53:44.257Z","tsi":1790657624,"spd":4.93,"hdg":211,"lat":60.178980,"long":24.971636,"acc":-0.03,"dl":null,"odo":208,"drst":0,"oday":"2026-09-29","jrn":1999,"line":1145,"start":"07:55","loc":"GPS","stop":null,"route":"1013","occu":0}}',
};
const DEPOT_RUN = {
  topic:
    '/hfp/v2/journey/ongoing/vp/tram/0040/00443/100HC3/1/Kuusitie/07:48/1180439/3/60;24/19/90/37',
  payload:
    '{"VP":{"desi":"H","dir":"1","oper":40,"veh":443,"tst":"2026-09-29T04:54:03.255Z","tsi":1790657643,"spd":9.30,"hdg":305,"lat":60.193040,"long":24.907922,"acc":-0.21,"dl":0,"odo":2155,"drst":0,"oday":"2026-09-29","jrn":2627,"line":1177,"start":"07:48","loc":"GPS","stop":null,"route":"100HC3","occu":0}}',
};
const RAIDE_JOKERI_NO_POSITION = {
  topic: '/hfp/v2/journey/ongoing/vp/tram/0040/00621/2015/2/Itäkeskus (M)/07:23/1291406/0////',
  payload:
    '{"VP":{"desi":"15","dir":"2","oper":40,"veh":621,"tst":"2026-09-29T04:53:20.255Z","tsi":1790657600,"spd":null,"hdg":null,"lat":null,"long":null,"acc":null,"dl":-169,"odo":10565,"drst":0,"oday":"2026-09-29","jrn":992,"line":1142,"start":"07:23","loc":"GPS","stop":null,"route":"2015","occu":0}}',
};
const SIGN_OFF = {
  topic:
    '/hfp/v2/journey/ongoing/vjout/tram/0040/00457/100HI5/2/Ilmala/07:33/1171401/5/60;24/29/02/60',
  payload:
    '{"VJOUT":{"desi":"H","dir":"2","oper":40,"veh":457,"tst":"2026-09-29T04:53:12.758Z","tsi":1790657592,"spd":0.00,"hdg":28,"lat":60.206677,"long":24.920177,"acc":-0.07,"dl":-310,"odo":5091,"drst":0,"oday":"2026-09-29","jrn":2844,"line":1177,"start":"07:33","loc":"GPS","stop":1171401,"route":"100HI5","occu":0,"dr-type":1,"block":186}}',
};

function position(message: { topic: string; payload: string }): TramState {
  const event = parseHfpMessage(message.topic, message.payload, 1_000);
  if (event?.kind !== 'position') throw new Error(`Expected a position, got ${event?.kind}`);
  return event.tram;
}

describe('HFP topic', () => {
  it('reads every level we use, including a route id with a space', () => {
    expect(parseTopic(LINE_4_VARIANT.topic)).toEqual({
      eventType: 'vp',
      transportMode: 'tram',
      vehicleKey: '40/648',
      routeId: '1004 4',
      direction: '2',
      headsign: 'Katajanokka',
      startTime: '07:40',
      nextStop: '1080403',
      geohashLevel: 3,
    });
  });

  it('keeps non-ASCII headsigns and reads the level of a topic without a position', () => {
    const topic = parseTopic(RAIDE_JOKERI_NO_POSITION.topic)!;
    expect(topic.headsign).toBe('Itäkeskus (M)');
    expect(topic.geohashLevel).toBe(0);
  });

  it('rejects other topics', () => {
    expect(parseTopic('/hfp/v1/journey/ongoing/vp/tram')).toBeNull();
    expect(parseTopic('/gtfsrt/vp/tram')).toBeNull();
  });
});

describe('HFP message', () => {
  it('turns a position into tram state', () => {
    expect(position(LINE_4_VARIANT)).toEqual({
      key: '40/648',
      desi: '4',
      routeId: '1004 4',
      direction: '2',
      headsign: 'Katajanokka',
      nextStop: '1080403',
      lat: 60.167548,
      lon: 24.962017,
      heading: 36,
      speed: 4.2,
      delay: -111,
      doorsOpen: false,
      stop: null,
      tst: Date.parse('2026-09-29T04:53:45.256Z'),
      receivedAt: 1_000,
      depotRun: false,
    });
  });

  it('keeps a null delay as unknown', () => {
    expect(position(LINE_13_NO_DELAY).delay).toBeNull();
  });

  it('marks depot runs', () => {
    const tram = position(DEPOT_RUN);
    expect(tram.desi).toBe('H');
    expect(tram.routeId).toBe('100HC3');
    expect(tram.depotRun).toBe(true);
  });

  it('drops Raide-Jokeri and positions without coordinates', () => {
    expect(
      parseHfpMessage(RAIDE_JOKERI_NO_POSITION.topic, RAIDE_JOKERI_NO_POSITION.payload),
    ).toBeNull();
    const line4WithoutPosition = LINE_4_VARIANT.payload
      .replace('"lat":60.167548', '"lat":null')
      .replace('"long":24.962017', '"long":null');
    expect(parseHfpMessage(LINE_4_VARIANT.topic, line4WithoutPosition)).toBeNull();
  });

  it('reads a sign-off as the end of that vehicle', () => {
    expect(parseHfpMessage(SIGN_OFF.topic, SIGN_OFF.payload)).toEqual({
      kind: 'signoff',
      key: '40/457',
      dedupeKey: 'vjout/40/457/2026-09-29T04:53:12.758Z',
    });
  });

  it('ignores other modes, other events and broken payloads', () => {
    const bus = LINE_4_VARIANT.topic.replace('/tram/', '/bus/');
    expect(parseHfpMessage(bus, LINE_4_VARIANT.payload)).toBeNull();
    const arrival = LINE_4_VARIANT.topic.replace('/vp/', '/arr/');
    expect(parseHfpMessage(arrival, LINE_4_VARIANT.payload.replace('"VP"', '"ARR"'))).toBeNull();
    expect(parseHfpMessage(LINE_4_VARIANT.topic, '{"VP":')).toBeNull();
    expect(parseHfpMessage(LINE_4_VARIANT.topic, '{"VP":{"desi":"4"}}')).toBeNull();
  });

  it('gives the four delivered copies of a message the same dedupe key', () => {
    const keys = Array.from({ length: 4 }, () => {
      const event = parseHfpMessage(LINE_4_VARIANT.topic, LINE_4_VARIANT.payload);
      return event?.dedupeKey;
    });
    expect(new Set(keys)).toEqual(new Set(['vp/40/648/2026-09-29T04:53:45.256Z']));
  });
});

describe('HFP line rules', () => {
  it.each([
    ['2015', '15', true],
    ['2015', '', true],
    ['1015', '15', true],
    ['1004 4', '4', false],
    ['1001H6', '1H', false],
  ])('excludes route %s / line %s: %s', (route, desi, excluded) => {
    expect(isExcludedLine(route, desi)).toBe(excluded);
  });

  it.each([
    ['H', true],
    ['1H', true],
    ['4', false],
    ['10', false],
  ])('treats line %s as a depot run: %s', (desi, depot) => {
    expect(isDepotRun(desi)).toBe(depot);
  });

  it('checks the map box inclusively', () => {
    const box = { south: 60.148, west: 24.865, north: 60.22, east: 25.056 };
    expect(isInside({ lat: 60.17, lon: 24.94 }, box)).toBe(true);
    expect(isInside({ lat: 60.22, lon: 25.056 }, box)).toBe(true);
    expect(isInside({ lat: 60.209645, lon: 25.074704 }, box)).toBe(false);
  });
});

describe('Deduplicator', () => {
  it('accepts a key once', () => {
    const dedupe = new Deduplicator();
    expect([1, 2, 3, 4].map(() => dedupe.accept('a'))).toEqual([true, false, false, false]);
    expect(dedupe.accept('b')).toBe(true);
  });

  it('forgets the oldest keys beyond its capacity', () => {
    const dedupe = new Deduplicator(2);
    dedupe.accept('a');
    dedupe.accept('b');
    dedupe.accept('c');
    expect(dedupe.accept('b')).toBe(false);
    expect(dedupe.accept('a')).toBe(true);
  });
});
