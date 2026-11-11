import { lineClass } from '../ascii-raster';
import { lineOf, type TramState } from '../hfp';

// Styles and class names shared by the parts of /trams. Component styles are scoped, so each
// part that draws a line colour, a map glyph or the map's frame lists what it needs.

/** A line's fill: `line-4` paints the background and sets `--line` for a tram's text. */
export const TRAM_LINE_STYLES = `
  .line-1 {
    --line: var(--color-line-1);
    background: var(--line);
  }
  .line-2 {
    --line: var(--color-line-2);
    background: var(--line);
  }
  .line-3 {
    --line: var(--color-line-3);
    background: var(--line);
  }
  .line-4 {
    --line: var(--color-line-4);
    background: var(--line);
  }
  .line-5 {
    --line: var(--color-line-5);
    background: var(--line);
  }
  .line-6 {
    --line: var(--color-line-6);
    background: var(--line);
  }
  .line-7 {
    --line: var(--color-line-7);
    background: var(--line);
  }
  .line-8 {
    --line: var(--color-line-8);
    background: var(--line);
  }
  .line-9 {
    --line: var(--color-line-9);
    background: var(--line);
  }
  .line-10 {
    --line: var(--color-line-10);
    background: var(--line);
  }
  .line-11 {
    --line: var(--color-line-11);
    background: var(--line);
  }
  .line-12 {
    --line: var(--color-line-12);
    background: var(--line);
  }
  .line-13 {
    --line: var(--color-line-13);
    background: var(--line);
  }
  .line-h {
    --line: var(--color-line-h);
    background: var(--line);
  }
  .legend-chip {
    min-width: 2.25rem;
    padding: 0.125rem 0.5rem;
    text-align: center;
    font-weight: 700;
    border: 2px solid var(--color-ink);
    color: var(--color-ink);
  }
`;

/** How each kind of map character is drawn, on the map and in the legend. */
export const TRAM_GLYPH_STYLES = `
  .sea {
    color: var(--color-data-blue);
  }
  .park {
    color: var(--color-data-green);
  }
  .stop,
  .label,
  .line-shared {
    font-weight: 700;
  }
  /* Ink with the line colour as text, so a tram stands out on its own coloured track. */
  .tram {
    background: var(--color-ink);
    color: var(--line, var(--color-bg-card));
    font-weight: 700;
  }
  .tram-dim {
    background: var(--color-text-secondary);
    color: var(--color-bg-card);
  }
  .tram-cluster {
    color: var(--color-pop-yellow);
  }
  /* The track in the line's colour (the line-* class), dotted where the tram just was. */
  .trail {
    color: var(--color-ink);
    font-weight: 700;
  }
`;

/** The framed block of monospace text the map is drawn in. */
export const TRAM_MAP_STYLES = `
  .tram-map {
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 14px;
    color: var(--color-ink);
    background: var(--color-bg-card);
    border: 2px solid var(--color-ink);
    padding: 12px;
    margin: 0;
    width: max-content;
    white-space: pre;
  }
`;

/** Padding plus border of the map `<pre>`, on each side. The characters start after it. */
export const PRE_INSET_PX = 12 + 2;

// Smaller on phones, so the controls leave room for the map.
export const TRAM_OPTION_CLASS =
  'px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-semibold text-ink border-2 border-ink shadow-brutal-sm brutal-hover brutal-press transition-transform';

/** The fill a tram's chip wears: its line's, or grey for a depot run. */
export function tramChipClass(tram: TramState): string {
  return tram.depotRun ? 'line-h' : lineClass(lineOf(tram.desi));
}
