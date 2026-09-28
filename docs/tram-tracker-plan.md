# ASCII Tram Tracker – Plan

A live map of Helsinki trams, in the spirit of [sporat.fi](https://sporat.fi), where both the
map and the vehicles are drawn in ASCII. It gets its data from the Digitransit / HSL
**High-frequency positioning (HFP)** MQTT API and is limited to the City of Helsinki tram network.

> Status: plan only. Nothing is implemented yet.

## 1. Feasibility

It fits this site without a backend:

| Concern | Finding |
| --- | --- |
| Data access | HFP is a public MQTT broker (`mqtt.hsl.fi`) with **no API key**, unlike the Digitransit GraphQL/routing APIs. |
| Browser support | The broker accepts MQTT over secure WebSockets (`wss://mqtt.hsl.fi:443/`), so the browser can connect directly. |
| Hosting | The site is static on GitHub Pages. WebSockets are not subject to CORS, so no proxy is needed, in dev or in production. |
| Filtering | Topics include the transport mode, so we can subscribe to trams only. |
| Update rate | About one message per vehicle per second. That's enough for smooth-looking movement on a character grid. |
| License | HSL open data, CC BY 4.0. It needs attribution ("© HSL / Digitransit") on the page and in `THIRD-PARTY-NOTICES.md`. |

The main costs are **bandwidth**, **map data preparation** and **rendering performance**. Each
is covered below.

## 2. HFP essentials

Verify these against the Digitransit HFP docs before implementation.

- **Broker:** `wss://mqtt.hsl.fi:443/` (MQTT 3.1.1, anonymous, clean session, QoS 0).
- **Topic layout:**
  ```
  /hfp/v2/journey/ongoing/<event>/<mode>/<oper>/<veh>/<route_id>/<dir>/<headsign>/<start>/<next_stop>/<geohash_level>/<geohash>/<sid>/#
  ```
- **Subscription:** `/hfp/v2/journey/ongoing/vp/tram/#`. `vp` means vehicle position and
  `ongoing` means the tram is in service on a journey.
  - Optional later step: add `/hfp/v2/deadrun/+/vp/tram/#` to show depot runs dimmed.
  - Geohash segments in the topic let us narrow the subscription to an area. We don't need
    that at first, because the whole tram network sits inside Helsinki's bounding box.
- **Payload** (`{"VP": {...}}`) fields we use:
  - `desi`: line number shown to riders ("4", "6T", "15")
  - `veh`, `oper`: together these give a unique vehicle key `oper/veh`
  - `lat`, `long`: position (can be `null`)
  - `hdg`: heading in degrees
  - `spd`: speed in m/s
  - `dl`: delay in seconds, positive means ahead of schedule
  - `drst`: door status
  - `stop`: current stop, if any
  - `tst`: timestamp
  - `occu`: occupancy
  - From the topic itself: `headsign` (URL-encoded) and `next_stop`
- **Volume:** peak service runs about 100–130 trams at 1 Hz. Each message is roughly 350–450 B,
  so the page receives **about 40–60 kB/s, or about 150–200 MB per hour**. That calls for
  mitigation (see §6).

## 3. Scope

**In scope (MVP)**
- New page `/trams` registered in `SITE_PAGES`, group `everyday`, with EN and FI translations.
- ASCII base map of central Helsinki: coastline and sea, islands, tram tracks, stops and a few
  landmarks and district labels.
- Live trams drawn as their line number (`4`, `6T`) or a direction glyph on the track, coloured
  by line.
- Line filter chips (same UI pattern as the algorithm buttons on the ASCII page).
- Click, tap or keyboard-select a tram to see details: line, headsign, speed, delay, next stop
  and last update time.
- A connection status badge (connecting / live / reconnecting / offline) and a stale-vehicle
  timeout.

**Later**
- Zoom levels and panning. The architecture allows this from day one (§5).
- Trails, where a tram leaves a fading `·` path behind it.
- Deadrun trams, occupancy, and a "follow this tram" mode.
- A small ASCII departures board for a selected stop.

**Out of scope:** buses and metro, routing, and anything that needs a Digitransit API key.

**Area:** Helsinki city tram network. Approximate bounding box `lat 60.150–60.215`,
`lon 24.880–25.010`. This covers Kaivopuisto–Arabia and Munkkiniemi–Kalasatama. Raide-Jokeri
(line 15) runs far outside that box, from Keilaniemi to Itäkeskus. Either clip it, or use a
second "wide" viewport preset for it. Decide during implementation. The default is to clip and
list line 15 in the filter as "partly shown".

## 4. Map data (build time)

Download geodata once with a script, convert it into a small static asset, and commit the
result. Don't fetch map data at runtime.

1. **`scripts/build-tram-map.mjs`** (Node, no new runtime deps):
   - **Tracks and stops:** HSL GTFS static feed (CC BY 4.0). From it:
     - `routes.txt`, filtered to `route_type = 0` (tram)
     - `trips.txt` → `shapes.txt` for one representative shape per line and direction
     - `stops.txt` for tram stops, with names for the "next stop" label
     - This gives per-line polylines, so tracks can be coloured by line.
   - **Coastline, water, islands and parks:** OpenStreetMap through the Overpass API (ODbL)
     within the bounding box: `natural=coastline`, `natural=water`, `leisure=park`, plus a
     few `place=*` labels.
   - Simplify the geometry with Douglas–Peucker to about 10–20 m and round coordinates to
     5 decimals.
   - Output `public/data/helsinki-trams.json`, about 50–150 kB before gzip. It holds
     `{ bbox, lines: {desi, color, shapes[]}, stops: {id, name, lat, lon}, water[], parks[], labels[] }`.
2. Commit the generated JSON so CI builds and GitHub Pages don't depend on Overpass or HSL
   being up. Re-run the script by hand after network changes, such as a new line.
3. Add attribution for OSM (ODbL) and HSL (CC BY 4.0) to `THIRD-PARTY-NOTICES.md` and in the
   page footer.

## 5. Rendering (runtime)

### Projection
Use an equirectangular projection around the bounding-box centre, which is accurate enough for
a city:
```
x = (lon - lon0) * cos(lat0) * 111_320 m
y = (lat0 - lat) * 110_540 m
col = x / metersPerCol
row = y / (metersPerCol * CHAR_ASPECT)   // CHAR_ASPECT ≈ 2 (cells are ~2× taller than wide)
```
The grid size depends on container width. Measure one monospace cell and target about
100–160 columns on desktop and about 60 on mobile. Keep the existing `ASPECT_CORRECTION` idea
from `ascii.component.ts`.

### Layers
Composite these into a `Cell[][]` grid, where each cell is `{ ch, cls }`:

| Layer | Glyphs | Notes |
| --- | --- | --- |
| Sea / lakes | `~` `≈` (alternating by row for texture) | Fill polygons with a scanline algorithm |
| Land | ` ` | Background |
| Parks | `"` or `,` | Low contrast |
| Tram tracks | `─ │ ╱ ╲ ┼`, or ASCII-only `- \| / \\ +` | Bresenham lines. Choose the glyph from segment angle, and merge where lines cross |
| Stops | `o` | |
| Labels | `KALLIO`, `TÖÖLÖ`, `KAMPPI`… | Placed last so they don't hide tracks |
| **Trams** | line number, e.g. `4`, `6T`, `10` | Overlay. Draw the text centred on the snapped position. Arrow variant: `→ ↗ ↑ ↖ ← ↙ ↓ ↘` from `hdg` |

- **Pre-render the static layers once** per viewport/zoom into a base grid, and re-render only
  on resize or zoom. Each frame copies the base grid and stamps the trams on top.
- **Snap to track:** GPS jitter can put a tram one cell off its line. If a track cell of the
  tram's line is within about 1 cell, snap to it.
- **Collisions:** trams can overlap on shared tracks (Mannerheimintie, for example). Draw
  them in `tst` order. For overlapping cells, show `*` plus a count in the tooltip.

### Output technique
Two options:

- **A. `<pre>` with coloured `<span>` runs**. This matches the existing ASCII page, lets
  users select and copy text, and needs no canvas. The DOM is rebuilt about once a second, so
  batch same-class cells into runs to keep about 150 × 60 cells cheap.
- **B. `<canvas>` with `fillText` per cell**. This is fastest and makes per-cell colour and
  hit-testing trivial, but it's less "real text".

**Recommendation: A.** Render the base map as one static `<pre>`. Put a second, absolutely
positioned `<pre>` on top for the tram layer, mostly spaces. Only the overlay changes each
tick. Clicks map back to `(row, col)` from the measured cell size. Fall back to B only if
profiling shows jank.

### Animation
- Batch incoming messages into a `Map<vehicleKey, TramState>` and **render at most 1–2 fps**
  with `requestAnimationFrame` and a throttle. Don't re-render per message.
- Optionally interpolate between the last two fixes so trams glide through intermediate cells.
- Remove a vehicle after 60 s without updates. Dim it after 15 s.
- Respect `prefers-reduced-motion`: turn off interpolation and trails.

### Colours
Add a line-colour token map in the Tailwind theme, following
`.github/instructions/tailwind-theme.instructions.md`. HSL trams are green (`#00985f`) as a
brand, but for readability give each line a distinct pop colour from the existing palette.
The key requirement is that the ink text stays at AA contrast on those colours. Keep a legend.

## 6. Live data layer

### MQTT client
Two options:
- **`mqtt` (mqtt.js)**. Mature, but it adds about 90–100 kB min+gz to the lazy chunk. That
  still fits the budgets because it's route-lazy and not in the initial bundle.
- **A tiny hand-written MQTT 3.1.1-over-WebSocket client** (`src/app/trams/mqtt-lite.ts`,
  about 200 lines). It needs only `CONNECT`, `SUBSCRIBE`, incoming `PUBLISH` at QoS 0,
  `PINGREQ` and `DISCONNECT`. It's easy to unit-test with byte fixtures and adds no
  dependency. This fits the repo's minimal-dependency style.

**Recommendation:** the hand-written client. If it turns out fragile, switching to mqtt.js is
a one-file swap behind a `TramFeed` interface.

### Service shape
Put it in `src/app/trams/tram-feed.service.ts`:
- `connect()` / `disconnect()`
- `status: Signal<'connecting' | 'live' | 'reconnecting' | 'offline'>`
- `vehicles: Signal<ReadonlyMap<string, TramState>>`, updated in a throttled way
- Reconnect with exponential backoff (1 s → 30 s max).
- Parse the topic, which gives `headsign` and `next_stop`, plus the payload. Drop messages
  with `lat == null` or positions outside the bounding box.

### Bandwidth mitigation
- **Disconnect when the tab is hidden** (`visibilitychange`) and reconnect when it's visible
  again.
- **Disconnect on route leave** (`DestroyRef`).
- When a line filter is active, subscribe per line:
  `/hfp/v2/journey/ongoing/vp/tram/+/+/<route_id>/#`. For example, line 4 is route_id `1004`;
  map `desi` to `route_id` from the GTFS asset. When few lines are selected, this reduces
  traffic proportionally.
- Show a small "live data ≈ 50 kB/s" note and a **Pause** button for mobile users.

## 7. Page and UX

`src/app/pages/trams.component.ts` follows `.github/instructions/angular-pages.instructions.md`:
- Back link, `marker` heading, subtitle, and `GlowCard` wrappers with staggered animations.
- **Controls card:** line filter chips (all / none / individual), Pause/Resume, status badge
  and vehicle count.
- **Map card:** `overflow-x-auto` region, same as the ASCII page. The shimmer placeholder
  while the map JSON loads is itself ASCII: an animated `. . .` grid.
- **Details panel:** the selected tram's line, headsign, speed (km/h), delay (`+1 min` or
  `on time`), next stop name, and "updated 2 s ago".
- **Accessibility:**
  - The `<pre>` map has `role="img"` and a summary label, for example "Map of Helsinki with
    42 trams".
  - A visually hidden, keyboard-navigable **list of trams** acts as the accessible equivalent
    and doubles as click targets. It's grouped by line and updated politely without an
    `aria-live` flood; announce only on explicit refresh or selection.
  - Must pass the existing `e2e/accessibility.spec.ts` axe checks.
- **i18n:** add `trams.*` keys to `translations.ts` (EN + FI) and `explore.trams*` description
  and keywords, so the page appears in search.
- Add the page to `public/sitemap.xml` and to the README page list.

## 8. File layout

```
scripts/build-tram-map.mjs            # one-off geodata → JSON generator
public/data/helsinki-trams.json       # generated, committed
src/app/trams/
  mqtt-lite.ts (+ .spec.ts)           # minimal MQTT-over-WS client
  hfp.ts (+ .spec.ts)                 # topic/payload parsing → TramState
  tram-feed.service.ts                # connection, throttling, stale pruning
  projection.ts (+ .spec.ts)          # lat/lon ↔ grid
  ascii-raster.ts (+ .spec.ts)        # lines, polygon fill, glyph choice, label placement
  tram-map.model.ts                   # types for the JSON asset
src/app/pages/trams.component.ts      # page UI
e2e/trams.spec.ts                     # Playwright
```

## 9. Testing

- **Unit tests (Vitest):**
  - MQTT packet encode and decode with byte fixtures
  - HFP topic and payload parsing, including `null` coordinates and URL-encoded headsigns
  - Projection round-trips
  - Rasteriser output for tiny known inputs (snapshot of a 10×5 grid)
  - Glyph choice by angle
  - Stale pruning with fake timers
- **Playwright:** mock the WebSocket with `page.routeWebSocket` so tests don't depend on
  `mqtt.hsl.fi`. Replay a fixture of about 20 HFP messages and assert that:
  - the map renders
  - trams appear
  - filters hide lines
  - selecting a tram shows details
  - the offline state appears when the socket closes
  - axe passes
- **Production smoke test** (`e2e/production.smoke.ts`): assert only that the page and base
  map load. Never depend on live trams.

## 10. Milestones

1. **Static map.** Generator script, JSON asset, projection and rasteriser, and the page with
   the ASCII Helsinki map. No live data yet.
2. **Live trams.** MQTT client, HFP parsing, feed service, overlay layer and status badge.
3. **Interaction.** Line filters with per-line subscriptions, selection details, the
   accessible list, pause and visibility handling.
4. **Polish.** Interpolation, trails, deadruns, zoom and pan presets (City centre / Whole
   network incl. Jokeri), mobile layout tuning, README and notices.

Each milestone is a separately shippable PR.

## 11. Open questions / risks

- **Map readability at low resolution.** At about 60 columns on mobile, one cell is about
  100 m and parallel tracks merge. Mitigations: a mobile default zoom on the city centre,
  horizontal scroll, and drawing only line labels at stops.
- **Line 15 (Raide-Jokeri)** falls mostly outside the city-centre box. Clip it or add a wide
  preset (§3).
- **HFP details to confirm** against the docs:
  - the exact WebSocket path and port
  - the tram `route_id` scheme (`10xx`, and how Jokeri is coded)
  - whether line 13 appears as `tram` in the mode field
- **Broker availability:** HSL may throttle or close anonymous connections. Handle this with
  backoff and a clear offline state.
- **Unicode box-drawing glyphs** vs. pure ASCII: box drawing looks better but is less "ASCII".
  Offer a toggle, or choose one during milestone 1.
