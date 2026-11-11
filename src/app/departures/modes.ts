import type { TranslationKey } from '../i18n/translations';
import type { Mode } from './digitransit';

/** The name of each kind of transport. */
export const MODE_KEYS: Record<Mode, TranslationKey> = {
  BUS: 'departures.mode.bus',
  TRAM: 'departures.mode.tram',
  SUBWAY: 'departures.mode.subway',
  RAIL: 'departures.mode.rail',
  FERRY: 'departures.mode.ferry',
  OTHER: 'departures.mode.other',
};

/** The pop fill each kind of transport wears, always under ink text. */
export const MODE_FILLS: Record<Mode, string> = {
  BUS: 'var(--color-pop-sky)',
  TRAM: 'var(--color-pop-lime)',
  SUBWAY: 'var(--color-pop-orange)',
  RAIL: 'var(--color-pop-pink)',
  FERRY: 'var(--color-pop-yellow)',
  OTHER: 'var(--color-bg-card)',
};

/** The small bordered label naming a mode, shared by the search results and the board. */
export const MODE_CHIP_STYLES = `
  .mode-chip {
    display: inline-block;
    padding: 0 0.375rem;
    border: 2px solid var(--color-ink);
    color: var(--color-ink);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1.4;
  }
`;

/** The bordered button used for recent stops, suggestions, refresh and retry. */
export const OPTION_CLASS =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-ink bg-bg-card border-2 border-ink shadow-brutal-sm brutal-hover brutal-press transition-transform cursor-pointer';
