/**
 * The virtual pet's rules, kept free of Angular so they can be tested on their own: how stats
 * decay over time, what each action does, how the pet grows up and feels, and how a saved pet is
 * restored. Every function takes the time as an argument and returns a new state.
 */
import type { TranslationKey } from '../i18n/translations';

export type LifeStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'ghost';

export interface Species {
  readonly id: string;
  readonly nameKey: TranslationKey;
  /** Emoji per life stage. Egg is shared across species (🥚). */
  readonly sprites: Readonly<Record<Exclude<LifeStage, 'egg' | 'ghost'>, string>>;
  readonly accent: string; // Tailwind text color class
  readonly traitKey: TranslationKey; // short personality description
}

export interface PetState {
  speciesId: string;
  name: string;
  bornAt: number; // ms epoch when hatched
  lastTick: number; // ms epoch of last stat update
  hunger: number; // 0..100 (0 = starving, 100 = full)
  happiness: number; // 0..100
  energy: number; // 0..100
  cleanliness: number; // 0..100
  health: number; // 0..100
  dead: boolean;
  asleep: boolean;
}

export const SPECIES: readonly Species[] = [
  {
    id: 'cat',
    nameKey: 'pet.species.cat.name',
    sprites: { baby: '🐱', child: '🐈', teen: '🐈', adult: '🐈‍⬛' },
    accent: 'text-accent-light',
    traitKey: 'pet.species.cat.trait',
  },
  {
    id: 'dog',
    nameKey: 'pet.species.dog.name',
    sprites: { baby: '🐶', child: '🐕', teen: '🐕', adult: '🐕‍🦺' },
    accent: 'text-accent-light',
    traitKey: 'pet.species.dog.trait',
  },
  {
    id: 'dragon',
    nameKey: 'pet.species.dragon.name',
    sprites: { baby: '🦎', child: '🐲', teen: '🐉', adult: '🐲' },
    accent: 'text-ink',
    traitKey: 'pet.species.dragon.trait',
  },
  {
    id: 'alien',
    nameKey: 'pet.species.alien.name',
    sprites: { baby: '👾', child: '👽', teen: '🛸', adult: '👽' },
    accent: 'text-accent-secondary',
    traitKey: 'pet.species.alien.trait',
  },
  {
    id: 'fox',
    nameKey: 'pet.species.fox.name',
    sprites: { baby: '🦊', child: '🦊', teen: '🦊', adult: '🦊' },
    accent: 'text-accent-light',
    traitKey: 'pet.species.fox.trait',
  },
  {
    id: 'bunny',
    nameKey: 'pet.species.bunny.name',
    sprites: { baby: '🐰', child: '🐇', teen: '🐇', adult: '🐇' },
    accent: 'text-accent-secondary',
    traitKey: 'pet.species.bunny.trait',
  },
  {
    id: 'chick',
    nameKey: 'pet.species.chick.name',
    sprites: { baby: '🐥', child: '🐤', teen: '🐔', adult: '🦅' },
    accent: 'text-ink',
    traitKey: 'pet.species.chick.trait',
  },
  {
    id: 'axolotl',
    nameKey: 'pet.species.axolotl.name',
    sprites: { baby: '🐣', child: '🐸', teen: '🐲', adult: '🐊' },
    accent: 'text-accent-secondary',
    traitKey: 'pet.species.axolotl.trait',
  },
];

export const STORAGE_KEY = 'virtual-pet-v1';
export const TICK_MS = 1000; // update cadence
export const DECAY_PER_MINUTE = 4; // stat point loss per minute (approx, per stat)
export const MAX_OFFLINE_MINUTES = 60 * 8; // cap offline decay at 8 hours so returning users aren't wiped

export type Stat = 'hunger' | 'happiness' | 'energy' | 'cleanliness' | 'health';
export type Action = 'feed' | 'play' | 'clean' | 'heal';

export function clamp(value: number, min = 0, max = 100): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function speciesById(id: string): Species {
  return SPECIES.find((s) => s.id === id) ?? SPECIES[0];
}

/** A freshly hatched pet. Names are trimmed to 16 characters. */
export function newPet(name: string, speciesId: string, now: number): PetState {
  return {
    speciesId,
    name: name.trim().slice(0, 16),
    bornAt: now,
    lastTick: now,
    hunger: 80,
    happiness: 80,
    energy: 80,
    cleanliness: 90,
    health: 100,
    dead: false,
    asleep: false,
  };
}

/** Baby for 2 minutes, child until 10, teen until 30, then adult. */
export function lifeStage(pet: PetState | null, now: number): LifeStage {
  if (!pet) return 'egg';
  if (pet.dead) return 'ghost';
  const ageMin = Math.max(0, (now - pet.bornAt) / 60_000);
  if (ageMin < 2) return 'baby';
  if (ageMin < 10) return 'child';
  if (ageMin < 30) return 'teen';
  return 'adult';
}

/** The pet's age as a translation: seconds, minutes, then hours and minutes. */
export function ageLabel(
  bornAt: number,
  now: number,
): { key: TranslationKey; params: Record<string, number> } {
  const seconds = Math.max(0, Math.floor((now - bornAt) / 1000));
  if (seconds < 60) return { key: 'pet.ageSeconds', params: { count: seconds } };
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return { key: 'pet.ageMinutes', params: { count: minutes } };
  return {
    key: 'pet.ageHours',
    params: { hours: Math.floor(minutes / 60), minutes: minutes % 60 },
  };
}

/** What the pet says about itself; the most urgent need wins. */
export function moodKey(pet: PetState): TranslationKey {
  if (pet.dead) return 'pet.moodDead';
  if (pet.asleep) return 'pet.moodSleeping';
  if (pet.health < 25) return 'pet.moodSick';
  if (pet.hunger < 20) return 'pet.moodStarving';
  if (pet.cleanliness < 20) return 'pet.moodDirty';
  if (pet.energy < 20) return 'pet.moodExhausted';
  if (pet.happiness < 20) return 'pet.moodLonely';
  if (pet.hunger > 80 && pet.happiness > 70 && pet.cleanliness > 70) return 'pet.moodThriving';
  return 'pet.moodOkay';
}

/** Whether a living pet has a stat low enough to warn about, asleep or not. */
export function needsCare(pet: PetState): boolean {
  if (pet.dead) return false;
  return (
    pet.health < 25 ||
    pet.hunger < 20 ||
    pet.cleanliness < 20 ||
    pet.energy < 20 ||
    pet.happiness < 20
  );
}

const ACTION_EVENTS: Record<Action, TranslationKey> = {
  feed: 'pet.feedEvent',
  play: 'pet.playEvent',
  clean: 'pet.cleanEvent',
  heal: 'pet.healEvent',
};

/**
 * The pet after an action and the event to log, or null when the action does nothing: the pet is
 * dead, asleep (for play), or already fully healthy (for heal).
 */
export function applyAction(
  pet: PetState,
  action: Action,
): { pet: PetState; eventKey: TranslationKey } | null {
  if (pet.dead) return null;
  const next: PetState = { ...pet };
  switch (action) {
    case 'feed':
      next.hunger = clamp(next.hunger + 25);
      next.happiness = clamp(next.happiness + 3);
      next.cleanliness = clamp(next.cleanliness - 4);
      break;
    case 'play':
      if (next.asleep) return null;
      next.happiness = clamp(next.happiness + 20);
      next.energy = clamp(next.energy - 12);
      next.hunger = clamp(next.hunger - 5);
      break;
    case 'clean':
      next.cleanliness = clamp(next.cleanliness + 30);
      next.happiness = clamp(next.happiness - 2);
      break;
    case 'heal':
      if (next.health >= 100) return null;
      next.health = clamp(next.health + 30);
      next.happiness = clamp(next.happiness - 3);
      break;
  }
  return { pet: next, eventKey: ACTION_EVENTS[action] };
}

export type TickResult =
  /** Under half a second since the last update: nothing to do yet. */
  | { kind: 'wait' }
  /** The clock went backwards; the times are pulled back so decay doesn't freeze. */
  | { kind: 'clockReset'; pet: PetState }
  | { kind: 'tick'; pet: PetState; died: boolean };

/**
 * Stats decay with the time since the last update, capped at 8 hours so a returning visitor's pet
 * isn't wiped out. Sleep restores energy and halves the loss of happiness. Stats at zero hurt
 * health; well-kept stats slowly heal it.
 */
export function decay(pet: PetState, now: number): TickResult {
  if (now < pet.lastTick) {
    return {
      kind: 'clockReset',
      pet: { ...pet, lastTick: now, bornAt: Math.min(pet.bornAt, now) },
    };
  }
  const elapsedMs = now - pet.lastTick;
  if (elapsedMs < 500) return { kind: 'wait' };

  const minutes = Math.min(elapsedMs / 60_000, MAX_OFFLINE_MINUTES);
  const loss = minutes * DECAY_PER_MINUTE;
  const energyDelta = pet.asleep ? minutes * DECAY_PER_MINUTE * 2 : -loss;

  const next: PetState = {
    ...pet,
    lastTick: now,
    hunger: clamp(pet.hunger - loss),
    happiness: clamp(pet.happiness - loss * (pet.asleep ? 0.5 : 1)),
    energy: clamp(pet.energy + energyDelta),
    cleanliness: clamp(pet.cleanliness - loss * 0.6),
  };

  const critical = [next.hunger, next.cleanliness, next.happiness].filter((v) => v <= 0).length;
  if (critical > 0) {
    next.health = clamp(next.health - critical * loss * 0.5);
  } else if (next.hunger > 60 && next.cleanliness > 60 && next.happiness > 60 && next.energy > 40) {
    next.health = clamp(next.health + minutes);
  }

  if (next.health <= 0) {
    return { kind: 'tick', pet: { ...next, health: 0, dead: true }, died: true };
  }
  return { kind: 'tick', pet: next, died: false };
}

/** Small surprises while the pet is awake, each with its log message. */
export const RANDOM_EVENTS: readonly {
  messageKey: TranslationKey;
  apply: (pet: PetState) => PetState;
}[] = [
  { messageKey: 'pet.randomSnack', apply: (p) => ({ ...p, hunger: clamp(p.hunger + 10) }) },
  { messageKey: 'pet.randomDream', apply: (p) => ({ ...p, happiness: clamp(p.happiness + 8) }) },
  {
    messageKey: 'pet.randomMud',
    apply: (p) => ({ ...p, cleanliness: clamp(p.cleanliness - 12) }),
  },
  { messageKey: 'pet.randomEnergy', apply: (p) => ({ ...p, energy: clamp(p.energy + 15) }) },
  {
    messageKey: 'pet.randomHiccups',
    apply: (p) => ({ ...p, happiness: clamp(p.happiness - 4) }),
  },
  {
    messageKey: 'pet.randomFriend',
    apply: (p) => ({ ...p, happiness: clamp(p.happiness + 12) }),
  },
  { messageKey: 'pet.randomSneeze', apply: (p) => ({ ...p, health: clamp(p.health - 3) }) },
  { messageKey: 'pet.randomTrick', apply: (p) => ({ ...p, happiness: clamp(p.happiness + 6) }) },
];

/** A random event's chance per tick (about one every two minutes). */
export const RANDOM_EVENT_CHANCE = 0.008;

/**
 * A saved pet from storage, cleaned up: stats clamped, missing numbers defaulted, times no later
 * than `now`. Null for anything that isn't a pet of a known species.
 */
export function restorePet(raw: string | null, now: number): PetState | null {
  if (!raw) return null;
  let parsed: Partial<PetState>;
  try {
    parsed = JSON.parse(raw) as Partial<PetState>;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (!parsed.speciesId || !SPECIES.some((s) => s.id === parsed.speciesId)) return null;

  const persistedBornAt = asNumber(parsed.bornAt, now);
  const lastTick = Math.min(asNumber(parsed.lastTick, now), now);
  return {
    speciesId: parsed.speciesId,
    name:
      typeof parsed.name === 'string' && parsed.name.trim()
        ? parsed.name.trim().slice(0, 16)
        : 'Pet',
    bornAt: Math.min(persistedBornAt, lastTick),
    lastTick,
    hunger: clamp(asNumber(parsed.hunger, 80)),
    happiness: clamp(asNumber(parsed.happiness, 80)),
    energy: clamp(asNumber(parsed.energy, 80)),
    cleanliness: clamp(asNumber(parsed.cleanliness, 80)),
    health: clamp(asNumber(parsed.health, 100)),
    dead: !!parsed.dead,
    asleep: !!parsed.asleep,
  };
}
