---
description: "Write or update Playwright e2e tests. Use when adding tests for new pages, updating tests after refactoring, or improving test coverage."
agent: "agent"
argument-hint: "What to test: new page, updated component, or full suite"
---

Write or update Playwright e2e tests in `e2e/app.spec.ts`.

## Conventions

### Test Structure
- Group tests by page/feature using `test.describe()`
- Use `test.beforeEach()` for common navigation
- Keep test names descriptive and concise

### Helper Functions
Use and extend these existing helpers defined at the top of the test file:

```typescript
// Assert section heading OR error fallback (for API-driven content)
async function expectSectionOrError(page: Page, headingText: string) { ... }

// Assert "Back to Home" link is present
async function expectBackLink(page: Page) { ... }

// Assert attribution link exists
async function expectAttribution(page: Page, href: string) { ... }
```

### Data-Driven Tests
- Use the `NAV_ROUTES` constant for navigation link tests
- Use the `SOCIAL_LINKS` constant for social link tests
- Add new entries to these arrays when adding new pages/links

### API-Dependent Tests
- Always accept EITHER success data OR error state — never assume APIs are available
- Use `.or()` to combine success and error locators
- Set generous timeouts for API calls: `{ timeout: 15_000 }`

### What to Test
- Navigation: links exist and navigate to correct routes
- Page structure: heading, back link, key sections visible
- Data loading: sections load or show graceful error
- Attribution: required attribution links are present
- Responsive: critical content visible on mobile viewports

### What NOT to Test
- CSS animation names or computed styles
- Exact API response content (it changes)
- Internal component implementation details

## After Writing Tests
Run `npx playwright test` to verify all tests pass.
