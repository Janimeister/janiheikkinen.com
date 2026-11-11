---
description: "Create a new routed detail page with API data. Use when adding a new page like weather, electricity, or github to the site."
agent: "agent"
argument-hint: "Describe the page topic and API to use"
---

Create a new routed detail page for this Angular portfolio site.

## Requirements

1. **Create the page component** at `src/app/pages/{name}.component.ts`:
   - Rely on Angular 22's default `OnPush` change detection
   - Fetch reactive HTTP data with `httpResource()`
   - Import and use `GlowCardComponent` from `../components/shared/glow-card.component` for data sections
   - Import `PageHeaderComponent` from `../components/shared/page-header.component` for the header
   - Use inline template and styles
   - Start with `<app-page-header titleKey="{name}.title" subtitleKey="{name}.subtitle" marker="{color}" />`, which renders the "Back to Home" link and the `<h1>` title
   - Request data only in the browser (`injectIsBrowser()` from `../platform`), since every page is prerendered at build time, and show the loading shimmer while `isWaiting(resource)`
   - Show loading shimmer (`animate-pulse` divs) while data loads
   - Show error state with `text-red-400` class when API fails
   - Wrap data sections in `<app-glow-card>` with `animate-fade-slide-up stagger-N` classes
   - Follow the neo-brutalist design system in `docs/design-system.md` (marker-highlighted `h1`, 2px ink borders, hard shadows, pop fills with ink text; see §9 "Adding a new page")

2. **Register the page** in `src/app/navigation/page-registry.ts`. That one entry supplies the route in both languages (`/{path}` and `/fi/{path}`), the Explore launcher entry, the homepage card, the prerendered `{path}.html` files and the sitemap entries. Set `titleKey` to the page's `<h1>` translation key and `metaKey` to a new `meta.{name}` description

3. **Add the copy**. The heading (`{name}.title`), the launcher keys (`explore.{name}Description`, `explore.{name}Keywords`) and `meta.{name}` go in `src/app/i18n/translations.ts` and `translations.fi.ts`. The rest of the page's copy goes in `src/app/i18n/pages/{name}.en.ts` and `{name}.fi.ts`: add both to `src/app/i18n/pages/index.ts`, and call `registerTranslations('en', {NAME}_EN)` at the top of the page component

4. **Add tests**:
   - Put data shaping in a plain module (like `src/app/weather/forecast.ts`) with a Vitest spec beside it
   - Add `e2e/{name}.spec.ts` importing `test` from `./api-mocks`: heading/back-link, the data a fixture response renders, the error card via `failApi()`, and attribution if applicable
   - For a new API, add its URL pattern and fixture to `e2e/api-mocks.ts` and `e2e/fixtures/api-data.ts`
   - Add the route to `NAV_ROUTES` in `e2e/navigation.spec.ts` and to `PAGES` in `e2e/accessibility.spec.ts` and `e2e/prerender.spec.ts`

5. **Handle CORS**: If the API has CORS issues, add a proxy entry in `proxy.conf.mjs` instead of calling the API directly

6. **Attribution**: If the API requires attribution, add a visible link and update `THIRD-PARTY-NOTICES.md`

7. **Build and test**: Run `npm run build` and `npx playwright test` to verify everything works

## Page structure to follow

```
Header: back link + h1 title
Loading state: shimmer placeholders
Error state: red error message
Data sections: brutalist cards with staggered animations
Attribution: link to data source
```
