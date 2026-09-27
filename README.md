# janiheikkinen.com

Personal portfolio and dashboard site built with Angular 22, Tailwind CSS 4, and TypeScript.

Live site: [janiheikkinen.com](https://janiheikkinen.com).

## Getting Started

Use **Node.js 24**, matching the GitHub Actions workflows, and npm. The `packageManager` field in [package.json](package.json) records the project's npm version.

```bash
git clone https://github.com/Janimeister/janiheikkinen.com.git
cd janiheikkinen.com
npm ci
npm start
```

Open `http://localhost:4200/`. The development server automatically uses [proxy.conf.json](proxy.conf.json) for electricity API requests; no local API key is needed.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Angular 22](https://angular.dev) (standalone components, signals, Signal Forms) |
| Language | [TypeScript 6](https://www.typescriptlang.org) |
| Build tool | [Vite](https://vite.dev) via `@angular/build` |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) via `@tailwindcss/postcss` — neo-brutalist design system, see [docs/design-system.md](docs/design-system.md) |
| Routing | Angular Router with lazy-loaded page components |
| Data fetching | Angular `httpResource()` and `HttpClient` APIs |
| E2E testing | [Playwright](https://playwright.dev) |
| Accessibility testing | [axe-core/playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) |
| Unit testing | [Vitest](https://vitest.dev) through Angular's native `@angular/build:unit-test` builder |

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
│   ├── pet.component.ts         # Virtual pet simulator
│   ├── sorting.component.ts     # Sorting algorithms visualizer
│   ├── searching.component.ts   # Search algorithms visualizer
│   ├── pathfinding.component.ts # Weighted grid pathfinding visualizer
│   └── third-party-notices.component.ts # Third-party license notices
├── components/
│   ├── hero/                # Hero section with typing effect and deco shapes
│   ├── navbar/              # Compact header and Explore dialog
│   ├── language-toggle/     # EN/FI language switcher
│   ├── footer/              # Site footer
│   ├── shared/              # GlowCardComponent, FloatingOrbComponent
│   └── cookie-notice/       # Cookie consent banner
├── navigation/              # Shared page registry, search and page cards
├── sorting/                  # Sorting algorithms, metadata and event generators
├── searching/                # Search algorithms and event generators
├── pathfinding/              # Weighted grid algorithms and event generators
├── visualization/            # Shared playback, metadata types and category nav
├── i18n/                    # Signal-based runtime translations
├── app.routes.ts            # Route definitions
└── app.config.ts            # Application configuration
```

Theme tokens and animation keyframes are centralized in `src/styles.css`. The visual language ("Paper & Ink" neo-brutalism — cream background, 2px ink borders, hard offset shadows, flat pop-color fills) is documented in [docs/design-system.md](docs/design-system.md).

## Explore Navigation

The compact header keeps the home logo, current page, language toggle and **Explore** button visible. Explore opens a searchable, grouped page launcher; on mobile it fills the screen. `Ctrl+K` / `Cmd+K` opens or closes it, and Escape dismisses it. The dialog contains keyboard focus, restores focus when dismissed and prevents background scrolling. Search matches translated titles, descriptions, categories and keywords. **Surprise me** opens a different experiment or game.

The homepage displays the same page cards below the introduction. Add a page to `src/app/navigation/page-registry.ts` with its lazy component loader, category and translation keys, then add the English and Finnish copy to `src/app/i18n/translations.ts`. That single entry supplies the route, launcher and homepage card. Third-party notices remain a footer destination.

Navigation behavior and dialog accessibility are covered in `e2e/navigation.spec.ts`; registry/search behavior and component state also have unit tests.

## Algorithms Visualizer

The **Sorting**, **Searching**, and **Pathfinding** routes share one playback controller for event timing, speed changes, pause/resume, single stepping, reset, and cancellation. Algorithm generators produce typed events; page components apply those events to visualization state. Each algorithm's name, description, category, complexity, requirements, and relevant characteristics live beside its generator in a catalog.

- Sorting supports Bubble, Insertion, Merge, and Quick Sort with up to 80 values. Its complexity metadata describes the standard algorithm and excludes the extra state used to animate it.
- Searching compares Linear and Binary Search over 5–80 ordered distinct values. The target can be typed, picked from the data, or set to a value that is absent.
- Pathfinding compares BFS, Dijkstra, and A* on a 10 × 12 grid. Users can move endpoints and edit walls or terrain costs; tile entry costs are 1, 3, or 8. Diagonal movement is disabled. BFS minimizes moves and ignores weights, while Dijkstra and A* minimize total terrain cost.

The elapsed counters show visualization playback time, including the chosen delay. They are not computational benchmarks. Pure algorithm correctness tests live alongside each algorithm catalog; page behavior and representative browser flows are covered by component and Playwright tests.

See [docs/algorithms-visualizer.md](docs/algorithms-visualizer.md) for event and cost-model details.

## Language Support

The app supports English and Finnish through a small runtime i18n layer in `src/app/i18n/`. Users can switch language from the navbar using the EN/FI segmented control. The selected language is stored in `localStorage` under `app-language`, updates the document `<html lang>` attribute, and is applied immediately without changing routes or requiring a separate build.

Static UI copy is translated in the app. External content such as GitHub repository descriptions, cat facts, and third-party notice file contents is shown as returned by its source.

## External APIs

| Page | API | Notes |
|---|---|---|
| Weather | [Open-Meteo](https://open-meteo.com) | Free, no key required |
| Electricity | [api.porssisahko.net](https://api.porssisahko.net) | Dev: proxied via `proxy.conf.json`; Prod: routed through a Cloudflare Worker (`porssisahko-proxy.janimeister.workers.dev`) |
| GitHub | [GitHub REST API](https://docs.github.com/en/rest) | Unauthenticated — 60 req/hr |
| Home | [Cat Facts](https://catfact.ninja) | Random cat fact in the hero section |

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

Production browser assets are written to `dist/janiheikkinen-com/browser/`. A local production build uses the Worker URL in [src/environments/environment.prod.ts](src/environments/environment.prod.ts).

### Watch mode (development build)

```bash
npm run watch
```

### Unit tests

Unit tests use Vitest through Angular's native zoneless test builder:

```bash
npm test
```

To run in watch mode during development:

```bash
npm run test:watch
```

### End-to-end tests

Install the browser binaries and required system libraries once, then run the suite:

```bash
npx playwright install --with-deps
npx playwright test
```

Tests cover navigation, page structure, API data loading, and the algorithm visualizers in Chromium, Firefox, and WebKit. Playwright starts the local development server automatically. HTML reports are written to `playwright-report/`.

### Accessibility tests

Automated accessibility checks using axe-core scan every page for WCAG 2.0 and 2.1 A/AA rule violations:

```bash
npx playwright test e2e/accessibility.spec.ts
```

These checks run as part of the full Playwright suite. Navigation tests also exercise keyboard interaction and focus management; automated checks do not replace a manual accessibility review.

## CI and Deployment

[Tests](.github/workflows/test.yml) runs on pull requests to `main`, on manual dispatch, and when called by the deployment workflow. Its three jobs check the production build, Vitest unit tests, and Playwright end-to-end/accessibility tests. Failed browser runs upload the HTML report for seven days.

[Deploy to GitHub Pages](.github/workflows/deploy.yml) runs on pushes to `main` or manual dispatch. It waits for all test jobs before building and deploying the site.

For deployment, configure:

- GitHub Pages to use **GitHub Actions** as its source.
- A repository **variable** named `PORSSISAHKO_WORKER_URL` containing the electricity proxy's base URL, for example `https://porssisahko-proxy.janimeister.workers.dev`.

The deployment build requires that variable and generates `src/environments/environment.prod.ts` from it. The Worker itself is managed outside this repository. The workflow builds with base href `/`, copies `index.html` to `404.html` for direct visits to client-side routes, and publishes `dist/janiheikkinen-com/browser/`. The custom domain is recorded in [public/CNAME](public/CNAME).
