import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decodeConnack,
  decodePublish,
  decodeSuback,
  DISCONNECT,
  encodeConnect,
  encodeRemainingLength,
  encodeSubscribe,
  encodeUnsubscribe,
  MqttLiteClient,
  PacketReader,
  PINGREQ,
} from './mqtt-lite';

const bytes = (...values: number[]) => Uint8Array.from(values);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

/** A PUBLISH as the broker sends it: QoS 0, topic, payload. */
function publish(topic: string, payload: string): Uint8Array {
  const body = [topic.length >> 8, topic.length & 0xff, ...ascii(topic), ...ascii(payload)];
  return bytes(0x30, ...encodeRemainingLength(body.length), ...body);
}

describe('MQTT packet encoding', () => {
  it.each([
    [0, [0x00]],
    [127, [0x7f]],
    [128, [0x80, 0x01]],
    [16_383, [0xff, 0x7f]],
    [16_384, [0x80, 0x80, 0x01]],
    [268_435_455, [0xff, 0xff, 0xff, 0x7f]],
  ])('encodes a remaining length of %i', (length, expected) => {
    expect(encodeRemainingLength(length)).toEqual(expected);
  });

  it('encodes CONNECT for MQTT 3.1.1 with a clean session', () => {
    expect(encodeConnect('ab', 30)).toEqual(
      bytes(0x10, 14, 0, 4, ...ascii('MQTT'), 4, 0x02, 0, 30, 0, 2, ...ascii('ab')),
    );
  });

  it('encodes SUBSCRIBE with flags 0b0010 and QoS 0 for every filter', () => {
    expect(encodeSubscribe(1, ['a/#', 'b'])).toEqual(
      bytes(0x82, 12, 0, 1, 0, 3, ...ascii('a/#'), 0, 0, 1, ...ascii('b'), 0),
    );
  });

  it('encodes UNSUBSCRIBE with flags 0b0010 and no QoS bytes', () => {
    expect(encodeUnsubscribe(2, ['a/#', 'b'])).toEqual(
      bytes(0xa2, 10, 0, 2, 0, 3, ...ascii('a/#'), 0, 1, ...ascii('b')),
    );
  });

  it('encodes UTF-8 filters by byte length', () => {
    const packet = encodeSubscribe(7, ['ä']);
    expect([...packet.subarray(4, 6)]).toEqual([0, 2]);
  });

  it('has fixed PINGREQ and DISCONNECT packets', () => {
    expect(PINGREQ).toEqual(bytes(0xc0, 0));
    expect(DISCONNECT).toEqual(bytes(0xe0, 0));
  });
});

describe('MQTT packet decoding', () => {
  it('reads CONNACK and SUBACK', () => {
    const reader = new PacketReader();
    const [connack, suback] = reader.push(bytes(0x20, 2, 0, 0, 0x90, 4, 0, 1, 0, 0x80));
    expect(decodeConnack(connack)).toBe(0);
    expect(decodeSuback(suback)).toEqual({ packetId: 1, granted: [0, 0x80] });
  });

  it('reads a PUBLISH split across chunks and several in one chunk', () => {
    const first = publish('/hfp/v2/a', '{"VP":{}}');
    const second = publish('/hfp/v2/b', 'x'.repeat(200)); // two-byte remaining length
    const reader = new PacketReader();
    expect(reader.push(first.subarray(0, 1))).toEqual([]);
    expect(reader.push(first.subarray(1, 5))).toEqual([]);
    const joined = new Uint8Array([...first.subarray(5), ...second]);
    const packets = reader.push(joined);
    expect(packets.map((p) => decodePublish(p).topic)).toEqual(['/hfp/v2/a', '/hfp/v2/b']);
    expect(new TextDecoder().decode(decodePublish(packets[1]).payload)).toBe('x'.repeat(200));
  });

  it('skips the packet id of a QoS 1 PUBLISH', () => {
    const body = [0, 1, ...ascii('t'), 0, 9, ...ascii('hi')];
    const [packet] = new PacketReader().push(bytes(0x32, body.length, ...body));
    expect(new TextDecoder().decode(decodePublish(packet).payload)).toBe('hi');
  });

  it('rejects a remaining length longer than four bytes', () => {
    expect(() => new PacketReader().push(bytes(0x30, 0xff, 0xff, 0xff, 0xff, 0x01))).toThrow();
  });
});

/** Just enough of a WebSocket for the client: records sends, lets the test play the broker. */
class FakeSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  readyState = FakeSocket.CONNECTING;
  binaryType = 'blob';
  sent: Uint8Array[] = [];
  closedWith: number | undefined;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(
    readonly url: string,
    readonly protocol: string,
  ) {}

  send(data: Uint8Array) {
    this.sent.push(data);
  }
  close(code?: number) {
    this.closedWith = code;
    this.readyState = FakeSocket.CLOSED;
  }
  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }
  receive(data: Uint8Array) {
    this.onmessage?.({ data: data.slice().buffer });
  }
  drop(code = 1006) {
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.({ code, reason: '' });
  }
}

describe('MqttLiteClient', () => {
  let socket: FakeSocket;
  let messages: [string, string][];
  let events: string[];

  function client(keepAlive = 30) {
    messages = [];
    events = [];
    const c = new MqttLiteClient({
      url: 'wss://example.test/',
      filters: ['a/#'],
      keepAlive,
      clientId: 'test',
      createSocket: (url, protocol) => {
        socket = new FakeSocket(url, protocol);
        return socket as unknown as WebSocket;
      },
      onSubscribed: () => events.push('subscribed'),
      onMessage: (topic, payload) => messages.push([topic, new TextDecoder().decode(payload)]),
      onClose: (reason) => events.push(`closed: ${reason}`),
    });
    c.connect();
    return c;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeSocket);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('connects with the mqtt subprotocol, subscribes after CONNACK and delivers messages', () => {
    client();
    expect(socket.protocol).toBe('mqtt');
    socket.open();
    expect(socket.binaryType).toBe('arraybuffer');
    expect(socket.sent).toEqual([encodeConnect('test', 30)]);
    socket.receive(bytes(0x20, 2, 0, 0));
    expect(socket.sent[1]).toEqual(encodeSubscribe(1, ['a/#']));
    socket.receive(bytes(0x90, 3, 0, 1, 0));
    expect(events).toEqual(['subscribed']);
    socket.receive(publish('a/b', 'hello'));
    expect(messages).toEqual([['a/b', 'hello']]);
  });

  it('reports a refused connection and closes', () => {
    client();
    socket.open();
    socket.receive(bytes(0x20, 2, 0, 5));
    expect(events).toEqual(['closed: Connection refused (CONNACK 5)']);
    expect(socket.closedWith).toBe(1000);
  });

  it('pings at half the keep-alive and gives up when the broker goes quiet', () => {
    client(10);
    socket.open();
    socket.receive(bytes(0x20, 2, 0, 0));
    vi.advanceTimersByTime(5_000);
    expect(socket.sent.at(-1)).toEqual(PINGREQ);
    socket.receive(bytes(0xd0, 0));
    vi.advanceTimersByTime(15_000);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(5_000);
    expect(events).toEqual(['closed: Keep-alive timed out']);
  });

  it('reports a dropped socket once', () => {
    client();
    socket.open();
    socket.drop();
    expect(events).toEqual(['closed: Socket closed (1006)']);
  });

  it('changes the subscription on a live connection, subscribing before unsubscribing', () => {
    const c = client();
    socket.open();
    socket.receive(bytes(0x20, 2, 0, 0));
    socket.receive(bytes(0x90, 3, 0, 1, 0));
    c.setFilters(['b/#', 'c/#']);
    expect(socket.sent.slice(2)).toEqual([
      encodeSubscribe(2, ['b/#', 'c/#']),
      encodeUnsubscribe(3, ['a/#']),
    ]);
    // A later SUBACK doesn't count as coming live again.
    socket.receive(bytes(0x90, 4, 0, 2, 0, 0));
    expect(events).toEqual(['subscribed']);
    // Only the difference is sent.
    c.setFilters(['c/#']);
    expect(socket.sent.slice(4)).toEqual([encodeUnsubscribe(4, ['b/#'])]);
    c.setFilters(['c/#']);
    expect(socket.sent).toHaveLength(5);
  });

  it('subscribes to the latest filters when they change before the broker accepts', () => {
    const c = client();
    c.setFilters(['b/#']);
    socket.open();
    socket.receive(bytes(0x20, 2, 0, 0));
    expect(socket.sent.slice(1)).toEqual([encodeSubscribe(1, ['b/#'])]);
  });

  it('says goodbye with DISCONNECT and stays silent after close()', () => {
    const c = client();
    socket.open();
    c.close();
    expect(socket.sent.at(-1)).toEqual(DISCONNECT);
    expect(socket.closedWith).toBe(1000);
    expect(events).toEqual([]);
  });
});
