---
description: "Angular page component conventions — data fetching with resource(), brutal cards, loading/error states, staggered animations, back links."
applyTo: "src/app/pages/**/*.ts"
---

# Page Component Conventions

- Fetch data with `resource()`, not HttpClient
- Import `GlowCardComponent` (renders a `.glow-card` — now a brutalist bordered card) for data section wrappers
- Import `RouterLink` for navigation links
- Include a "Back to Home" link with `routerLink="/"`
- Show `animate-pulse` shimmer divs during loading (use `bg-ink/10`)
- Show `.text-red-400` error messages on API failure (token overridden to a dark red for AA contrast)
- Wrap sections in `animate-fade-slide-up stagger-N` for entrance animations
- Include API attribution links where required
- Style: 2px ink borders, hard offset shadows, pop color fills with ink text, no gradients/glows/rounded corners