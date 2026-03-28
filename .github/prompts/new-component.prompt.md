---
description: "Create a new Angular standalone component. Use when building UI components, cards, or shared elements for the site."
agent: "agent"
argument-hint: "Describe the component purpose and where it will be used"
---

Create a new Angular standalone component following project conventions.

## Component Template

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-{name}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: ``,
  styles: ``
})
export class {Name}Component {}
```

## Rules

- Do NOT set `standalone: true` — it's the default in Angular 21
- Use `ChangeDetectionStrategy.OnPush` always
- Use inline `template` and `styles` (no external files)
- Use `signal()` for local state, `computed()` for derived state
- Use `input()` / `output()` instead of `@Input()` / `@Output()` decorators
- Use `resource()` for async data fetching, not HttpClient
- Use `@if` / `@for` / `@switch` control flow, not structural directives
- Use Tailwind CSS classes matching the dark theme (bg-bg-card, text-text-primary, etc.)
- For cards with glow effect, import and wrap content with `GlowCardComponent`
- Place shared components in `src/app/components/shared/`
- Place page-specific components alongside their page in `src/app/pages/` or `src/app/components/{feature}/`
