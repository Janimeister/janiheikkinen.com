# ASCII Tram Tracker – Plan

A live map of Helsinki trams, in the spirit of [sporat.fi](https://sporat.fi), where both the
map and the vehicles are drawn in ASCII. It gets its data from the Digitransit / HSL
**High-frequency positioning (HFP)** MQTT API and is limited to the Helsinki city tram network.
Raide-Jokeri (line 15) is left out.

> Status: milestones 1 (static map) and 2 (live trams) are implemented. The live feed was
> rechecked on **29 Sep 2026 at about 07:50 Helsinki time** (weekday morning peak) in Chromium,
> with the site's own MQTT client (§6).
>
> The API facts below come from the official HFP documentation
> ([source in HSLdevcom/digitransit-site](https://github.com/HSLdevcom/digitransit-site/blob/master/src/pages/en/developers/apis/5-realtime-api/vehicle-positions/high-frequency-positioning/index.md)).
> They were checked on **28 Sep 2026 at about 22:10 Helsinki time** by connecting to the live
> broker and downloading the HSL GTFS feed (version 2026-09-26). Numbers marked *measured*
> come from that session, which was an evening with about 76 trams in service. Daytime peak
> will be higher.

## 1. Feasibility

It fits this site without a backend:

| Concern | Finding |
| --- | --- |
| Data access | HFP is a public MQTT broker with **no API key or login** (verified). Only the Digitransit GraphQL/routing APIs need a key, and we don't use them. |
| Browser support | `wss://mqtt.hsl.fi:443/` is the documented "MQTT over WebSockets with TLS, for browsers" endpoint. A connection with MQTT 3.1.1, clean session and QoS 0 got `CONNACK 0` and a `SUBACK` (verified). |
| Hosting | The site is static on GitHub Pages. WebSockets are not subject to CORS, so no proxy is needed, in dev or in production. |
| Filtering | The MQTT topic contains the mode, route, next stop and a geohash, so the broker does the filtering. |
| Update rate | Each tram reports a new position about **once per second** (*measured*: 0.96 unique fixes per second per vehicle). |
| License | HSL open data, CC BY 4.0: credit "© HSL / Digitransit". OSM map data is ODbL: credit "© OpenStreetMap contributors". Both go in the page footer and `THIRD-PARTY-NOTICES.md`. |

The main challenges are **bandwidth** (§6, the real numbers are much higher than expected),
**map data preparation** (§4) and **rendering performance** (§5).

## 2. HFP essentials (verified)

### Endpoint
`wss://mqtt.hsl.fi:443/`. Anonymous MQTT 3.1.1 works. Don't use the non-TLS ports; the docs
recommend TLS to protect users' location privacy.

### Topic
```
/hfp/v2/<journey_type>/<temporal_type>/<event_type>/<transport_mode>/<operator_id>/<vehicle_number>/<route_id>/<direction_id>/<headsign>/<start_time>/<next_stop>/<geohash_level>/<geohash>/<sid>/#
```
The array index of each level after `topic.split('/')` is shown in brackets:

| Level | Meaning |
| --- | --- |
| `journey_type` [3] | `journey`. `deadrun` and `signoff` need authorisation, so they're **not available to us**. |
| `temporal_type` [4] | `ongoing`, or `upcoming` (sent shortly before a journey starts) |
| `event_type` [5] | `vp` = vehicle position. Trams also send `dep`, `arr`, `doo`, `vjout`… |
| `transport_mode` [6] | `tram`. **Raide-Jokeri is also published as `tram`**, with route `2015`. |
| `operator_id` [7], `vehicle_number` [8] | Zero-padded (`0040`, `00466`). Every tram is operator `0040` (*measured*: 100 %). |
| `route_id` [9] | GTFS `route_id`: `1004`, `1001H6`, `100HA5`… Variant IDs can carry a suffix (see below). |
| `direction_id` [10] | `1`/`2`. HFP `1` is GTFS `0`. |
| `headsign` [11] | Destination, e.g. `Munkkiniemi`. It's only in the topic, not the payload. |
| `start_time` [12] | `HH:mm` local |
| `next_stop` [13] | GTFS `stop_id` without the `HSL:` prefix, e.g. `1080416` = Merisotilaantori. `EOL` after the last stop. |
| `geohash_level` [14] | 0–5. How significant the position change was since the vehicle's previous message (§6). |
| `geohash` [15..] | `60;24/19/67/74`: interleaved decimal digits of lat and lon. `0////` when there's no position. |

Always end subscriptions with `/#`. HSL may add topic levels without bumping the version.

### Payload
`{"VP": {...}}`. The fields we use:
- `desi`: line shown to riders (`"4"`, `"1H"`, `"H"`)
- `oper`, `veh`: the vehicle key is `oper/veh`
- `lat`, `long`: WGS 84, or `null` (*measured*: 0.5 % of messages)
- `hdg`: degrees clockwise from north
- `spd`: m/s
- `dl`: offset from schedule in seconds; **positive means ahead**, and it can be `null`
- `drst`: 1 when doors are open
- `stop`: stop ID when at a stop, otherwise `null`
- `tst`: ISO timestamp with ms
- `loc`: `GPS` for all trams (*measured*)
- `occu`: 0 or 100

Real message, *measured*, 300 bytes including the topic:
```
/hfp/v2/journey/ongoing/vp/tram/0040/00466/1004/1/Munkkiniemi/22:19/1080416/4/60;24/19/67/74
{"VP":{"desi":"4","dir":"1","oper":40,"veh":466,"tst":"2026-09-28T19:11:13.251Z","tsi":1790622673,
 "spd":4.44,"hdg":243,"lat":60.167411,"long":24.974489,"acc":-0.03,"dl":null,"odo":149,"drst":0,
 "oday":"2026-09-28","jrn":2707,"line":32,"start":"22:19","loc":"GPS","stop":null,"route":"1004","occu":0}}
```

### Line IDs
From GTFS, cross-checked against live `route` values.

| Line | GTFS `route_id` | Live variants seen |
| --- | --- | --- |
| 1 … 10 | `1001` … `1010` | `1001H6` (desi `1H`) |
| 11, 12 | `1011`, `1012` | Crown Bridges (Kruunusillat). In the timetable from **9 Nov 2026**, not running yet. |
| 13 | `1013` | |
| Variants | `1001H`, `1001T`, `1005T`, `1009N`, `1010B`, … | `H` suffix = runs to or from the depot, e.g. `1004H` "Munkkiniemi – Töölöntulli". Live IDs can also contain a **space**: `1004 4`, `1005 4`, `1009 6` (*measured* 29 Sep) |
| H | `100H` | `100HA3`, `100HA5`, `100HE4`, `100HC3`, `100HI5` (desi `H`, depot runs to Ruskeasuo) |
| ~~15~~ | `2015` | **Excluded.** GTFS `route_type` is 900 (light rail), not 0, but HFP still reports it as `tram`. |

**Rules:**
- Group lines by the **`desi`** string, and use that for labels and colours.
- Exclude a message when `route` starts with `2015` or `desi === '15'`.
- Show `H`-type depot runs (`desi` ends with `H`, or `desi` is exactly `H`) dimmed. A filter
  toggle hides them.

## 3. Scope

**In scope (MVP)**
- New page `/trams` registered in `SITE_PAGES`, group `everyday`, with EN and FI translations.
- ASCII base map: coastline and sea, islands, tram tracks coloured by line, stops, and district
  labels.
- Live trams drawn as their line number (`4`, `10`), coloured by line. Depot runs are dimmed.
- Line filter chips (same UI pattern as the algorithm buttons on the ASCII page).
- Click, tap or keyboard-select a tram to see details: line, headsign, speed, delay, next stop
  name and last update time.
- A connection status badge (connecting / live / reconnecting / offline) and stale-vehicle
  handling.

**Later**
- A "smooth" mode with all geohash levels and interpolation (§6).
- Trails and "follow this tram".
- A small ASCII departures board for a stop, using `arr`/`dep` events.

**Out of scope:**
- Raide-Jokeri (line 15), buses and metro
- Deadruns, because they need authorisation
- Anything that needs a Digitransit API key

**Area.** The GTFS tram shapes without line 15 span `lat 60.1506–60.2170` and
`lon 24.8712–25.0506` (*measured*). That's Eira/Olympiaterminaali to Käpylä/Ilmala, and
Munkkiniemi/Pikku Huopalahti to Laajasalo via the Crown Bridges. Use this box with a small
margin: `60.148–60.220`, `24.865–25.056`.

## 4. Map data (build time)

Download geodata once with a script, convert it into a small static asset, and commit the
result. Don't fetch map data at runtime.

1. **`scripts/build-tram-map.mjs`** (Node, streams CSV, no new runtime deps):
   - **HSL GTFS**: `https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip`, about 81 MB and
     updated regularly. Unzip only the files we need, and **never `stop_times.txt`**, which is
     about 1 GB.
     - `routes.txt`: `route_type = 0`. That gives 30 tram route IDs and excludes line 15
       automatically.
     - `trips.txt` → `shapes.txt`: *measured* 166 tram shapes and 25,535 points. Keep one or
       two representative shapes per line, and merge overlapping segments.
     - `stops.txt`: tram stops are `vehicle_type = 0` (*measured* about 360). Needed for the
       stop glyphs and to show `next_stop` IDs by name. Use a real CSV parser, because names
       are quoted.
   - **Coastline, water, islands and parks**: OSM through the Overpass API within the
     bounding box: `natural=coastline`, `natural=water`, `leisure=park`, plus `place=*`
     labels.
     - During the check, `overpass-api.de` and two mirrors all answered "server too busy"
       (504). The script needs retries across mirrors and a local cache.
     - If Overpass stays unreliable, fall back to the prebuilt
       [land-polygons](https://osmdata.openstreetmap.de/data/land-polygons.html) clipped to
       the box.
   - Simplify with Douglas–Peucker to about 10 m. Round coordinates to 5 decimals.
   - Output `public/data/helsinki-trams.json`, target ≤ 150 kB: `{ bbox, generatedAt, gtfsVersion, lines: {desi, color, shapes[]}, stops: {id, name, lat, lon}, water[], parks[], labels[] }`.
2. Commit the generated JSON so CI and GitHub Pages don't depend on HSL or Overpass. Re-run
   the script when the network changes. The first re-run is due before 9 Nov 2026, if the
   Crown Bridges shapes change.
3. Add attribution for OSM (ODbL) and HSL (CC BY 4.0).

## 5. Rendering (runtime)

### Grid: one character = 0.001° × 0.001°
At 60.18° N:
- 0.001° of longitude ≈ **55.4 m**
- 0.001° of latitude ≈ **111 m**

That 1 : 2 ratio matches a monospace character cell, which is about twice as tall as it is
wide. So the base grid is simply
```
col = floor((lon - lonMin) / 0.001)
row = floor((latMax - lat) / 0.001)
```
- There's no projection maths and no aspect correction.
- The grid lines up exactly with HFP's geohash digits, which the bandwidth trick in §6 relies
  on.
- The full box (§3) is **191 × 72 cells**. That's too wide for most screens, so use
  presets:

| Preset | Box | Cell | Grid |
| --- | --- | --- | --- |
| City centre (default desktop) | lat 60.150–60.217, lon 24.870–25.010 | 0.001° | 140 × 67 |
| Whole network | the full box | 0.0015° | 128 × 48 |
| Mobile | lat 60.155–60.195, lon 24.905–24.965 | 0.001° | 60 × 40, plus horizontal scroll |

Pick the font size from the container width, measuring the cell with a hidden `<span>`.

### Layers
Composite these into a `Cell[][]` grid, where each cell is `{ ch, cls }`:

| Layer | Glyphs | Notes |
| --- | --- | --- |
| Sea / lakes | `~` `≈` (alternating by row for texture) | Fill polygons with a scanline algorithm |
| Land | ` ` | Background |
| Parks | `"` or `,` | Low contrast |
| Tram tracks | `─ │ ╱ ╲ ┼`, or ASCII-only `- \| / \\ +` | Bresenham lines. Choose the glyph from segment angle, and merge where lines cross |
| Stops | `o` | |
| Labels | `KALLIO`, `TÖÖLÖ`, `KAMPPI`… | Placed last, on free cells |
| **Trams** | line number (`4`, `10`, `1H`) | Overlay. Arrow variant: `→ ↗ ↑ ↖ ← ↙ ↓ ↘` from `hdg` |

- **Pre-render the static layers once** per preset and re-render only on resize. Each tick
  copies the base grid and stamps trams on top.
- **Snap to track:** GPS jitter can put a tram one cell off its line. If a track cell of the
  tram's line is within about 1 cell, snap to it.
- **Collisions:** trams share tracks (Mannerheimintie, Hämeentie). Draw them in `tst` order.
  For overlapping cells, show `*` plus a count in the tooltip.

### Output technique
Render the base map as one static `<pre>`, as on the existing ASCII page. Put a second,
absolutely positioned `<pre>` on top for the tram layer, mostly spaces.
- Only the overlay changes each tick, with batched same-class `<span>` runs.
- Clicks map back to `(row, col)` from the measured cell size.
- Fall back to `<canvas>` with `fillText` only if profiling shows jank.

### Updates
- Store incoming fixes in a `Map<vehicleKey, TramState>`. Re-render the overlay at most about
  2 times a second with a throttled `requestAnimationFrame`, not per message.
- Respect `prefers-reduced-motion`: no interpolation or trails.

### Colours
Add a line-colour token map in the Tailwind theme, following
`.github/instructions/tailwind-theme.instructions.md`. HSL trams are green (`#00985f`) as a
brand, but for readability give each line a distinct pop colour from the existing palette.
Ink text must stay at AA contrast on those colours. Keep a legend.

## 6. Live data and bandwidth (measured)

### Raw volume is high
Subscribing to `/hfp/v2/journey/ongoing/vp/tram/#` for 60 s delivered:

| Metric | Value |
| --- | --- |
| Trams | 77 (including line 15) |
| Messages | **~300 / s** (~397 B each) |
| Traffic | **~115 kB/s ≈ 430 MB per hour** |
| Unique fixes | ~73 / s (≈ 1 per tram per second) |

**Every message arrived exactly 4 times**, with identical topic and payload. This happened
with every filter tried (`#`, explicit `+` levels, a single route, geohash filters).

**Rechecked in a browser in milestone 2 (29 Sep, morning peak): still 4×.** Chromium, running the
site's own `mqtt-lite.ts`, counted WebSocket frames through the DevTools protocol (what the
DevTools *Messages* tab shows):

| Subscription | Frames with PUBLISH | Unique | Copies | Trams |
| --- | --- | --- | --- | --- |
| All levels, 15 s | 6,515 | 1,634 | 1,621 of them exactly 4× (the rest cut off at the window edges) | 108 |
| Levels 0–3 + `vjout`, 60 s | 1,796 | 452 | every `vp` 4×, every `vjout` **once** | 97 |
| The `/trams` page itself, 25 s | 918 | 231 | 3.97× | 64 shown |

- It's one MQTT session (one `CONNACK`, one `SUBACK`), and each copy is its own well-formed
  WebSocket frame. Copies are interleaved with other trams' messages, arriving up to ~200 ms
  apart. `vjout` messages are **not** duplicated. A proxy wouldn't treat MQTT topics
  differently, so this points to the broker, perhaps one delivery per path through its
  cluster.
- The sandbox's egress proxy was still in the path: it couldn't tunnel Chromium's own
  WebSocket, so a local byte relay carried the socket. Checking a normal browser's DevTools
  (`/trams` → Network → WS → Messages) would rule the proxy out completely.
- So **deduplicate on `oper/veh/tst`** (implemented in `hfp.ts`). Copies arrive within a
  fraction of a second, so a window of the last few thousand keys is enough.

Even without the duplication, that's about 29 kB/s or 100 MB per hour at evening load. Too
much for a phone.

### Geohash level filter
`geohash_level` is the position of the most significant decimal digit of lat/lon that changed
since that tram's previous message. **Levels 0–3 mean the tram crossed a 0.001° line.** Given
the grid in §5, that's exactly **when the tram moves into a different character cell**.
Level 0 also fires on non-location topic changes such as a new `next_stop`, so every
departure from a stop is included.

| Subscription | Unique fixes | Traffic (incl. 4× dup) |
| --- | --- | --- |
| All levels `…/vp/tram/#` | 72.8 / s | 112.9 kB/s |
| Levels 0–3 only (4 filters) | 5.0 / s | **7.8 kB/s (≈ 28 MB/h, ~7 MB/h if dups aren't real)** |
| Levels 0–3 + `vjout`, weekday morning peak (*measured* 29 Sep) | 7.5 / s | 11.6 kB/s ≈ 42 MB/h. The dups are real, so that's what a phone downloads |
| Single line `…/vp/tram/+/+/1004/#` | 5.7 / s | 8.8 kB/s |

The *measured* level distribution for trams matches the docs:
- 0: 1.4 %
- 1: 0.04 %
- 2: 0.7 %
- 3: 5.5 %
- 4: 39 %
- 5: 53 %

**Default subscription.** This cuts traffic about 14× and loses nothing visible at 0.001° cells:
```
/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/0/#
/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/1/#
/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/2/#
/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/3/#
/hfp/v2/journey/ongoing/vjout/tram/#
```
- `vjout` means the vehicle signed off the journey, so we can remove it immediately.
- Raide-Jokeri can't be filtered out by the broker, and it's a big share: **26 %** of the unique
  level 0–3 messages at morning peak. The client drops it.
- **Line filter active:** put the `route_id` in the filter, e.g.
  `/hfp/v2/journey/ongoing/vp/tram/+/+/1004/+/+/+/+/3/#`. That's one filter per line and
  level; MQTT allows many in one `SUBSCRIBE`. Base `route_id`s don't match variant IDs like
  `1001H6`, which is acceptable: depot runs only show in "all lines" mode.
- **Smooth mode** (opt-in toggle, "uses ~15× more data"): subscribe to all levels and
  interpolate between fixes.
- **Stale handling:** in level-filtered mode, a tram standing still sends nothing. Waiting at
  a stop or a red light takes one to two minutes. So:
  - dim a tram after **3 min** without messages
  - drop it after **6 min**, or immediately on `vjout`
  - in smooth mode, use 15 s and 60 s

### MQTT client
- **Recommended:** a tiny hand-written MQTT 3.1.1-over-WebSocket client
  (`src/app/trams/mqtt-lite.ts`, about 200 lines). It needs `CONNECT`, `SUBSCRIBE` with
  several filters, incoming `PUBLISH` at QoS 0, `PINGREQ` and `DISCONNECT`, and uses the
  WebSocket subprotocol `mqtt`. There's no new dependency, and it's easy to test with byte
  fixtures.
- **Fallback:** `mqtt` (mqtt.js) behind the same `TramFeed` interface, about 90 kB gzipped in
  the lazy chunk. It was used for the verification scripts and works against the broker.

### Service shape
Put it in `src/app/trams/tram-feed.service.ts`:
- `connect(filters)` / `disconnect()`
- `status: Signal<'connecting' | 'live' | 'reconnecting' | 'offline'>`
- `vehicles: Signal<ReadonlyMap<string, TramState>>`, throttled
- Reconnect with exponential backoff (1 s → 30 s).
- Parse the topic (headsign, next stop, level) and the payload. Deduplicate on
  `oper/veh/tst`.
- Drop `lat == null`, line 15, and positions outside the bounding box.
- **Disconnect when the tab is hidden** (`visibilitychange`) and on route leave
  (`DestroyRef`). Provide a **Pause** button.

## 7. Page and UX

`src/app/pages/trams.component.ts` follows `.github/instructions/angular-pages.instructions.md`:
- Back link, `marker` heading, subtitle, and `GlowCard` wrappers with staggered animations.
- **Controls card:**
  - line filter chips (all / none / 1 … 13)
  - "show depot runs" toggle
  - preset picker
  - Smooth mode toggle
  - Pause/Resume
  - status badge and vehicle count
- **Map card:** `overflow-x-auto` region, same as the ASCII page. The loading placeholder is
  itself ASCII: an animated `. . .` grid.
- **Details panel:**
  - line and headsign
  - speed (`spd × 3.6` km/h)
  - delay: `dl > 0` → "1 min ahead", `dl < 0` → "2 min late", `null` → "—"
  - doors open or closed
  - next stop name, looked up from the GTFS asset
  - "updated 12 s ago"
- **Accessibility:**
  - The `<pre>` map has `role="img"` and a summary label, e.g. "Map of Helsinki with 42 trams".
  - A visually hidden, keyboard-navigable **list of trams** acts as the accessible equivalent
    and doubles as click targets. Group it by line. Announce only on explicit selection; no
    `aria-live` flood.
  - Must pass the existing `e2e/accessibility.spec.ts` axe checks.
- **i18n:** add `trams.*` keys to `translations.ts` (EN + FI) and `explore.trams*`
  description and keywords, so the page appears in search.
- Add the page to `public/sitemap.xml` and the README page list.

## 8. File layout

```
scripts/build-tram-map.mjs            # one-off GTFS + OSM → JSON generator
public/data/helsinki-trams.json       # generated, committed
src/app/trams/
  mqtt-lite.ts (+ .spec.ts)           # minimal MQTT-over-WS client
  hfp.ts (+ .spec.ts)                 # topic/payload parsing, dedupe, line-15 filter → TramState
  hfp-filters.ts (+ .spec.ts)         # builds subscription filters (levels × lines)
  tram-feed.service.ts                # connection, throttling, stale pruning
  grid.ts (+ .spec.ts)                # lat/lon ↔ cell for presets
  ascii-raster.ts (+ .spec.ts)        # lines, polygon fill, glyph choice, label placement
  tram-map.model.ts                   # types for the JSON asset
src/app/pages/trams.component.ts      # page UI
e2e/fixtures/hfp-sample.json          # recorded real messages (topic + payload)
e2e/trams.spec.ts                     # Playwright
```

## 9. Testing

- **Unit tests (Vitest):**
  - MQTT packet encode and decode with byte fixtures
  - HFP parsing with real recorded messages: `null` coordinates, `dl: null`, variant route
    IDs (`1001H6`, `100HA5`), line 15 exclusion, and dedupe of 4× copies
  - Filter builder output
  - Grid mapping, including cell boundaries at exact 0.001° values
  - Rasteriser output on tiny inputs
  - Stale pruning with fake timers
- **Playwright:** mock the socket with `page.routeWebSocket` and replay
  `e2e/fixtures/hfp-sample.json`. Assert that:
  - the map renders
  - trams appear
  - filters hide lines
  - selecting a tram shows details
  - the offline state appears when the socket closes
  - axe passes
- **Production smoke test** (`e2e/production.smoke.ts`): assert only that the page and base
  map load. Never depend on live trams.

## 10. Milestones

1. **Static map.** Generator script, JSON asset, grid and rasteriser, and the page with the
   ASCII Helsinki map. No live data yet.
2. **Live trams.** MQTT client, HFP parsing and dedupe, feed service with the level 0–3
   subscription, overlay and status badge. Recheck the 4× duplication in a real browser.
3. **Interaction.** Line filters with per-line subscriptions, depot-run toggle, selection
   details, accessible list, pause and visibility handling.
4. **Polish.** Smooth mode, trails, presets, mobile tuning, README and notices, and the
   GTFS re-run for lines 11 and 12 after 9 Nov 2026.

Each milestone is a separately shippable PR.

## 11. Answered and remaining questions

**Answered by the API check**

| Question | Answer |
| --- | --- |
| WebSocket URL | `wss://mqtt.hsl.fi:443/` |
| Tram route IDs | Lines map to `10xx`, plus suffix variants. Line 15 is `2015`, and GTFS `route_type` 900 leaves it out. |
| Is line 13 a tram in HFP? | Yes, `1013`, seen live. |
| Can we cut bandwidth? | Yes. The geohash level 0–3 filter cuts it ~14× and matches the grid. |
| Deadruns? | They need authorisation, so they're dropped. `H` depot journeys are visible as normal journeys. |
| 4× duplicate delivery? | Still there in a browser (milestone 2, §6). Only `vp` is duplicated, not `vjout`, which points to the broker. Deduplicated. |

**Still open**
- **Overpass availability.** It was overloaded during the check. The generator needs
  retries, mirrors and a land-polygon fallback.
- **Peak-hour load.** Weekday morning peak (29 Sep, 07:50) had 108 vehicles including line 15,
  and 7.5 unique level 0–3 fixes per second, 1.5× the evening. Done unless it grows further.
- **Lines 11 and 12.** They start on 9 Nov 2026. Confirm they appear in HFP as `tram` with
  `1011`/`1012`.
- **Unicode box-drawing vs pure ASCII.** Decide during milestone 1, or offer a toggle.
