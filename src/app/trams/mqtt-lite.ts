/**
 * A minimal MQTT 3.1.1 client over WebSocket, just enough for HSL's public HFP broker: anonymous
 * CONNECT with a clean session, SUBSCRIBE and UNSUBSCRIBE with several QoS 0 filters, incoming
 * QoS 0 PUBLISH, keep-alive pings and DISCONNECT. Nothing is ever published and nothing needs
 * acknowledging.
 *
 * Spec: https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html
 */

export const PacketType = {
  Connect: 1,
  Connack: 2,
  Publish: 3,
  Subscribe: 8,
  Suback: 9,
  Unsubscribe: 10,
  Unsuback: 11,
  Pingreq: 12,
  Pingresp: 13,
  Disconnect: 14,
} as const;

export interface Packet {
  type: number;
  /** The low four bits of the fixed header. */
  flags: number;
  body: Uint8Array;
}

export interface PublishPacket {
  topic: string;
  payload: Uint8Array;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** The variable-length "remaining length" of the fixed header, 1–4 bytes. */
export function encodeRemainingLength(length: number): number[] {
  if (length < 0 || length > 268_435_455) throw new RangeError(`Packet too large: ${length}`);
  const bytes: number[] = [];
  do {
    let byte = length % 128;
    length = Math.floor(length / 128);
    if (length > 0) byte |= 0x80;
    bytes.push(byte);
  } while (length > 0);
  return bytes;
}

function utf8String(value: string): number[] {
  const bytes = encoder.encode(value);
  if (bytes.length > 0xffff) throw new RangeError('MQTT string too long');
  return [bytes.length >> 8, bytes.length & 0xff, ...bytes];
}

function packet(firstByte: number, body: readonly number[]): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([firstByte, ...encodeRemainingLength(body.length), ...body]);
}

/** CONNECT with a clean session and no credentials, will or password. */
export function encodeConnect(clientId: string, keepAliveSeconds: number): Uint8Array<ArrayBuffer> {
  const CLEAN_SESSION = 0x02;
  return packet(PacketType.Connect << 4, [
    ...utf8String('MQTT'),
    4, // protocol level 3.1.1
    CLEAN_SESSION,
    keepAliveSeconds >> 8,
    keepAliveSeconds & 0xff,
    ...utf8String(clientId),
  ]);
}

/** SUBSCRIBE to every filter at QoS 0. The fixed header flags must be 0b0010. */
export function encodeSubscribe(
  packetId: number,
  filters: readonly string[],
): Uint8Array<ArrayBuffer> {
  if (filters.length === 0) throw new Error('SUBSCRIBE needs at least one filter');
  const body = [packetId >> 8, packetId & 0xff];
  for (const filter of filters) body.push(...utf8String(filter), 0);
  return packet((PacketType.Subscribe << 4) | 0x02, body);
}

/** UNSUBSCRIBE from every filter. Like SUBSCRIBE, the fixed header flags must be 0b0010. */
export function encodeUnsubscribe(
  packetId: number,
  filters: readonly string[],
): Uint8Array<ArrayBuffer> {
  if (filters.length === 0) throw new Error('UNSUBSCRIBE needs at least one filter');
  const body = [packetId >> 8, packetId & 0xff];
  for (const filter of filters) body.push(...utf8String(filter));
  return packet((PacketType.Unsubscribe << 4) | 0x02, body);
}

export const PINGREQ = Uint8Array.of(PacketType.Pingreq << 4, 0);
export const DISCONNECT = Uint8Array.of(PacketType.Disconnect << 4, 0);

/**
 * Splits a byte stream into MQTT packets. WebSocket messages normally carry whole packets, but the
 * spec lets a packet span several messages or one message carry several packets.
 */
export class PacketReader {
  private buffer: Uint8Array = new Uint8Array(0);

  push(chunk: Uint8Array): Packet[] {
    if (this.buffer.length === 0) {
      this.buffer = chunk;
    } else {
      const joined = new Uint8Array(this.buffer.length + chunk.length);
      joined.set(this.buffer);
      joined.set(chunk, this.buffer.length);
      this.buffer = joined;
    }
    const packets: Packet[] = [];
    let offset = 0;
    for (;;) {
      const header = readFixedHeader(this.buffer, offset);
      if (!header) break;
      const end = header.bodyStart + header.length;
      if (end > this.buffer.length) break;
      const first = this.buffer[offset];
      packets.push({
        type: first >> 4,
        flags: first & 0x0f,
        body: this.buffer.subarray(header.bodyStart, end),
      });
      offset = end;
    }
    this.buffer = this.buffer.subarray(offset);
    return packets;
  }
}

function readFixedHeader(
  bytes: Uint8Array,
  offset: number,
): { length: number; bodyStart: number } | null {
  let length = 0;
  let multiplier = 1;
  for (let i = offset + 1; i < offset + 5; i++) {
    if (i >= bytes.length) return null;
    length += (bytes[i] & 0x7f) * multiplier;
    if ((bytes[i] & 0x80) === 0) return { length, bodyStart: i + 1 };
    multiplier *= 128;
  }
  throw new Error('Malformed remaining length');
}

export function decodePublish(p: Packet): PublishPacket {
  const topicLength = (p.body[0] << 8) | p.body[1];
  const topic = decoder.decode(p.body.subarray(2, 2 + topicLength));
  const qos = (p.flags >> 1) & 0x03;
  // QoS 1 and 2 carry a packet identifier before the payload. We only subscribe at QoS 0, so the
  // broker shouldn't send them, but skipping the id keeps the payload intact if it does.
  const payloadStart = 2 + topicLength + (qos > 0 ? 2 : 0);
  return { topic, payload: p.body.subarray(payloadStart) };
}

/** The CONNACK return code: 0 = accepted. */
export function decodeConnack(p: Packet): number {
  return p.body[1];
}

/** The granted QoS per filter; 0x80 means the broker refused that filter. */
export function decodeSuback(p: Packet): { packetId: number; granted: number[] } {
  return { packetId: (p.body[0] << 8) | p.body[1], granted: [...p.body.subarray(2)] };
}

export interface MqttLiteOptions {
  url: string;
  /** What to subscribe to once connected. {@link MqttLiteClient.setFilters} changes it later. */
  filters: readonly string[];
  /** Seconds. The broker drops us after 1.5× this without traffic, so we ping at half of it. */
  keepAlive?: number;
  clientId?: string;
  /** For tests. Defaults to the global `WebSocket`. */
  createSocket?: (url: string, protocol: string) => WebSocket;
  /** CONNACK accepted and SUBACK received: messages will flow. */
  onSubscribed?: () => void;
  onMessage: (topic: string, payload: Uint8Array) => void;
  /** The connection ended, whether it was ever up or not. Not called after `close()`. */
  onClose?: (reason: string) => void;
}

/** One connection attempt. Reconnecting is up to the caller: make a new client. */
export class MqttLiteClient {
  private socket: WebSocket | null = null;
  private readonly reader = new PacketReader();
  private pingTimer: ReturnType<typeof setInterval> | undefined;
  private lastReceived = 0;
  private closed = false;
  private readonly keepAlive: number;
  /** The filters we want. */
  private filters: readonly string[];
  /** The filters the broker has been asked for, once connected. */
  private active: readonly string[] | null = null;
  private packetId = 0;

  constructor(private readonly options: MqttLiteOptions) {
    this.keepAlive = options.keepAlive ?? 60;
    this.filters = [...options.filters];
  }

  /**
   * Changes the subscription without reconnecting. New filters are subscribed before old ones are
   * dropped, so nothing is missed in between; a message matching both may arrive twice.
   */
  setFilters(filters: readonly string[]): void {
    this.filters = [...filters];
    if (!this.active || this.closed) return;
    const added = this.filters.filter((f) => !this.active!.includes(f));
    const removed = this.active.filter((f) => !this.filters.includes(f));
    this.active = this.filters;
    if (added.length > 0) this.socket!.send(encodeSubscribe(this.nextPacketId(), added));
    if (removed.length > 0) this.socket!.send(encodeUnsubscribe(this.nextPacketId(), removed));
  }

  /** Packet ids are 1–65535; 0 isn't allowed. */
  private nextPacketId(): number {
    this.packetId = (this.packetId % 0xffff) + 1;
    return this.packetId;
  }

  connect(): void {
    const create = this.options.createSocket ?? ((url, protocol) => new WebSocket(url, protocol));
    let socket: WebSocket;
    try {
      socket = create(this.options.url, 'mqtt');
    } catch (error) {
      this.fail(`WebSocket could not be created: ${error}`);
      return;
    }
    this.socket = socket;
    socket.binaryType = 'arraybuffer';
    socket.onopen = () => {
      this.lastReceived = Date.now();
      const clientId = this.options.clientId ?? randomClientId();
      socket.send(encodeConnect(clientId, this.keepAlive));
      this.pingTimer = setInterval(() => this.ping(), (this.keepAlive * 1000) / 2);
    };
    socket.onmessage = (event: MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) return;
      this.lastReceived = Date.now();
      try {
        for (const p of this.reader.push(new Uint8Array(event.data))) this.handle(p);
      } catch (error) {
        this.fail(`Protocol error: ${error}`);
      }
    };
    socket.onclose = (event: CloseEvent) =>
      this.fail(`Socket closed (${event.code}${event.reason ? ` ${event.reason}` : ''})`);
    // An error is always followed by close, which reports it.
    socket.onerror = () => undefined;
  }

  /** Disconnects politely. No callbacks fire afterwards. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.pingTimer);
    const socket = this.socket;
    if (!socket) return;
    socket.onopen = socket.onmessage = socket.onclose = null;
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(DISCONNECT);
      } catch {
        // Closing anyway.
      }
    }
    if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
      socket.close(1000);
    }
  }

  private handle(p: Packet): void {
    switch (p.type) {
      case PacketType.Connack: {
        const code = decodeConnack(p);
        if (code !== 0) return this.fail(`Connection refused (CONNACK ${code})`);
        this.active = this.filters;
        this.socket!.send(encodeSubscribe(this.nextPacketId(), this.filters));
        return;
      }
      case PacketType.Suback: {
        // Only the first subscription decides whether the connection is any use.
        const { packetId, granted } = decodeSuback(p);
        if (packetId !== 1) return;
        if (granted.every((qos) => qos === 0x80)) return this.fail('Subscription refused');
        this.options.onSubscribed?.();
        return;
      }
      case PacketType.Publish: {
        const { topic, payload } = decodePublish(p);
        this.options.onMessage(topic, payload);
        return;
      }
      // PINGRESP and UNSUBACK only matter for `lastReceived`, which every message updates.
    }
  }

  private ping(): void {
    if (Date.now() - this.lastReceived > this.keepAlive * 1500) {
      this.fail('Keep-alive timed out');
      return;
    }
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(PINGREQ);
  }

  private fail(reason: string): void {
    if (this.closed) return;
    this.close();
    this.options.onClose?.(reason);
  }
}

function randomClientId(): string {
  const random = Math.random().toString(36).slice(2, 12);
  return `janiheikkinen-trams-${random}`;
}
