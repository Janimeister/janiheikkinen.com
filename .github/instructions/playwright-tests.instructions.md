---
description: "Playwright test conventions — helper functions, API resilience, data-driven tests, no animation testing."
applyTo: "e2e/**/*.ts"
---

# Playwright Test Conventions

- Use existing helpers: `expectSectionOrError()`, `expectBackLink()`, `expectAttribution()`
- Add new pages to the `NAV_ROUTES` constant for automatic nav tests
- API tests must accept either success OR error states using `.or()` locator
- Use `{ timeout: 15_000 }` for API-dependent assertions
- Do NOT test CSS animation names or computed styles
- Group tests by page using `test.describe()`
- Test structure, navigation, and data loading — not visual appearance
