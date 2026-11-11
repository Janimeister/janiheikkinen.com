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
For "good / warn / bad" values (prices, temperatures, UV) — use the token-backed Tailwind utilities:

| Token | Value | Class | Use |
|---|---|---|---|
| `--color-data-green` | `#287234` | `text-data-green` | Good / low / cheap |
| `--color-data-orange` | `#a85100` | `text-data-orange` | Moderate / mild warning |
| `--color-data-orange-deep` | `#9c4a00` | `text-data-orange-deep` | High / hot / strong warning |
| `--color-red-400` (override) | `#c92a2a` | `text-red-400` | Bad / max / error |
| `--color-data-blue` | `#1864ab` | `text-data-blue` | Cold / precipitation |

All verified ≥4.5:1 on cream, card, and card-hover surfaces. Check new shades with a contrast calculator before adding any.

## 3. Typography

| Role | Font | Token / class |
|---|---|---|
| Display (`h1`–`h3`, big stats) | Archivo Black | `--font-display` / `font-display` — applied to h1/h2/h3 globally |
| Body / UI | Space Grotesk | `--font-sans` (body default) |
| Code, labels, stickers, data | JetBrains Mono | `--font-mono` / `font-mono` |

Fonts are self-hosted from the [Fontsource](https://fontsource.org) packages listed in the `styles` of `angular.json`, so no font request leaves the site. Page `h1` headings wrap their text in a marker highlight (see §5).

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
home: yellow · weather: sky · electricity: orange · trams: lime · departures: pink · github: pink · ascii: lime · snake: lime · pet: orange · sorting: sky · searching: pink · pathfinding: lime · notices: yellow. A page sets its color with the `marker` input of `app-page-header` (§6). New pages pick the pop color that fits their topic; reuse is fine.

## 6. Components

### Page header — `PageHeaderComponent` (`app-page-header`)
`src/app/components/shared/page-header.component.ts`. The top of every detail page: the "Back to Home" button (a link to the home page in the current language), the `h1` on its marker stripe and an optional subtitle. Inputs: `titleKey`, `subtitleKey`, `marker` (`yellow` · `pink` · `lime` · `sky` · `orange`). Anything placed inside it follows the subtitle: the weather page's location search, the visualizers' section nav. Don't hand-roll a page header.

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
Navbar: compact cream header with a yellow sticker logo, current-page label, language toggle and yellow Explore button; gains a 2px ink bottom border when scrolled. Explore opens a native modal dialog with an ink-tinted backdrop, cream surface, grouped page cards and search. On mobile the dialog fills the screen. Cards get pop-yellow hover fills and the current page gets a pop-pink fill. The homepage shares the same cards. Footer: card surface, 2px ink top border, mono text.

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

1. Add an entry in `src/app/navigation/page-registry.ts` with the lazy component loader, path, category, title, description and search keyword translation keys. `app.routes.ts` (English at the root, Finnish under `/fi`), Explore, the homepage directory, the prerendered HTML files and the sitemap all follow this registry. Footer-only utility routes stay in `app.routes.ts`.
2. Copy: the page's heading, launcher and meta description keys go in `src/app/i18n/translations.ts` and `translations.fi.ts` (they ship with the app). Everything else the page says goes in `src/app/i18n/pages/{name}.en.ts` and `{name}.fi.ts`; register the Finnish loader in `src/app/i18n/pages/index.ts` and call `registerTranslations('en', {NAME}_EN)` at the top of the page component.
3. Header: `<app-page-header titleKey="{name}.title" subtitleKey="{name}.subtitle" marker="{color}" />`. Link to other pages with `[routerLink]="i18n.path('/somewhere')"`, never a bare `routerLink="/somewhere"`, so Finnish visitors stay in Finnish.
4. Sections in `app-glow-card`, entrance via `animate-fade-slide-up stagger-N`, `h2` headings.
5. Data with `httpResource()`, requested only in the browser (`injectIsBrowser()` from `src/app/platform.ts`) so the build never calls an API; `animate-pulse bg-ink/10` shimmers while `isWaiting(resource)`; `<p class="text-red-400">` + i18n message on error; attribution link if the API requires it. Read `localStorage` in `afterNextRender`, not while the page is being prerendered.
6. Optional: 1–3 `app-floating-orb` decos, a `.sticker` label.
7. Add e2e coverage in `e2e/{name}.spec.ts` (heading, back link, the data a fixture renders, the error card via `failApi()`), and add the route to `NAV_ROUTES` in `e2e/navigation.spec.ts` and to `PAGES` in `e2e/accessibility.spec.ts` and `e2e/prerender.spec.ts`.

## 10. Changing the system

- Token values: edit `src/styles.css` `@theme`, then update §2 here and `.github/instructions/tailwind-theme.instructions.md`.
- New global utility/animation: add to `src/styles.css`, document in §5/§7.
- Never inline `@keyframes` or one-off hex colors in components (canvas draw code excepted — but source its palette from §2).
