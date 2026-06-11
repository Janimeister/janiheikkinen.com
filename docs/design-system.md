# Design System — "Paper & Ink" (Neo-Brutalist)

The canonical reference for the visual language of janiheikkinen.com. All UI work must follow this document. The single source of truth for token *values* is `src/styles.css` (`@theme` block) — this document explains how to use them. Update both together.

## 1. Principles

1. **Paper, not glass.** Cream background, flat fills, sharp edges. No gradients, no glows, no blur, no transparency tricks.
2. **Ink everywhere.** Every visible edge is a `2px solid` ink border. Every elevation is a hard offset shadow of pure ink — never blurred.
3. **Pop with purpose.** Five flat pop colors provide energy. They are *fills*, always carrying ink text/icons, never used as text colors on cream.
4. **Honest interaction.** Hover lifts the element up-left and grows the shadow; press pushes it down-right and removes the shadow. Motion is small, fast (~150ms), and respects `prefers-reduced-motion`.
5. **Accessible by default.** Everything passes WCAG AA. Text colors on cream are restricted to the approved set below.

## 2. Color Tokens

Defined in `src/styles.css` `@theme`. Use via Tailwind classes (`bg-bg-card`, `text-text-secondary`, `border-ink`, `bg-pop-yellow`, …).

### Surfaces
| Token | Value | Use |
|---|---|---|
| `--color-bg-primary` | `#f2efe5` | Page background (cream). Body also paints a faint 32px paper grid. |
| `--color-bg-card` | `#fdfbf3` | Card / input / button surfaces |
| `--color-bg-card-hover` | `#fff9e8` | Card hover surface |

### Ink & text
| Token | Value | Use |
|---|---|---|
| `--color-ink` / `--color-text-primary` / `--color-border` / `--color-accent-dark` | `#131310` | Body text, headings, all borders, all shadows, high-contrast button fills |
| `--color-text-secondary` | `#54554e` | Muted text (AA on cream and on card) |

### Accents (usable as text on cream)
| Token | Value | Use |
|---|---|---|
| `--color-accent-primary` | `#d6336c` | Raspberry — brand accent, chart lines, icons |
| `--color-accent-light` | `#a61e4d` | Darker raspberry — **the** link/text accent (AA on cream) |
| `--color-accent-secondary` | `#6741d9` | Violet — secondary chart lines / accents |
| `--color-red-400` (override) | `#c92a2a` | Error text. Always `<p class="text-red-400">` (e2e tests select this) |

### Pop fills (never as text color)
| Token | Value |
|---|---|
| `--color-pop-yellow` | `#ffd43b` |
| `--color-pop-pink` | `#ff90e8` |
| `--color-pop-lime` | `#a8e84a` |
| `--color-pop-sky` | `#74c0fc` |
| `--color-pop-orange` | `#ffa94d` |

Rule: a pop fill always pairs with ink text/icons and (when a standalone element) a 2px ink border.

### Semantic data colors (AA-safe on cream)
For "good / warn / bad" values (prices, temperatures, UV): `#287234` (green), `#a85100` (orange), `#9c4a00` (deep orange), `text-red-400` (red). Verified ≥4.5:1 on all three surfaces — check new shades with a contrast calculator before adding any.

## 3. Typography

| Role | Font | Token / class |
|---|---|---|
| Display (`h1`–`h3`, big stats) | Archivo Black | `--font-display` / `font-display` — applied to h1/h2/h3 globally |
| Body / UI | Space Grotesk | `--font-sans` (body default) |
| Code, labels, stickers, data | JetBrains Mono | `--font-mono` / `font-mono` |

Fonts are loaded from Google Fonts in `src/index.html`. Page `h1` headings wrap their text in a marker highlight (see §5).

## 4. Borders, Shadows, Radius

- **Border:** `border-2 border-ink` — the only border style. (Hairline grid/dividers inside charts may use `rgba(19,19,16,0.15)`.)
- **Radius:** none. Sharp corners only. Exception: avatars and deco circles may be `rounded-full`.
- **Shadows** (hard offset, no blur — also as `shadow-brutal*` classes):
  - `--shadow-brutal-sm`: `3px 3px 0 0 #131310` — small controls (buttons, stickers, toggles)
  - `--shadow-brutal`: `5px 5px 0 0 #131310` — cards, panels
  - `--shadow-brutal-lg`: `8px 8px 0 0 #131310` — hover-lifted state

## 5. Building Blocks (global classes in `src/styles.css`)

| Class | What it does |
|---|---|
| `.brutal-border` | `2px solid` ink border |
| `.brutal-shadow` / `.brutal-shadow-sm` | Hard shadow primitives |
| `.brutal-hover` | Hover: `translate(-2px,-2px)` + `shadow-brutal-lg` |
| `.brutal-press` | Active: `translate(2px,2px)` + shadow removed |
| `.marker` | Yellow marker-highlight stripe behind heading text. Variants: `.marker-pink`, `.marker-lime`, `.marker-sky`, `.marker-orange` |
| `.sticker` | Small rotated mono label: pop-yellow fill, ink border, small shadow |

### Page marker color assignments
home: yellow · weather: sky · electricity: orange · github: pink · ascii: lime · snake: lime · pet: orange · notices: yellow. New pages pick the pop color that fits their topic; reuse is fine.

## 6. Components

### Card — `GlowCardComponent` (`app-glow-card`)
`src/app/components/shared/glow-card.component.ts`. Card surface, 2px ink border, `shadow-brutal`, hover lift + `bg-card-hover`. Keeps the legacy `.glow-card` class name (unit + e2e tests rely on it). Use for every data section wrapper.

### Deco shape — `FloatingOrbComponent` (`app-floating-orb`)
Flat geometric decoration (square / circle / triangle) in a pop color, gentle `animate-bob`. Inputs: `delay`, `size`, `shape`, `color`, `rotate`. Position absolutely on the host; use 1–3 per page, `hidden md:block`, `aria-hidden`.

### Buttons
```html
<button class="px-4 py-2 text-sm font-bold border-2 border-ink bg-pop-lime text-ink
               shadow-[3px_3px_0_0_#131310]
               hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_0_#131310]
               active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
               transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
```
- Primary: pop fill + ink text. Strongest action may use `bg-ink text-bg-primary`.
- Selected/toggled state: switch to a distinct pop fill (e.g. `bg-pop-yellow`); inactive: `bg-bg-card`.

### Inputs
`bg-bg-card border-2 border-ink text-text-primary px-4 py-2` + `placeholder:text-text-secondary`. Focus is handled globally by `:focus-visible` (3px ink outline) — do not add custom focus borders.

### Navbar / footer
Navbar: cream, gains a 2px ink bottom border when scrolled; logo is a yellow sticker block; links get pop-yellow hover fill, active link gets pop-pink fill + ink border + small shadow. Footer: card surface, 2px ink top border, mono text.

## 7. Motion

| Class | Purpose |
|---|---|
| `animate-fade-slide-up` + `stagger-1..4` | Section entrance on every page |
| `animate-cursor-blink` | Typing cursor |
| `animate-bob` | Deco shape float (honors `--bob-rotate`) |
| `animate-wiggle` | Slow rotation wiggle |
| `animate-pulse` (Tailwind) | Loading shimmers — always with `bg-ink/10` |

Rules: transitions ≈150ms ease; transform/shadow only (no color-flash animations); all keyframes live in `src/styles.css`; everything is disabled under `prefers-reduced-motion` globally.

### Canvas content
Game/art canvases use design-system colors in their draw code (e.g. Snake board `#fdfbf3`, grid `rgba(19,19,16,0.08)`, snake ink, food raspberry). When adding canvas features, pick colors from §2.

## 8. Accessibility checklist

- AXE/WCAG AA enforced by `e2e/accessibility.spec.ts` — run `npx playwright test e2e/accessibility.spec.ts`.
- Text on cream: only ink, `text-secondary`, `accent-light`, the semantic data colors, or `text-red-400`.
- Pop fills: ink text only. `bg-ink`: cream text only.
- Never remove the global `:focus-visible` outline; interactive targets ≥ 2.75rem where practical; deco elements `aria-hidden="true"`.

## 9. Adding a new page — recipe

1. Lazy route in `app.routes.ts`; nav link + i18n keys (`nav.*`, page titles) in `src/app/i18n/translations.ts` (EN + FI).
2. Header: "Back to Home" link (`routerLink="/"`), `h1` with `<span class="marker marker-{color}">`, subtitle in `text-text-secondary`.
3. Sections in `app-glow-card`, entrance via `animate-fade-slide-up stagger-N`, `h2` headings.
4. Data with `resource()`; `animate-pulse bg-ink/10` shimmers while loading; `<p class="text-red-400">` + i18n message on error; attribution link if the API requires it.
5. Optional: 1–3 `app-floating-orb` decos, a `.sticker` label.
6. Add e2e coverage in `e2e/app.spec.ts` (heading, back link, sections via `expectSectionOrError`).

## 10. Changing the system

- Token values: edit `src/styles.css` `@theme`, then update §2 here and `.github/instructions/tailwind-theme.instructions.md`.
- New global utility/animation: add to `src/styles.css`, document in §5/§7.
- Never inline `@keyframes` or one-off hex colors in components (canvas draw code excepted — but source its palette from §2).
