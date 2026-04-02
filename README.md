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
│   └── github.component.ts      # GitHub activity (GitHub REST API)
├── components/
│   ├── hero/                # Hero section with particle canvas and typing effect
│   ├── navbar/              # Top navigation bar
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
