---
description: "Angular page component conventions — data fetching with resource(), glow cards, loading/error states, staggered animations, back links."
applyTo: "src/app/pages/**/*.ts"
---

# Page Component Conventions

- Fetch data with `resource()`, not HttpClient
- Import `GlowCardComponent` for data section wrappers
- Import `RouterLink` for navigation links
- Include a "Back to Home" link with `routerLink="/"`
- Show `animate-pulse` shimmer divs during loading
- Show `.text-red-400` error messages on API failure
- Wrap sections in `animate-fade-slide-up stagger-N` for entrance animations
- Include API attribution links where required
