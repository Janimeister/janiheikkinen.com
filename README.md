# janiheikkinen.com

Personal portfolio and dashboard site built with Angular 21, Tailwind CSS 4, and TypeScript.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Angular 21](https://angular.dev) (standalone components, signals) |
| Language | [TypeScript 5.9](https://www.typescriptlang.org) |
| Build tool | [Vite](https://vite.dev) via `@angular/build` |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) via `@tailwindcss/postcss` |
| Routing | Angular Router with lazy-loaded page components |
| Data fetching | Angular `resource()` API |
| E2E testing | [Playwright](https://playwright.dev) |

## Architecture

```
src/app/
├── pages/                   # Routed page components
│   ├── home.component.ts        # Landing page
│   ├── weather.component.ts     # Weather data (Open-Meteo API)
│   ├── electricity.component.ts # Electricity prices (api.porssisahko.net)
│   ├── github.component.ts      # GitHub activity (GitHub REST API)
│   ├── ascii.component.ts       # Procedural ASCII art generator
│   ├── snake.component.ts       # Classic Snake game
│   └── pet.component.ts         # Virtual pet simulator
├── components/
│   ├── hero/                # Hero section with particle canvas and typing effect
│   ├── navbar/              # Top navigation bar (scrollable on small screens)
│   ├── footer/              # Site footer
│   ├── shared/              # GlowCardComponent, FloatingOrbComponent
│   └── cookie-notice/       # Cookie consent banner
├── app.routes.ts            # Route definitions
└── app.config.ts            # Application configuration
```

Theme tokens and animation keyframes are centralized in `src/styles.css`.

## External APIs

| Page | API | Notes |
|---|---|---|
| Weather | [Open-Meteo](https://open-meteo.com) | Free, no key required |
| Electricity | [api.porssisahko.net](https://api.porssisahko.net) | Dev: proxied via `proxy.conf.json`; Prod: routed through a Cloudflare Worker (`porssisahko-proxy.janimeister.workers.dev`) |
| GitHub | [GitHub REST API](https://docs.github.com/en/rest) | Unauthenticated — 60 req/hr |

## ASCII Art Page

The `/ascii` page procedurally generates ASCII art using eight algorithms:

- **Plasma** — multiple layered sine/cos components, including horizontal, vertical, diagonal, and radial terms, are combined and normalised to `[0, 1]`, producing organic flowing colour-field patterns. Scale and phase are seeded randomly for unique results every generation.
- **Mandelbrot** — classic Mandelbrot set iteration with smooth (continuous) colouring via escape-time logarithmic normalisation. One of six hand-picked interesting regions is chosen randomly per generation, each with a preset zoom level.
- **Wave Interference** — three to five point wave sources are placed at random positions, each emitting circular sine waves with their own wavelength and phase. The superposition of all waves is normalised to `[0, 1]`, creating moiré-style interference patterns.
- **Spiral Galaxy** — logarithmic spiral arms (2–4 arms, seeded tightness and rotation) rendered with a Gaussian arm-width kernel, a bright Gaussian galactic-centre blob, and sparse hash-noise star field.
- **Terrain** — layered-sine heightmap for foreground and background mountain ridges, hash-noise star/tree placement, a circular moon, and a sinusoidal water surface at the bottom.
- **Coral Bloom** — lightweight reaction-diffusion approximation: random activator blobs seed a scalar field, which is then iterated through a box-blur → logistic-growth / feed-kill → clamp loop to grow organic coral / lichen structures.
- **Wind Lines** — a vector flow field built from layered trigonometric functions, then sampled by tracing hundreds of short streamlines through it. Sparse cells show directional characters (`-`, `|`, `/`, `\`); dense cells use the luminance ramp.
- **Island Contours** — a height field shaped with three radial quadratic/parabolic falloff island bumps plus layered sine noise, rendered as a topographic map: contour lines are detected by comparing each cell's elevation band against its neighbours, and each band is drawn with an elevation-appropriate character.

Characters reveal via a smooth radial wave animation from centre outward. Each generation uses a random seed for unique results.

## Snake Game Page

The `/snake` page is a classic Snake game rendered on an HTML5 canvas, built with Angular signals and `requestAnimationFrame` for smooth gameplay.

**Controls:**
- **Desktop:** Arrow keys or WASD to steer, Space/P to pause, Enter to start/restart.
- **Mobile:** Swipe on the canvas to change direction, or use the on-screen D-pad buttons (shown only on small screens).

**Features:**
- Progressive speed increase as the score grows (5 speed levels).
- Persistent high score stored in `localStorage`.
- Fixed-size canvas for consistent gameplay and rendering.
- Touch-optimised — `touch-none` canvas prevents scroll interference, dedicated D-pad for precise control on mobile.

## Virtual Pet Page

The `/pet` page is a virtual pet simulator. Each run starts with a mystery egg that hatches into one of eight randomly-assigned species (kitten, puppy, dragonling, alien, fox, bunny, chick, axolotl), each with its own personality and colour accent.

**Care mechanics:**
- Four core stats — **Hunger**, **Happiness**, **Energy**, **Cleanliness** — plus overall **Health**.
- All four core stats decay over real time (including while the tab is closed, capped at 8 hours of offline decay).
- Five care actions: **Feed**, **Play**, **Clean**, **Sleep/Wake**, and **Give Medicine**.
- Pets progress through life stages — Baby → Child → Teen → Adult — based on real-time age, with the displayed sprite changing accordingly.
- Health passively recovers when the pet is well cared for, and drops when core stats stay at zero. If Health reaches 0, the pet passes away and a new egg must be hatched.

**Randomness:**
- Which species hatches from each egg is random.
- While awake, the pet may trigger random events (surprise snacks, new friends, sneezes, burst of energy, …) that nudge stats in either direction. Events appear in the on-screen log.

**Persistence:**
- Pet state (species, name, age, stats) is stored in `localStorage` so your pet keeps growing across visits.

## Commands

### Development server

Start the dev server with the proxy configuration (required for the Electricity API):

```bash
npx ng serve --port 4200
```

Open `http://localhost:4200/` in your browser. The app reloads automatically on file changes.

### Production build

```bash
npx ng build
```

Build artifacts are written to the `dist/` directory.

### Watch mode (development build)

```bash
npm run watch
```

### End-to-end tests

Playwright tests cover navigation, page structure, and API data loading:

```bash
npx playwright test
```

Tests run against a local dev server that Playwright starts automatically. HTML reports are written to `playwright-report/`.
