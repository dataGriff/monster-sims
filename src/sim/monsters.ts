import { makeNeeds } from './needs.ts';
import type { Monster } from './types.ts';

export function createCount(): Monster {
  return {
    id: 'count',
    name: 'The Count',
    needs: makeNeeds({ hygiene: 100 }),
    // No energy decay at dawn: daylight is what drains him. Hygiene never moves.
    decay: { hunger: 15, energy: 0, social: 10, fun: 10, hygiene: 0, comfort: 5, bladder: 10 },
    quirks: ['nocturnalFeeder', 'daylightDrain', 'noReflection', 'charm'],
    coverJob: { title: 'night watchman', relief: 8, failChance: 0.2 },
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
  };
}

export function createWolfMan(): Monster {
  return {
    id: 'wolfman',
    name: 'The Wolf Man',
    needs: makeNeeds(),
    decay: { hunger: 15, energy: 10, social: 10, fun: 10, hygiene: 10, comfort: 5, bladder: 15 },
    quirks: ['fullMoon', 'dayWalker'],
    coverJob: { title: 'carter', relief: 8, failChance: 0.2 },
    daylightActive: true,
    assignedAction: null,
    assignedDayAction: null,
  };
}

export function createGolem(): Monster {
  return {
    id: 'golem',
    name: 'The Golem',
    needs: makeNeeds({ social: 20, bladder: 100 }),
    // Clay is patient: slow hunger, slow energy, no bladder.
    decay: { hunger: 5, energy: 5, social: 5, fun: 10, hygiene: 5, comfort: 5, bladder: 0 },
    quirks: ['villagersFlee', 'lightningPowered', 'heavyHanded'],
    coverJob: { title: 'gravedigger', relief: 8, failChance: 0.15 },
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
  };
}

/** The household at launch, in the order their actions resolve each night. */
export function createMonsters(): Monster[] {
  return [createCount(), createWolfMan(), createGolem()];
}
