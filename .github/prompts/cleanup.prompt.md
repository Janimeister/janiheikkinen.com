---
description: "Audit and clean up the codebase. Use when removing dead code, unused files, stale CSS, or orphaned components after refactoring."
agent: "agent"
argument-hint: "Scope: full audit or specific area"
---

Perform a comprehensive cleanup audit of the codebase.

## Audit Checklist

### 1. Dead Files
- Search for component files that are NOT imported by any active code
- Check for stale template files (`.html`, `.css`) not referenced by any component
- Look for orphaned test files referencing deleted components

### 2. Dead CSS (in `src/styles.css`)
- Find `@keyframes` rules not referenced by any utility class
- Find utility classes (`.animate-*`, `.stagger-*`) not used in any `.ts` template
- Find `@theme` tokens (`--color-*`) defined but never referenced in component styles or templates

### 3. Dead Imports
- Check for TypeScript imports that reference deleted or unused modules

### 4. Execution
- Delete dead files (confirm with user before bulk deletes)
- Remove dead CSS rules and unused theme tokens
- Verify no duplicate CSS blocks exist

### 5. Validation
- Run `npx ng build` — must pass with no errors
- Run `npx playwright test` — all tests must pass
- Compare bundle size before/after to confirm reduction

## Important
- Do NOT remove files that are imported transitively
- Check `glow-card.component.ts` and other shared components — they may be used by multiple pages
- Search with grep across all `src/**/*.ts` files, not just direct imports
