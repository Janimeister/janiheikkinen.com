import type { TranslationKey } from '../i18n/translations';
import type { PresetId } from './grid';

export type GlyphMode = 'ascii' | 'unicode';

export const PRESET_OPTIONS: readonly { id: PresetId; labelKey: TranslationKey }[] = [
  { id: 'centre', labelKey: 'trams.presetCentre' },
  { id: 'network', labelKey: 'trams.presetNetwork' },
  { id: 'mobile', labelKey: 'trams.presetMobile' },
];

export const GLYPH_OPTIONS: readonly { id: GlyphMode; labelKey: TranslationKey }[] = [
  { id: 'ascii', labelKey: 'trams.glyphsAscii' },
  { id: 'unicode', labelKey: 'trams.glyphsUnicode' },
];

/** The view settings a visitor chose, remembered in this browser. */
export interface ViewPrefs {
  preset?: PresetId;
  glyphs?: GlyphMode;
  smooth?: boolean;
  trails?: boolean;
}

export const PREFS_KEY = 'trams-view';

/** Reads stored settings, keeping only the values this version understands. */
export function parseViewPrefs(raw: string | null | undefined): ViewPrefs {
  let stored: Partial<Record<keyof ViewPrefs, unknown>>;
  try {
    stored = JSON.parse(raw ?? '{}') ?? {};
  } catch {
    return {};
  }
  const prefs: ViewPrefs = {};
  if (PRESET_OPTIONS.some((o) => o.id === stored.preset)) prefs.preset = stored.preset as PresetId;
  if (GLYPH_OPTIONS.some((o) => o.id === stored.glyphs)) prefs.glyphs = stored.glyphs as GlyphMode;
  if (typeof stored.smooth === 'boolean') prefs.smooth = stored.smooth;
  if (typeof stored.trails === 'boolean') prefs.trails = stored.trails;
  return prefs;
}
