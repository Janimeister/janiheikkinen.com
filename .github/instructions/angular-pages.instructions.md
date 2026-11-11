---
description: "Angular page component conventions — data fetching with httpResource(), brutal cards, loading/error states, staggered animations, back links."
applyTo: "src/app/pages/**/*.ts"
---

# Page Component Conventions

- Use `httpResource()` for reactive HTTP reads and `HttpClient` for imperative requests or mutations
- Import `GlowCardComponent` (renders a `.glow-card` — now a brutalist bordered card) for data section wrappers
- Start the page with `<app-page-header titleKey="…" subtitleKey="…" marker="…" />` (`PageHeaderComponent`): it renders the "Back to Home" link, the `h1` and the subtitle
- Link to other pages with `[routerLink]="i18n.path('/path')"`, so links stay in the visitor's language (`/fi/path` in Finnish)
- Keep the page's copy in `src/app/i18n/pages/{name}.en.ts` and `{name}.fi.ts`, and call `registerTranslations('en', …)` at the top of the component file
- Pages are prerendered at build time: request data only in the browser (`injectIsBrowser()` / `isWaiting()` from `src/app/platform.ts`) and read `localStorage` in `afterNextRender`
- Show `animate-pulse` shimmer divs during loading (use `bg-ink/10`)
- Show `.text-red-400` error messages on API failure (token overridden to a dark red for AA contrast)
- Wrap sections in `animate-fade-slide-up stagger-N` for entrance animations
- Include API attribution links where required
- Style: 2px ink borders, hard offset shadows, pop color fills with ink text, no gradients/glows/rounded corners
