---
description: "Tailwind CSS theme tokens and animation classes used in this project."
applyTo: "src/styles.css"
---

# Theme & Animation Reference

## Theme Tokens (defined in `@theme`)
- `--color-bg-primary`: #0a0a0f (page background)
- `--color-bg-card`: #12121a (card background)
- `--color-bg-card-hover`: #1a1a2e (card hover)
- `--color-text-primary`: #e2e8f0 (headings, body)
- `--color-text-secondary`: #94a3b8 (muted text)
- `--color-accent-primary`: #6366f1 (indigo accent)
- `--color-accent-secondary`: #8b5cf6 (purple accent)
- `--color-border`: rgba(255,255,255,0.06)

## Animation Utilities
- `.animate-gradient-shift` — hero background
- `.animate-float` — floating orbs
- `.animate-glow-pulse` — glow cards
- `.animate-cursor-blink` — typing effect cursor
- `.animate-breathing-border` — navbar link underline
- `.animate-fade-slide-up` — section entrance (pair with `.stagger-N`)
- `.stagger-1` through `.stagger-4` — animation delays

## Rules
- Keep all keyframes and utility classes in this file
- Remove unused animations/tokens when deleting components that used them
- Do NOT add `@keyframes` to component inline styles — keep them centralized
