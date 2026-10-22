---
description: "Playwright test conventions — helper functions, API resilience, data-driven tests, no animation testing."
applyTo: "e2e/**/*.ts"
---

# Playwright Test Conventions

- One spec file per page: `e2e/<page>.spec.ts`. Site-wide flows live in `navigation.spec.ts`, `language.spec.ts` and `accessibility.spec.ts`
- Import `test` and `expect` from `./api-mocks`, not `@playwright/test`. Its auto fixture answers every API the site reads from `e2e/fixtures/api-data.ts` and fails the test if a page reaches any other third-party host
- Assert the data the fixture should produce (values, counts, order), not just that a heading appeared
- Test error states on purpose with `failApi(page, 'weather')`, and odd responses with `respondWith(page, 'geocoding', {})`, before `page.goto()`
- For anything that depends on "now", call `freezeClock(page)` and add `test.use({ timezoneId: TIME_ZONE })`
- A new API: add its URL pattern to `API` and a fixture to `RESPONSES` in `api-mocks.ts`
- Helpers: `expectBackLink()`, `expectAttribution()`, `SLOW_TIMEOUT` for slow animations
- Add new pages to `NAV_ROUTES` in `navigation.spec.ts` and to `PAGES` in `accessibility.spec.ts`
- Do NOT test CSS animation names or computed styles
- Test structure, navigation and data rendering, not visual appearance; data shaping itself belongs in unit tests next to the module
