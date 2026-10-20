import { createBride } from './archetypes/bride.ts';
import { createHunchback } from './archetypes/hunchback.ts';
import { createLakeCreature } from './archetypes/lakeling.ts';
import { createPhantom } from './archetypes/phantom.ts';
import { createCwnAnnwn, createGwrach, createGwyllgi } from './archetypes/welsh.ts';
import { createFledgling, job } from './fledgling.ts';
import { makeNeeds } from './needs.ts';
import type { Archetype, Monster } from './types.ts';

export { createFledgling, job };

export function createCount(): Monster {
  return {
    id: 'count',
    archetype: 'count',
    name: 'The Count',
    bedroom: 'crypt',
    bed: 'coffin',
    needs: makeNeeds({ hygiene: 100 }),
    // No energy decay at dawn: daylight is what drains him. Hygiene never moves.
    decay: { hunger: 15, energy: 0, social: 10, fun: 8, hygiene: 0, comfort: 5, bladder: 10 },
    quirks: ['nocturnalFeeder', 'daylightDrain', 'noReflection', 'charm'],
    coverJob: job('night watchman', 8, 0.2),
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
    memo: {},
  };
}

export function createWolfMan(): Monster {
  return {
    id: 'wolfman',
    archetype: 'wolfman',
    name: 'The Wolf Man',
    bedroom: 'attic',
    bed: 'cot',
    needs: makeNeeds(),
    decay: { hunger: 15, energy: 10, social: 10, fun: 8, hygiene: 10, comfort: 5, bladder: 15 },
    quirks: ['fullMoon', 'dayWalker'],
    coverJob: job('carter', 8, 0.2),
    daylightActive: true,
    assignedAction: null,
    assignedDayAction: null,
    memo: {},
  };
}

export function createGolem(): Monster {
  return {
    id: 'golem',
    archetype: 'golem',
    name: 'The Golem',
    bedroom: 'workshop',
    bed: 'slab',
    needs: makeNeeds({ social: 20, bladder: 100 }),
    // Clay is patient: slow hunger, slow energy, no bladder.
    decay: { hunger: 5, energy: 5, social: 5, fun: 8, hygiene: 5, comfort: 5, bladder: 0 },
    quirks: ['villagersFlee', 'lightningPowered', 'heavyHanded'],
    coverJob: job('gravedigger', 8, 0.15),
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
    memo: {},
  };
}

export function createMummy(): Monster {
  return {
    id: 'mummy',
    archetype: 'mummy',
    name: 'The Mummy',
    bedroom: 'crypt',
    bed: 'sarcophagus',
    needs: makeNeeds({ energy: 100, bladder: 100, hygiene: 40 }),
    // Energy and bladder never move. Comfort goes as the bandages do.
    decay: { hunger: 5, energy: 0, social: 5, fun: 8, hygiene: 5, comfort: 12, bladder: 0 },
    quirks: ['undying', 'unravelling', 'slowMoving', 'hoarder'],
    coverJob: job('museum night porter', 8, 0.2),
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
    memo: { busyNights: 0 },
  };
}
export function createInvisibleMan(): Monster {
  return {
    id: 'invisible',
    archetype: 'invisible',
    name: 'The Invisible Man',
    bedroom: 'parlour',
    bed: 'armchair',
    needs: makeNeeds({ social: 40 }),
    decay: { hunger: 15, energy: 10, social: 10, fun: 10, hygiene: 15, comfort: 5, bladder: 15 },
    quirks: ['visibility', 'prankster', 'foodThief', 'lowProfile'],
    coverJob: job('census clerk', 8, 0.2),
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
    memo: { visible: false },
  };
}

export const DEFAULT_HOUSEHOLD: readonly Archetype[] = ['count', 'wolfman', 'golem'];

/** Archetypes a household can start with (a fledgling only ever arrives by being turned). */
export const PLAYABLE: readonly Archetype[] = [
  'count',
  'wolfman',
  'golem',
  'mummy',
  'invisible',
  'lakeling',
  'phantom',
  'bride',
  'hunchback',
  'gwyllgi',
  'cwnannwn',
  'gwrach',
];

/** The valley's own household: the Welsh folklore set. */
export const VALLEY_HOUSEHOLD: readonly Archetype[] = ['gwyllgi', 'cwnannwn', 'gwrach'];

export function createArchetype(a: Archetype): Monster {
  switch (a) {
    case 'count':
      return createCount();
    case 'wolfman':
      return createWolfMan();
    case 'golem':
      return createGolem();
    case 'mummy':
      return createMummy();
    case 'invisible':
      return createInvisibleMan();
    case 'lakeling':
      return createLakeCreature();
    case 'phantom':
      return createPhantom();
    case 'bride':
      return createBride();
    case 'hunchback':
      return createHunchback();
    case 'gwyllgi':
      return createGwyllgi();
    case 'cwnannwn':
      return createCwnAnnwn();
    case 'gwrach':
      return createGwrach();
    case 'fledgling':
      throw new Error('A fledgling joins by being turned, not at launch');
  }
}

/** The household at launch, in the order their actions resolve each night. */
export function createMonsters(household: readonly Archetype[] = DEFAULT_HOUSEHOLD): Monster[] {
  return household.map(createArchetype);
}
