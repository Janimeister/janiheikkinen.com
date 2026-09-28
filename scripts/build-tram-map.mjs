#!/usr/bin/env node
// Builds public/data/helsinki-trams.json for the /trams page from HSL GTFS and OpenStreetMap.
//
//   node scripts/build-tram-map.mjs [--refresh] [--land-polygons]
//
// --refresh        ignore the download cache in .cache/tram-map/
// --land-polygons  skip Overpass and build the sea from the osmdata.openstreetmap.de
//                  land polygons (this also happens automatically when Overpass is down)
//
// Node's built-in fetch only uses HTTPS_PROXY when NODE_USE_ENV_PROXY=1 is set.
// No npm dependencies: the zip reader and CSV parser below only read what we need,
// and stop_times.txt (about 1 GB) is never inflated.

import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { open, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createInflateRaw } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache', 'tram-map');
const OUTPUT = join(ROOT, 'public', 'data', 'helsinki-trams.json');
const TARGET_BYTES = 150 * 1024;

const GTFS_URL = 'https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip';
const LAND_POLYGONS_URL = 'https://osmdata.openstreetmap.de/download/land-polygons-split-4326.zip';
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const USER_AGENT =
  'janiheikkinen.com tram map builder (https://github.com/Janimeister/janiheikkinen.com)';

/** The map area from docs/tram-tracker-plan.md §3: the tram network without line 15, plus a margin. */
const BBOX = { south: 60.148, west: 24.865, north: 60.22, east: 25.056 };
/** Overpass is queried a bit wider so that coastline chains start and end outside BBOX. */
const QUERY_MARGIN = 0.02;

const SIMPLIFY_METRES = 10;
/** Parts of a shape closer than this to an already kept track are treated as the same track. */
const SAME_TRACK_METRES = 20;
/** Unique track shorter than this is noise (a slightly different stop approach, not a branch). */
const MIN_BRANCH_METRES = 60;
/** Tram stops further than this from every kept track belong to line 15 or to nothing. */
const STOP_TRACK_METRES = 60;
/** Polygons smaller than about half a 0.001° × 0.001° cell never show up on the map. */
const MIN_POLYGON_DEG2 = 0.5 * 0.001 * 0.001;
/** Parks are only texture, and a park under about three cells would be a lone comma or two. */
const MIN_PARK_DEG2 = 3 * 0.001 * 0.001;
const LABEL_PLACES = { suburb: 1, quarter: 2, island: 2 };

const args = new Set(process.argv.slice(2));
const refresh = args.has('--refresh');

// ── Geometry helpers ─────────────────────────────────────────────────────

const LAT0 = (BBOX.south + BBOX.north) / 2;
const M_PER_DEG_LAT = 111_132;
const M_PER_DEG_LON = 111_320 * Math.cos((LAT0 * Math.PI) / 180);

const round5 = (n) => Math.round(n * 1e5) / 1e5;
const toMetres = ([lon, lat]) => [lon * M_PER_DEG_LON, lat * M_PER_DEG_LAT];

function segmentDistance(p, a, b) {
  const [px, py] = toMetres(p);
  const [ax, ay] = toMetres(a);
  const [bx, by] = toMetres(b);
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function lengthMetres(line) {
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = toMetres(line[i - 1]);
    const [bx, by] = toMetres(line[i]);
    total += Math.hypot(bx - ax, by - ay);
  }
  return total;
}

/** Douglas–Peucker, iterative so long coastlines don't overflow the stack. */
function simplify(points, tolerance = SIMPLIFY_METRES) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function simplifyRing(ring) {
  // A closed ring has identical endpoints, which Douglas–Peucker can't split, so cut it in two.
  const open = sameCoord(ring[0], ring.at(-1)) ? ring.slice(0, -1) : ring;
  if (open.length < 4) return open;
  const half = Math.floor(open.length / 2);
  const a = simplify(open.slice(0, half + 1));
  const b = simplify([...open.slice(half), open[0]]);
  return [...a, ...b.slice(1, -1)];
}

const roundLine = (line) =>
  line
    .map(([lon, lat]) => [round5(lon), round5(lat)])
    .filter((p, i, all) => i === 0 || !sameCoord(p, all[i - 1]));

function ringArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return area / 2;
}

const sameCoord = (a, b) => a[0] === b[0] && a[1] === b[1];
const insideBox = ([lon, lat], box = BBOX) =>
  lon >= box.west && lon <= box.east && lat >= box.south && lat <= box.north;

/** Sutherland–Hodgman against the axis-aligned box. Works for concave rings too. */
function clipRing(ring, box = BBOX) {
  const edges = [
    [(p) => p[0] >= box.west, (a, b) => cutX(a, b, box.west)],
    [(p) => p[0] <= box.east, (a, b) => cutX(a, b, box.east)],
    [(p) => p[1] >= box.south, (a, b) => cutY(a, b, box.south)],
    [(p) => p[1] <= box.north, (a, b) => cutY(a, b, box.north)],
  ];
  let output = sameCoord(ring[0], ring.at(-1)) ? ring.slice(0, -1) : ring;
  for (const [inside, cut] of edges) {
    const input = output;
    output = [];
    for (let i = 0; i < input.length; i++) {
      const current = input[i];
      const previous = input[(i + input.length - 1) % input.length];
      if (inside(current)) {
        if (!inside(previous)) output.push(cut(previous, current));
        output.push(current);
      } else if (inside(previous)) {
        output.push(cut(previous, current));
      }
    }
    if (!output.length) return [];
  }
  return output;
}

const cutX = (a, b, x) => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
const cutY = (a, b, y) => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y];

/** Clips, simplifies and rounds a polygon (list of rings, even–odd). Returns null if it vanishes. */
function preparePolygon(rings, minArea = MIN_POLYGON_DEG2) {
  const out = [];
  for (const ring of rings) {
    const clipped = clipRing(ring);
    if (clipped.length < 3) continue;
    const simplified = roundLine(simplifyRing(clipped));
    if (simplified.length >= 3 && Math.abs(ringArea(simplified)) >= minArea) {
      out.push(simplified);
    }
  }
  return out.length ? out : null;
}

/** Joins ways that share endpoints into longer chains (closed rings where possible). */
function joinWays(ways) {
  const key = (p) => `${p[0]},${p[1]}`;
  const chains = ways.filter((w) => w.length >= 2).map((w) => [...w]);
  const byStart = new Map();
  for (const chain of chains) byStart.set(key(chain[0]), chain);
  const merged = new Set();
  for (const chain of chains) {
    if (merged.has(chain)) continue;
    for (;;) {
      if (sameCoord(chain[0], chain.at(-1))) break;
      const next = byStart.get(key(chain.at(-1)));
      if (!next || next === chain || merged.has(next)) break;
      byStart.delete(key(next[0]));
      merged.add(next);
      chain.push(...next.slice(1));
    }
  }
  return chains.filter((c) => !merged.has(c));
}

/** Like joinWays, but also reverses ways where needed (multipolygon members have no direction). */
function assembleRings(ways) {
  const key = (p) => `${p[0]},${p[1]}`;
  const pending = ways.filter((w) => w.length >= 2).map((w) => [...w]);
  const rings = [];
  while (pending.length) {
    const ring = pending.pop();
    let grown = true;
    while (!sameCoord(ring[0], ring.at(-1)) && grown) {
      grown = false;
      const end = key(ring.at(-1));
      for (let i = 0; i < pending.length; i++) {
        const way = pending[i];
        if (key(way[0]) === end) ring.push(...way.slice(1));
        else if (key(way.at(-1)) === end) ring.push(...way.slice(0, -1).reverse());
        else continue;
        pending.splice(i, 1);
        grown = true;
        break;
      }
    }
    if (ring.length >= 4) rings.push(ring);
  }
  return rings;
}

// ── Downloads ────────────────────────────────────────────────────────────

async function download(url, file) {
  if (!refresh && existsSync(file)) {
    console.log(`  cached ${file.replace(ROOT + '/', '')}`);
    return file;
  }
  console.log(`  downloading ${url}`);
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok || !response.body) throw new Error(`${url}: HTTP ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(`${file}.part`));
  await rename(`${file}.part`, file);
  return file;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function overpass(query, cacheFile) {
  if (!refresh && existsSync(cacheFile)) {
    console.log(`  cached ${cacheFile.replace(ROOT + '/', '')}`);
    return JSON.parse(await readFile(cacheFile, 'utf8'));
  }
  const rounds = 3;
  for (let round = 0; round < rounds; round++) {
    for (const mirror of OVERPASS_MIRRORS) {
      try {
        console.log(`  Overpass ${new URL(mirror).host} (round ${round + 1}/${rounds})`);
        const response = await fetch(mirror, {
          method: 'POST',
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(180_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        const json = JSON.parse(text);
        if (json.remark && !json.elements?.length) throw new Error(json.remark);
        await writeFile(cacheFile, text);
        return json;
      } catch (error) {
        console.warn(`    failed: ${error.cause?.code ?? error.message}`);
      }
    }
    if (round < rounds - 1) await sleep(10_000 * 2 ** round);
  }
  return null;
}

// ── Zip and CSV ──────────────────────────────────────────────────────────

/** Reads the central directory of a (possibly zip64) archive. */
async function zipEntries(file) {
  const handle = await open(file, 'r');
  try {
    const { size } = await handle.stat();
    const tailSize = Math.min(size, 65_557);
    const tail = Buffer.alloc(tailSize);
    await handle.read(tail, 0, tailSize, size - tailSize);
    const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocd < 0) throw new Error(`${file} is not a zip archive`);
    let count = tail.readUInt16LE(eocd + 10);
    let cdSize = tail.readUInt32LE(eocd + 12);
    let cdOffset = tail.readUInt32LE(eocd + 16);
    const locator = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x06, 0x07]), eocd);
    if (locator >= 0) {
      const record = Buffer.alloc(56);
      await handle.read(record, 0, 56, Number(tail.readBigUInt64LE(locator + 8)));
      count = Number(record.readBigUInt64LE(32));
      cdSize = Number(record.readBigUInt64LE(40));
      cdOffset = Number(record.readBigUInt64LE(48));
    }
    const cd = Buffer.alloc(cdSize);
    await handle.read(cd, 0, cdSize, cdOffset);
    const entries = new Map();
    for (let i = 0, p = 0; i < count; i++) {
      const method = cd.readUInt16LE(p + 10);
      let compressedSize = cd.readUInt32LE(p + 20);
      let uncompressedSize = cd.readUInt32LE(p + 24);
      const nameLength = cd.readUInt16LE(p + 28);
      const extraLength = cd.readUInt16LE(p + 30);
      const commentLength = cd.readUInt16LE(p + 32);
      let localOffset = cd.readUInt32LE(p + 42);
      const name = cd.toString('utf8', p + 46, p + 46 + nameLength);
      // Zip64 extra field: the 0xFFFFFFFF values above are replaced in this order.
      for (let e = p + 46 + nameLength; e < p + 46 + nameLength + extraLength;) {
        const id = cd.readUInt16LE(e);
        const len = cd.readUInt16LE(e + 2);
        if (id === 1) {
          let q = e + 4;
          if (uncompressedSize === 0xffffffff)
            ((uncompressedSize = Number(cd.readBigUInt64LE(q))), (q += 8));
          if (compressedSize === 0xffffffff)
            ((compressedSize = Number(cd.readBigUInt64LE(q))), (q += 8));
          if (localOffset === 0xffffffff) localOffset = Number(cd.readBigUInt64LE(q));
        }
        e += 4 + len;
      }
      entries.set(name, { name, method, compressedSize, uncompressedSize, localOffset });
      p += 46 + nameLength + extraLength + commentLength;
    }
    return { file, entries };
  } finally {
    await handle.close();
  }
}

async function zipStream(zip, name) {
  const entry = zip.entries.get(name);
  if (!entry) throw new Error(`${name} not found in ${zip.file}`);
  const handle = await open(zip.file, 'r');
  const header = Buffer.alloc(30);
  await handle.read(header, 0, 30, entry.localOffset);
  await handle.close();
  const start = entry.localOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
  const raw = createReadStream(zip.file, { start, end: start + entry.compressedSize - 1 });
  if (entry.method === 0) return raw;
  if (entry.method !== 8)
    throw new Error(`${name}: unsupported compression method ${entry.method}`);
  return raw.pipe(createInflateRaw());
}

/** Streams CSV rows as objects. Handles quoted fields, doubled quotes and a BOM. */
async function* readCsv(stream) {
  let header = null;
  let field = '';
  let row = [];
  let quoted = false;
  let afterQuote = false;
  let first = true;
  for await (const chunk of stream.setEncoding('utf8')) {
    let text = chunk;
    if (first && text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    first = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          quoted = false;
          afterQuote = true;
        } else field += c;
      } else if (c === '"') {
        if (afterQuote) field += '"';
        quoted = true;
        afterQuote = false;
      } else if (c === ',') {
        row.push(field);
        field = '';
        afterQuote = false;
      } else if (c === '\n' || c === '\r') {
        afterQuote = false;
        if (c === '\r' && text[i + 1] === '\n') continue;
        if (field === '' && row.length === 0) continue;
        row.push(field);
        field = '';
        if (header) yield Object.fromEntries(header.map((h, k) => [h, row[k] ?? '']));
        else header = row.map((h) => h.trim());
        row = [];
      } else {
        field += c;
        afterQuote = false;
      }
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (header) yield Object.fromEntries(header.map((h, k) => [h, row[k] ?? '']));
  }
}

// ── GTFS ─────────────────────────────────────────────────────────────────

/** '1004' → '4', '1001H6' → '1', '100HA5' → 'H'. Line 15 (2015) never gets here: it isn't route_type 0. */
function lineOf(routeId) {
  if (routeId.startsWith('100H')) return 'H';
  const match = /^10(\d\d)/.exec(routeId);
  return match ? String(Number(match[1])) : null;
}

async function readGtfs() {
  console.log('HSL GTFS');
  const zip = await zipEntries(await download(GTFS_URL, join(CACHE, 'hsl-gtfs.zip')));

  let gtfsVersion = '';
  if (zip.entries.has('feed_info.txt')) {
    for await (const row of readCsv(await zipStream(zip, 'feed_info.txt'))) {
      gtfsVersion = row.feed_version || row.feed_start_date || '';
    }
  }

  const routes = new Map();
  for await (const row of readCsv(await zipStream(zip, 'routes.txt'))) {
    if (row.route_type !== '0') continue;
    const line = lineOf(row.route_id);
    if (!line) {
      console.warn(`  skipping tram route ${row.route_id} (${row.route_short_name}): unknown line`);
      continue;
    }
    routes.set(row.route_id, { line, color: row.route_color ? `#${row.route_color}` : '#00985f' });
  }
  console.log(`  ${routes.size} tram routes: ${[...routes.keys()].join(' ')}`);

  const shapeUse = new Map();
  for await (const row of readCsv(await zipStream(zip, 'trips.txt'))) {
    if (!routes.has(row.route_id) || !row.shape_id) continue;
    const use = shapeUse.get(row.shape_id) ?? {
      shapeId: row.shape_id,
      routeId: row.route_id,
      direction: row.direction_id,
      trips: 0,
    };
    use.trips++;
    shapeUse.set(row.shape_id, use);
  }

  const shapePoints = new Map();
  let pointCount = 0;
  for await (const row of readCsv(await zipStream(zip, 'shapes.txt'))) {
    if (!shapeUse.has(row.shape_id)) continue;
    const points = shapePoints.get(row.shape_id) ?? [];
    points.push([
      Number(row.shape_pt_sequence),
      Number(row.shape_pt_lon),
      Number(row.shape_pt_lat),
    ]);
    shapePoints.set(row.shape_id, points);
    pointCount++;
  }
  for (const [id, points] of shapePoints) {
    points.sort((a, b) => a[0] - b[0]);
    shapeUse.get(id).points = points.map(([, lon, lat]) => [lon, lat]);
  }
  console.log(`  ${shapePoints.size} tram shapes, ${pointCount} points`);

  const stops = [];
  for await (const row of readCsv(await zipStream(zip, 'stops.txt'))) {
    if (row.vehicle_type !== '0' || (row.location_type && row.location_type !== '0')) continue;
    stops.push({
      id: row.stop_id.replace(/^HSL:/, ''),
      name: row.stop_name,
      lat: Number(row.stop_lat),
      lon: Number(row.stop_lon),
    });
  }
  console.log(`  ${stops.length} tram stops (vehicle_type 0)`);

  return { gtfsVersion, routes, shapes: [...shapeUse.values()].filter((s) => s.points), stops };
}

/** A spatial hash of kept track segments, for "is this point already on a kept track?" */
class TrackIndex {
  cells = new Map();
  static CELL = 0.001;

  add(line) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      const x0 = Math.floor(Math.min(a[0], b[0]) / TrackIndex.CELL);
      const x1 = Math.floor(Math.max(a[0], b[0]) / TrackIndex.CELL);
      const y0 = Math.floor(Math.min(a[1], b[1]) / TrackIndex.CELL);
      const y1 = Math.floor(Math.max(a[1], b[1]) / TrackIndex.CELL);
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          const k = `${x},${y}`;
          const list = this.cells.get(k) ?? [];
          list.push([a, b]);
          this.cells.set(k, list);
        }
      }
    }
  }

  near(p, metres) {
    const cx = Math.floor(p[0] / TrackIndex.CELL);
    const cy = Math.floor(p[1] / TrackIndex.CELL);
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let y = cy - 1; y <= cy + 1; y++) {
        for (const [a, b] of this.cells.get(`${x},${y}`) ?? []) {
          if (segmentDistance(p, a, b) <= metres) return true;
        }
      }
    }
    return false;
  }

  /** The runs of `line` that are not within `metres` of the index. */
  uniqueParts(line, metres = SAME_TRACK_METRES) {
    const parts = [];
    let current = [];
    for (let i = 0; i < line.length; i++) {
      if (this.near(line[i], metres)) {
        // End the run on the shared point so the branch visibly joins the trunk.
        if (current.length) parts.push([...current, line[i]]);
        current = [];
      } else {
        if (!current.length && i > 0) current.push(line[i - 1]);
        current.push(line[i]);
      }
    }
    if (current.length >= 2) parts.push(current);
    return parts.filter((part) => lengthMetres(part) >= MIN_BRANCH_METRES);
  }
}

/**
 * Keeps one representative shape per direction of each line (the one with the most trips), then
 * only the extra track that a line's other shapes add: depot branches, short turns and loops.
 */
function buildLines(gtfs) {
  const byLine = new Map();
  for (const shape of gtfs.shapes) {
    const route = gtfs.routes.get(shape.routeId);
    const list = byLine.get(route.line) ?? [];
    list.push({ ...shape, base: /^(10\d\d|100H)$/.test(shape.routeId), color: route.color });
    byLine.set(route.line, list);
  }
  const order = [...byLine.keys()].sort((a, b) =>
    a === 'H' ? 1 : b === 'H' ? -1 : Number(a) - Number(b),
  );

  const everything = new TrackIndex();
  const lines = [];
  for (const desi of order) {
    const candidates = byLine
      .get(desi)
      .sort((a, b) => Number(b.base) - Number(a.base) || b.trips - a.trips);
    const own = new TrackIndex();
    const shapes = [];
    const keep = (points) => {
      const clipped = points.filter((p) => insideBox(p));
      if (clipped.length < 2) return;
      const simplified = roundLine(simplify(points));
      shapes.push(simplified);
      own.add(simplified);
    };
    // Depot runs (H) only add track that no passenger line already covers.
    const reference = desi === 'H' ? everything : own;
    for (const shape of candidates) {
      if (shapes.length === 0 && desi !== 'H') {
        keep(shape.points);
        continue;
      }
      for (const part of reference.uniqueParts(shape.points)) keep(part);
    }
    if (!shapes.length) continue;
    for (const s of shapes) everything.add(s);
    lines.push({ desi, color: candidates[0].color, shapes });
  }
  return { lines, index: everything };
}

// ── OpenStreetMap ────────────────────────────────────────────────────────

function overpassQuery() {
  const b = [
    BBOX.south - QUERY_MARGIN,
    BBOX.west - QUERY_MARGIN,
    BBOX.north + QUERY_MARGIN,
    BBOX.east + QUERY_MARGIN,
  ].join(',');
  return `[out:json][timeout:180];
(
  way["natural"="coastline"](${b});
  way["natural"="water"](${b});
  relation["natural"="water"](${b});
  way["leisure"="park"](${b});
  relation["leisure"="park"](${b});
  node["place"~"^(suburb|quarter|island)$"]["name"](${b});
);
out geom;`;
}

const geometryOf = (element) => (element.geometry ?? []).map((g) => [g.lon, g.lat]);

function polygonsFromOsm(elements, predicate, minArea) {
  const polygons = [];
  for (const el of elements) {
    if (!predicate(el.tags ?? {})) continue;
    let rings;
    if (el.type === 'way') {
      const ring = geometryOf(el);
      rings = ring.length >= 4 && sameCoord(ring[0], ring.at(-1)) ? [ring] : [];
    } else if (el.type === 'relation') {
      const ways = (el.members ?? [])
        .filter((m) => m.type === 'way' && m.geometry)
        .map((m) => m.geometry.map((g) => [g.lon, g.lat]));
      rings = assembleRings(ways);
    } else continue;
    const polygon = rings.length ? preparePolygon(rings, minArea) : null;
    if (polygon) polygons.push(polygon);
  }
  return polygons;
}

/** Position along the box outline, counter-clockwise from the south-west corner. */
function perimeterPosition([lon, lat], box = BBOX) {
  const w = box.east - box.west;
  const h = box.north - box.south;
  const eps = 1e-9;
  if (Math.abs(lat - box.south) < eps) return lon - box.west;
  if (Math.abs(lon - box.east) < eps) return w + (lat - box.south);
  if (Math.abs(lat - box.north) < eps) return w + h + (box.east - lon);
  return 2 * w + h + (box.north - lat);
}

/** Liang–Barsky: the part of segment a→b inside the box as [t0, t1], or null. */
function clipSegment(a, b, box = BBOX) {
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  for (const [p, q] of [
    [-dx, a[0] - box.west],
    [dx, box.east - a[0]],
    [-dy, a[1] - box.south],
    [dy, box.north - a[1]],
  ]) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
    }
  }
  return t0 <= t1 ? [t0, t1] : null;
}

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * Turns coastline ways (land on the left) into closed land rings inside the box.
 * Pieces that cross the box are closed by walking the box outline counter-clockwise from
 * each exit to the next entry, as osmcoastline does.
 */
function landFromCoastline(ways, box = BBOX) {
  const land = [];
  const pieces = [];
  for (let chain of joinWays(ways)) {
    const closed = sameCoord(chain[0], chain.at(-1));
    if (chain.every((p) => insideBox(p, box))) {
      if (closed) land.push(chain);
      else console.warn('  coastline chain ends inside the map area; ignored');
      continue;
    }
    if (closed) {
      const outside = chain.findIndex((p) => !insideBox(p, box));
      chain = [...chain.slice(outside, -1), ...chain.slice(0, outside + 1)];
    }
    let current = null;
    for (let i = 1; i < chain.length; i++) {
      const a = chain[i - 1];
      const b = chain[i];
      const clip = clipSegment(a, b, box);
      if (!clip) continue;
      const [t0, t1] = clip;
      if (t0 > 0 || !current) {
        if (current) console.warn('  broken coastline piece; ignored');
        current = [lerp(a, b, t0)];
      }
      current.push(lerp(a, b, t1));
      if (t1 < 1) {
        if (t0 > 0 || current.length > 1) pieces.push(current);
        current = null;
      }
    }
    if (current) console.warn('  coastline chain ends inside the map area; ignored');
  }

  const w = box.east - box.west;
  const h = box.north - box.south;
  const perimeter = 2 * (w + h);
  const corners = [
    [w, [box.east, box.south]],
    [w + h, [box.east, box.north]],
    [2 * w + h, [box.west, box.north]],
    [perimeter, [box.west, box.south]],
  ];
  const entries = pieces.map((piece) => ({ piece, s: perimeterPosition(piece[0], box) }));
  const used = new Set();
  for (const start of entries) {
    if (used.has(start)) continue;
    const ring = [];
    let current = start;
    for (let guard = 0; guard <= entries.length; guard++) {
      used.add(current);
      ring.push(...current.piece);
      const exit = perimeterPosition(current.piece.at(-1), box);
      const distance = (e) => (e.s - exit + perimeter) % perimeter;
      const next = entries
        .filter((e) => e === start || !used.has(e))
        .sort((a, b) => distance(a) - distance(b))[0];
      const travel = distance(next);
      for (const [s, corner] of [...corners, ...corners.map(([s, c]) => [s + perimeter, c])]) {
        if (s > exit && s < exit + travel) ring.push(corner);
      }
      if (next === start) break;
      current = next;
    }
    ring.push(ring[0]);
    land.push(ring);
  }
  return land;
}

// ── Land polygon fallback ────────────────────────────────────────────────

async function landFromLandPolygons() {
  console.log('Land polygons (osmdata.openstreetmap.de)');
  const zip = await zipEntries(
    await download(LAND_POLYGONS_URL, join(CACHE, 'land-polygons-split-4326.zip')),
  );
  const find = (ext) => [...zip.entries.keys()].find((n) => n.endsWith(`land_polygons.${ext}`));
  const files = {};
  for (const ext of ['shp', 'shx']) {
    files[ext] = join(CACHE, `land_polygons.${ext}`);
    if (refresh || !existsSync(files[ext])) {
      console.log(`  extracting land_polygons.${ext}`);
      await pipeline(await zipStream(zip, find(ext)), createWriteStream(files[ext]));
    }
  }
  const shx = await readFile(files.shx);
  const shp = await open(files.shp, 'r');
  const land = [];
  const head = Buffer.alloc(44);
  try {
    for (let p = 100; p < shx.length; p += 8) {
      const offset = shx.readUInt32BE(p) * 2;
      const length = shx.readUInt32BE(p + 4) * 2;
      await shp.read(head, 0, 44, offset + 8);
      if (head.readInt32LE(0) !== 5) continue;
      const [xmin, ymin, xmax, ymax] = [4, 12, 20, 28].map((o) => head.readDoubleLE(o));
      if (xmax < BBOX.west || xmin > BBOX.east || ymax < BBOX.south || ymin > BBOX.north) continue;
      const record = Buffer.alloc(length);
      await shp.read(record, 0, length, offset + 8);
      const numParts = record.readInt32LE(36);
      const numPoints = record.readInt32LE(40);
      const parts = Array.from({ length: numParts }, (_, i) => record.readInt32LE(44 + i * 4));
      const pointsAt = 44 + numParts * 4;
      for (let i = 0; i < numParts; i++) {
        const ring = [];
        for (let k = parts[i]; k < (parts[i + 1] ?? numPoints); k++) {
          ring.push([
            record.readDoubleLE(pointsAt + k * 16),
            record.readDoubleLE(pointsAt + k * 16 + 8),
          ]);
        }
        land.push(ring);
      }
    }
  } finally {
    await shp.close();
  }
  console.log(`  ${land.length} land rings touch the map area`);
  return land;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(CACHE, { recursive: true });
  const gtfs = await readGtfs();
  const { lines, index } = buildLines(gtfs);
  console.log(`  lines: ${lines.map((l) => `${l.desi}(${l.shapes.length})`).join(' ')}`);

  const stops = gtfs.stops
    .filter((s) => insideBox([s.lon, s.lat]) && index.near([s.lon, s.lat], STOP_TRACK_METRES))
    .map((s) => ({ ...s, lat: round5(s.lat), lon: round5(s.lon) }))
    .sort((a, b) => a.id.localeCompare(b.id));
  console.log(`  ${stops.length} stops on the kept tracks`);

  console.log('OpenStreetMap');
  const osm = args.has('--land-polygons')
    ? null
    : await overpass(overpassQuery(), join(CACHE, 'overpass.json'));
  let land;
  let lakes = [];
  let parks = [];
  let labels = [];
  let landSource;
  if (osm) {
    const elements = osm.elements;
    land = landFromCoastline(
      elements.filter((e) => e.type === 'way' && e.tags?.natural === 'coastline').map(geometryOf),
    );
    lakes = polygonsFromOsm(elements, (t) => t.natural === 'water');
    parks = polygonsFromOsm(elements, (t) => t.leisure === 'park', MIN_PARK_DEG2);
    labels = elements
      .filter((e) => e.type === 'node' && LABEL_PLACES[e.tags?.place] && insideBox([e.lon, e.lat]))
      .map((e) => ({
        name: e.tags.name,
        lat: round5(e.lat),
        lon: round5(e.lon),
        rank: LABEL_PLACES[e.tags.place],
      }))
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, 'fi'));
    landSource = 'overpass';
  } else {
    console.warn('  No Overpass data: using land polygons. Lakes, parks and labels are left out.');
    land = await landFromLandPolygons();
    landSource = 'land-polygons';
  }

  // The sea is the box minus the land, filled with the even–odd rule.
  const boxRing = [
    [BBOX.west, BBOX.south],
    [BBOX.east, BBOX.south],
    [BBOX.east, BBOX.north],
    [BBOX.west, BBOX.north],
    [BBOX.west, BBOX.south],
  ];
  const landRings = preparePolygon(land) ?? [];
  const sea = [roundLine(boxRing).slice(0, -1), ...landRings];
  const water = [sea, ...lakes];
  console.log(
    `  ${landRings.length} land rings, ${lakes.length} lakes, ${parks.length} parks, ${labels.length} labels`,
  );

  const result = {
    bbox: BBOX,
    generatedAt: new Date().toISOString(),
    gtfsVersion: gtfs.gtfsVersion,
    sources: { gtfs: GTFS_URL, land: landSource },
    lines,
    stops,
    water,
    parks,
    labels,
  };
  const json = JSON.stringify(result);
  mkdirSync(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, json + '\n');
  const { size } = await stat(OUTPUT);
  console.log(`Wrote ${OUTPUT.replace(ROOT + '/', '')}: ${(size / 1024).toFixed(1)} kB`);
  if (size > TARGET_BYTES) console.warn(`  over the ${TARGET_BYTES / 1024} kB target`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
