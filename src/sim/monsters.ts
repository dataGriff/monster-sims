import { makeNeeds } from './needs.ts';
import type { Monster, Townie } from './types.ts';

export function createCount(): Monster {
  return {
    id: 'count',
    archetype: 'count',
    name: 'The Count',
    bedroom: 'crypt',
    needs: makeNeeds({ hygiene: 100 }),
    // No energy decay at dawn: daylight is what drains him. Hygiene never moves.
    decay: { hunger: 15, energy: 0, social: 10, fun: 8, hygiene: 0, comfort: 5, bladder: 10 },
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
    archetype: 'wolfman',
    name: 'The Wolf Man',
    bedroom: 'attic',
    needs: makeNeeds(),
    decay: { hunger: 15, energy: 10, social: 10, fun: 8, hygiene: 10, comfort: 5, bladder: 15 },
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
    archetype: 'golem',
    name: 'The Golem',
    bedroom: 'workshop',
    needs: makeNeeds({ social: 20, bladder: 100 }),
    // Clay is patient: slow hunger, slow energy, no bladder.
    decay: { hunger: 5, energy: 5, social: 5, fun: 8, hygiene: 5, comfort: 5, bladder: 0 },
    quirks: ['villagersFlee', 'lightningPowered', 'heavyHanded'],
    coverJob: { title: 'gravedigger', relief: 8, failChance: 0.15 },
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
  };
}

/** A villager the Count has turned. Sleeps in the crypt and keeps their old job, badly. */
export function createFledgling(townie: Townie): Monster {
  const job = townie.job.charAt(0).toUpperCase() + townie.job.slice(1);
  return {
    id: `turned-${townie.id}`,
    archetype: 'fledgling',
    name: `The ${job} (turned)`,
    bedroom: 'crypt',
    needs: makeNeeds({ hunger: 40, hygiene: 100, anger: 0 }),
    decay: { hunger: 20, energy: 0, social: 10, fun: 8, hygiene: 0, comfort: 5, bladder: 10 },
    quirks: ['nocturnalFeeder', 'daylightDrain', 'noReflection', 'fledgling'],
    coverJob: { title: `${townie.job}'s night work`, relief: 6, failChance: 0.3 },
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
  };
}

/** The household at launch, in the order their actions resolve each night. */
export function createMonsters(): Monster[] {
  return [createCount(), createWolfMan(), createGolem()];
}
