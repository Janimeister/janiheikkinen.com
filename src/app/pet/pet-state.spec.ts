import { describe, expect, it } from 'vitest';
import {
  ageLabel,
  applyAction,
  clamp,
  decay,
  lifeStage,
  MAX_OFFLINE_MINUTES,
  moodKey,
  needsCare,
  newPet,
  RANDOM_EVENTS,
  restorePet,
  speciesById,
  SPECIES,
  type PetState,
} from './pet-state';

const T0 = Date.parse('2026-10-12T12:00:00Z');
const MIN = 60_000;

function pet(overrides: Partial<PetState> = {}): PetState {
  return { ...newPet('Mochi', 'cat', T0), ...overrides };
}

describe('newPet', () => {
  it('hatches with healthy stats and a trimmed name', () => {
    expect(newPet('  A very long pet name indeed  ', 'dog', T0)).toEqual({
      speciesId: 'dog',
      name: 'A very long pet ',
      bornAt: T0,
      lastTick: T0,
      hunger: 80,
      happiness: 80,
      energy: 80,
      cleanliness: 90,
      health: 100,
      dead: false,
      asleep: false,
    });
  });
});

describe('decay', () => {
  it('waits until half a second has passed', () => {
    expect(decay(pet(), T0 + 499)).toEqual({ kind: 'wait' });
  });

  it('loses 4 points a minute, cleanliness at 60 %', () => {
    const result = decay(pet(), T0 + 5 * MIN);
    expect(result).toMatchObject({ kind: 'tick', died: false });
    const next = (result as { pet: PetState }).pet;
    expect(next).toMatchObject({
      lastTick: T0 + 5 * MIN,
      hunger: 60,
      happiness: 60,
      energy: 60,
      cleanliness: 78,
      health: 100,
    });
  });

  it('restores energy and halves the loss of happiness while asleep', () => {
    const next = (decay(pet({ asleep: true }), T0 + 5 * MIN) as { pet: PetState }).pet;
    expect(next.energy).toBe(100);
    expect(next.happiness).toBe(70);
  });

  it('slowly heals a well-kept pet', () => {
    const next = (
      decay(pet({ health: 50, hunger: 100, happiness: 100, cleanliness: 100 }), T0 + 2 * MIN) as {
        pet: PetState;
      }
    ).pet;
    expect(next.health).toBe(52);
  });

  it('hurts health for each stat at zero and dies at zero health', () => {
    const neglected = pet({ hunger: 0, happiness: 0, cleanliness: 50, health: 10 });
    // One minute: two stats at zero cost 2 × 4 × 0.5 = 4 health.
    const next = (decay(neglected, T0 + MIN) as { pet: PetState }).pet;
    expect(next.health).toBe(6);

    const result = decay(neglected, T0 + 10 * MIN);
    expect(result).toMatchObject({ kind: 'tick', died: true, pet: { dead: true, health: 0 } });
  });

  it('caps time away at 8 hours', () => {
    const away = decay(pet({ asleep: true }), T0 + 3 * 24 * 60 * MIN) as { pet: PetState };
    const capped = decay(pet({ asleep: true }), T0 + MAX_OFFLINE_MINUTES * MIN) as {
      pet: PetState;
    };
    expect({ ...away.pet, lastTick: 0 }).toEqual({ ...capped.pet, lastTick: 0 });
  });

  it('pulls times back when the clock goes backwards', () => {
    expect(decay(pet(), T0 - MIN)).toEqual({
      kind: 'clockReset',
      pet: pet({ lastTick: T0 - MIN, bornAt: T0 - MIN }),
    });
  });
});

describe('applyAction', () => {
  it('feeds, plays, cleans and heals', () => {
    expect(applyAction(pet(), 'feed')).toEqual({
      pet: pet({ hunger: 100, happiness: 83, cleanliness: 86 }),
      eventKey: 'pet.feedEvent',
    });
    expect(applyAction(pet(), 'play')!.pet).toMatchObject({
      happiness: 100,
      energy: 68,
      hunger: 75,
    });
    expect(applyAction(pet({ cleanliness: 10 }), 'clean')!.pet).toMatchObject({
      cleanliness: 40,
      happiness: 78,
    });
    expect(applyAction(pet({ health: 50 }), 'heal')).toEqual({
      pet: pet({ health: 80, happiness: 77 }),
      eventKey: 'pet.healEvent',
    });
  });

  it('does nothing when it makes no sense', () => {
    expect(applyAction(pet({ asleep: true }), 'play')).toBeNull();
    expect(applyAction(pet(), 'heal')).toBeNull();
    expect(applyAction(pet({ dead: true }), 'feed')).toBeNull();
  });

  it('does not change the pet it was given', () => {
    const before = pet();
    applyAction(before, 'feed');
    expect(before).toEqual(pet());
  });
});

describe('mood and growth', () => {
  it('reports the most urgent need first', () => {
    expect(moodKey(pet({ dead: true }))).toBe('pet.moodDead');
    expect(moodKey(pet({ asleep: true, hunger: 0 }))).toBe('pet.moodSleeping');
    expect(moodKey(pet({ health: 20, hunger: 0 }))).toBe('pet.moodSick');
    expect(moodKey(pet({ hunger: 10, cleanliness: 10 }))).toBe('pet.moodStarving');
    expect(moodKey(pet({ cleanliness: 10, energy: 10 }))).toBe('pet.moodDirty');
    expect(moodKey(pet({ energy: 10 }))).toBe('pet.moodExhausted');
    expect(moodKey(pet({ happiness: 10 }))).toBe('pet.moodLonely');
    expect(moodKey(pet({ hunger: 90, happiness: 80, cleanliness: 80 }))).toBe('pet.moodThriving');
    expect(moodKey(pet())).toBe('pet.moodOkay');
  });

  it('warns about low stats even while asleep, but not for a ghost', () => {
    expect(needsCare(pet({ asleep: true, energy: 5 }))).toBe(true);
    expect(needsCare(pet())).toBe(false);
    expect(needsCare(pet({ dead: true, health: 0 }))).toBe(false);
  });

  it('grows up at 2, 10 and 30 minutes', () => {
    expect(lifeStage(null, T0)).toBe('egg');
    expect(lifeStage(pet({ dead: true }), T0)).toBe('ghost');
    expect([0, 2, 10, 30].map((m) => lifeStage(pet(), T0 + m * MIN - 1))).toEqual([
      'baby',
      'baby',
      'child',
      'teen',
    ]);
    expect(lifeStage(pet(), T0 + 30 * MIN)).toBe('adult');
  });

  it('tells its age in seconds, minutes, then hours and minutes', () => {
    expect(ageLabel(T0, T0 + 59_999)).toEqual({ key: 'pet.ageSeconds', params: { count: 59 } });
    expect(ageLabel(T0, T0 + 61 * MIN)).toEqual({
      key: 'pet.ageHours',
      params: { hours: 1, minutes: 1 },
    });
    expect(ageLabel(T0, T0 + 5 * MIN)).toEqual({ key: 'pet.ageMinutes', params: { count: 5 } });
    expect(ageLabel(T0, T0 - MIN)).toEqual({ key: 'pet.ageSeconds', params: { count: 0 } });
  });
});

describe('restorePet', () => {
  it('restores a saved pet', () => {
    const saved = pet({ hunger: 42 });
    expect(restorePet(JSON.stringify(saved), T0 + MIN)).toEqual(saved);
  });

  it('cleans up out-of-range and missing values', () => {
    const raw = JSON.stringify({
      speciesId: 'dog',
      name: '   ',
      bornAt: T0 + 10 * MIN,
      lastTick: T0 + 20 * MIN,
      hunger: 150,
      happiness: -5,
      energy: 'lots',
      health: null,
    });
    expect(restorePet(raw, T0)).toEqual({
      speciesId: 'dog',
      name: 'Pet',
      bornAt: T0,
      lastTick: T0,
      hunger: 100,
      happiness: 0,
      energy: 80,
      cleanliness: 80,
      health: 100,
      dead: false,
      asleep: false,
    });
  });

  it('ignores anything that is not a pet of a known species', () => {
    for (const raw of [null, '', 'not json', 'null', '5', '{}', '{"speciesId":"basilisk"}']) {
      expect(restorePet(raw, T0)).toBeNull();
    }
  });
});

describe('helpers', () => {
  it('clamps to 0–100 and treats NaN as 0', () => {
    expect([clamp(-1), clamp(50), clamp(101), clamp(NaN)]).toEqual([0, 50, 100, 0]);
  });

  it('falls back to the first species for an unknown id', () => {
    expect(speciesById('dog').id).toBe('dog');
    expect(speciesById('basilisk')).toBe(SPECIES[0]);
  });

  it('random events stay within bounds', () => {
    const extremes = [
      pet({ hunger: 100, happiness: 100, energy: 100 }),
      pet({ health: 1, cleanliness: 1 }),
    ];
    for (const start of extremes) {
      for (const event of RANDOM_EVENTS) {
        const next = event.apply(start);
        for (const value of [
          next.hunger,
          next.happiness,
          next.energy,
          next.cleanliness,
          next.health,
        ]) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});
