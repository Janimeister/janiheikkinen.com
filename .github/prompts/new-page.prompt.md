---
description: "Create a new routed detail page with API data. Use when adding a new page like weather, electricity, or github to the site."
agent: "agent"
argument-hint: "Describe the page topic and API to use"
---

Create a new routed detail page for this Angular portfolio site.

## Requirements

1. **Create the page component** at `src/app/pages/{name}.component.ts`:
   - Use `ChangeDetectionStrategy.OnPush`
   - Fetch data with `resource()` — NOT HttpClient
   - Import and use `GlowCardComponent` from `../components/shared/glow-card.component` for data sections
   - Import `RouterLink` for the back link
   - Use inline template and styles
   - Include a header with "Back to Home" link (`routerLink="/"`) and an `<h1>` title
   - Show loading shimmer (`animate-pulse` divs) while data loads
   - Show error state with `text-red-400` class when API fails
   - Wrap data sections in `<app-glow-card>` with `animate-fade-slide-up stagger-N` classes
   - Use Tailwind CSS classes matching the existing dark theme

2. **Add the route** in `src/app/app.routes.ts` — add before the wildcard redirect

3. **Add navbar link** in `src/app/components/navbar/navbar.component.ts` — add a `routerLink` entry

4. **Add Playwright tests** in `e2e/app.spec.ts`:
   - Add the route to the `NAV_ROUTES` array
   - Add a test describe block with heading/back-link test, data sections test using `expectSectionOrError()`, and attribution test if applicable

5. **Handle CORS**: If the API has CORS issues, add a proxy entry in `proxy.conf.json` instead of calling the API directly

6. **Attribution**: If the API requires attribution, add a visible link and update `THIRD-PARTY-NOTICES.md`

7. **Build and test**: Run `npx ng build` and `npx playwright test` to verify everything works

## Page structure to follow

```
Header: back link + h1 title
Loading state: shimmer placeholders
Error state: red error message
Data sections: glow cards with staggered animations
Attribution: link to data source
```
