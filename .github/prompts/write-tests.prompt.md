---
description: "Write or update Playwright e2e tests in `e2e/<page>.spec.ts`, one file per page.

## Conventions

### Test Structure
- Import `test` and `expect` from `./api-mocks` (not `@playwright/test`)
- Group tests by page/feature using `test.describe()`
- Keep test names descriptive and concise

### Helpers
- `e2e/helpers.ts`: `expectBackLink(page)`, `expectAttribution(page, href)`, `SLOW_TIMEOUT`
- `e2e/api-mocks.ts`:
  - The auto fixture serves every API from `e2e/fixtures/api-data.ts` and fails the test on a request to any unmocked third-party host
  - `failApi(page, api, status?)` makes one API fail; `respondWith(page, api, body)` swaps its response. Call them before `page.goto()`
  - `freezeClock(page)` fixes `Date` at `FIXED_NOW`; pair it with `test.use({ timezoneId: TIME_ZONE })`
  - `page.waitForRequest(API.weather)` checks what a page asked for

### Data-Driven Tests
- `NAV_ROUTES` in `navigation.spec.ts` for navigation link tests
- `SOCIAL_LINKS` in `home.spec.ts` for social link tests
- `PAGES` in `accessibility.spec.ts` for axe scans
- Add new entries to these arrays when adding new pages/links

### API-Dependent Tests
- Assert the exact values the fixture produces: numbers, counts, order, labels
- Cover the error card and empty or odd responses in their own tests
- For a new API, add its pattern to `API` and its fixture to `RESPONSES`

### What to Test
- Navigation: links exist and navigate to correct routes
- Page structure: heading, back link, key sections visible
- Data rendering: what the page shows for a known response, and for a failed one
- Attribution: required attribution links are present
- Responsive: critical content visible on mobile viewports

### What NOT to Test
- CSS animation names or computed styles
- Data shaping in detail: move it into a plain module with a Vitest spec beside it
- Internal component implementation details

## After Writing Tests
Run `npx playwright test` to verify all tests pass.
