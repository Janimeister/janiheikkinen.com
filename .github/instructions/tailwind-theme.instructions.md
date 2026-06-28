---
description: "Tailwind CSS theme tokens and animation classes used in this project."
applyTo: "src/styles.css"
---

# Theme & Animation Reference (Neo-Brutalist)

## Theme Tokens (defined in `@theme`)
- `--color-bg-primary`: #f2efe5 (cream page background)
- `--color-bg-card`: #fdfbf3 (card background)
- `--color-bg-card-hover`: #fff9e8 (card hover)
- `--color-text-primary`: #131310 (ink — headings, body)
- `--color-text-secondary`: #54554e (muted text, AA on cream)
- `--color-accent-primary`: #d6336c (raspberry accent)
- `--color-accent-light`: #a61e4d (darker raspberry — AA text links on cream)
- `--color-accent-dark`: #131310 (ink — high-contrast button backgrounds)
- `--color-accent-secondary`: #6741d9 (violet accent)
- `--color-border`: #131310 (all borders are 2px solid ink)
- `--color-ink`: #131310
- Pop fills: `--color-pop-yellow` #ffd43b, `--color-pop-pink` #ff90e8, `--color-pop-lime` #a8e84a, `--color-pop-sky` #74c0fc, `--color-pop-orange` #ffa94d (always with ink text)
- `--color-red-400`: overridden to #c92a2a so `text-red-400` errors keep AA contrast on cream
- Semantic data colors (AA-safe on cream, card, card-hover): `--color-data-green` #287234 (`text-data-green`), `--color-data-orange` #a85100 (`text-data-orange`), `--color-data-orange-deep` #9c4a00 (`text-data-orange-deep`), `--color-data-blue` #1864ab (`text-data-blue`)
- Fonts: `--font-display` (Archivo Black), `--font-sans` (Space Grotesk), `--font-mono` (JetBrains Mono)
- Shadows: `--shadow-brutal-sm` (3px), `--shadow-brutal` (5px), `--shadow-brutal-lg` (8px) — hard offset, no blur

## Building Blocks
- `.brutal-border`, `.brutal-shadow`, `.brutal-shadow-sm` — border/shadow primitives
- `.brutal-hover` — lift on hover (translate -2px + bigger shadow)
- `.brutal-press` — press-down on :active
- `.marker` — yellow marker highlight behind heading text (`.marker-pink/-lime/-sky/-orange` variants)
- `.sticker` — small rotated mono label with border + shadow

## Animation Utilities
- `.animate-cursor-blink` — typing effect cursor
- `.animate-fade-slide-up` — section entrance (pair with `.stagger-N`)
- `.animate-bob` — gentle vertical bob for deco shapes (respects `--bob-rotate`)
- `.animate-wiggle` — slow rotation wiggle
- `.stagger-1` through `.stagger-4` — animation delays

## Rules
- NO gradients, NO glows, NO blur, NO rounded corners (sharp edges only)
- All visible borders are 2px solid ink; shadows are hard offsets of ink
- Pop color fills always carry ink (#131310) text for contrast
- Keep all keyframes and utility classes in this file
- Remove unused animations/tokens when deleting components that used them
- Do NOT add `@keyframes` to component inline styles — keep them centralized