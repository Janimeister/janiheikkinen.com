import type { Page, WebSocketRoute } from '@playwright/test';
import sample from './fixtures/hfp-sample.json' with { type: 'json' };

export interface HfpMessage {
  topic: string;
  payload: string;
  /** How many times the real broker delivered it (every position came 4 times). */
  copies?: number;
}

/** Real messages recorded from wss://mqtt.hsl.fi, see the fixture's description. */
export const HFP_SAMPLE: readonly HfpMessage[] = sample.messages;
/** Trams the sample leaves on the map: no line 15, no missing positions, no signed-off vehicles. */
export const HFP_SAMPLE_TRAMS = 77;

function remainingLength(length: number): number[] {
  const bytes: number[] = [];
  do {
    let byte = length % 128;
    length = Math.floor(length / 128);
    if (length > 0) byte |= 0x80;
    bytes.push(byte);
  } while (length > 0);
  return bytes;
}

export function publishPacket({ topic, payload }: HfpMessage): Buffer {
  const t = Buffer.from(topic, 'utf8');
  const body = Buffer.concat([
    Buffer.from([t.length >> 8, t.length & 0xff]),
    t,
    Buffer.from(payload, 'utf8'),
  ]);
  return Buffer.concat([Buffer.from([0x30, ...remainingLength(body.length)]), body]);
}

export interface MockBroker {
  /** Open connections, newest last. */
  readonly connections: WebSocketRoute[];
  /** The filters of each SUBSCRIBE received. */
  readonly subscriptions: string[][];
  /** The filters of each UNSUBSCRIBE received. */
  readonly unsubscriptions: string[][];
  /** Resolves once a client has subscribed `count` times in total. */
  subscribed(count?: number): Promise<void>;
  /** Sends messages to the newest connection, each as many times as the real broker did. */
  publish(messages: readonly HfpMessage[]): void;
  /** Drops every connection, like a broker restart. */
  closeAll(): Promise<void>;
}

/**
 * Stands in for the HFP broker: answers CONNECT, SUBSCRIBE, UNSUBSCRIBE and PINGREQ like
 * wss://mqtt.hsl.fi, then optionally replays messages after each subscription.
 */
export async function mockHfpBroker(
  page: Page,
  { replay = [] as readonly HfpMessage[] } = {},
): Promise<MockBroker> {
  const connections: WebSocketRoute[] = [];
  const subscriptions: string[][] = [];
  const unsubscriptions: string[][] = [];
  const waiters: { count: number; resolve: () => void }[] = [];

  const publish = (ws: WebSocketRoute, messages: readonly HfpMessage[]) => {
    for (const message of messages) {
      for (let i = 0; i < (message.copies ?? 1); i++) ws.send(publishPacket(message));
    }
  };

  await page.routeWebSocket(/^wss:\/\/mqtt\.hsl\.fi/, (ws) => {
    connections.push(ws);
    ws.onMessage((data) => {
      const packet = typeof data === 'string' ? Buffer.from(data) : data;
      switch (packet[0] >> 4) {
        case 1: // CONNECT → CONNACK accepted
          ws.send(Buffer.from([0x20, 2, 0, 0]));
          break;
        case 8: {
          // SUBSCRIBE → SUBACK granting QoS 0 to each filter, echoing the packet id
          const idAt = 2 + extraLengthBytes(packet);
          const filters = readFilters(packet, idAt + 2);
          const granted = filters.map(() => 0);
          ws.send(
            Buffer.from([0x90, 2 + filters.length, packet[idAt], packet[idAt + 1], ...granted]),
          );
          subscriptions.push(filters);
          publish(ws, replay);
          for (const waiter of waiters.filter((w) => subscriptions.length >= w.count))
            waiter.resolve();
          break;
        }
        case 10: {
          // UNSUBSCRIBE → UNSUBACK, echoing the packet id
          const idAt = 2 + extraLengthBytes(packet);
          unsubscriptions.push(readFilters(packet, idAt + 2, false));
          ws.send(Buffer.from([0xb0, 2, packet[idAt], packet[idAt + 1]]));
          break;
        }
        case 12: // PINGREQ → PINGRESP
          ws.send(Buffer.from([0xd0, 0]));
          break;
      }
    });
  });

  return {
    connections,
    subscriptions,
    unsubscriptions,
    subscribed: (count = 1) =>
      subscriptions.length >= count
        ? Promise.resolve()
        : new Promise((resolve) => waiters.push({ count, resolve })),
    publish: (messages) => publish(connections.at(-1)!, messages),
    closeAll: async () => {
      await Promise.all(connections.map((ws) => ws.close()));
    },
  };
}

/** Bytes of the remaining length beyond the first. */
function extraLengthBytes(packet: Buffer): number {
  let i = 1;
  while (packet[i] & 0x80) i++;
  return i - 1;
}

/**
 * Each filter is a length-prefixed UTF-8 string, in SUBSCRIBE followed by its QoS byte.
 */
function readFilters(packet: Buffer, offset: number, withQos = true): string[] {
  const filters: string[] = [];
  while (offset < packet.length) {
    const length = packet.readUInt16BE(offset);
    filters.push(packet.toString('utf8', offset + 2, offset + 2 + length));
    offset += 2 + length + (withQos ? 1 : 0);
  }
  return filters;
}

/** A sample position, reported again `seconds` later from the same place. */
export function laterFix(message: HfpMessage, seconds: number): HfpMessage {
  const payload = JSON.parse(message.payload) as { VP: { tst: string } };
  payload.VP.tst = new Date(Date.parse(payload.VP.tst) + seconds * 1000).toISOString();
  return { topic: message.topic, payload: JSON.stringify(payload) };
}

/** The sample's last position of a vehicle, by its number. */
export function sampleFix(vehicle: number): HfpMessage {
  const fixes = HFP_SAMPLE.filter(
    (m) => m.topic.includes('/vp/') && m.topic.split('/')[8] === String(vehicle).padStart(5, '0'),
  );
  if (fixes.length === 0) throw new Error(`No position for vehicle ${vehicle} in the sample`);
  return fixes.at(-1)!;
}
