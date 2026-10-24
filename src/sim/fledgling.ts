import { makeNeeds } from './needs.ts';
import type { CoverJob, Monster, Townie } from './types.ts';

export function job(title: string, relief: number, failChance: number): CoverJob {
  return { title, relief, failChance, level: 1, streak: 0, heat: 0, employed: true };
}

/** A villager the Count has turned. Sleeps in the crypt and keeps their old job, badly. */
export function createFledgling(townie: Townie): Monster {
  const title = townie.job.charAt(0).toUpperCase() + townie.job.slice(1);
  return {
    id: `turned-${townie.id}`,
    archetype: 'fledgling',
    name: `The ${title} (turned)`,
    bedroom: 'crypt',
    bed: 'coffin',
    needs: makeNeeds({ hunger: 40, hygiene: 100, anger: 0 }),
    decay: { hunger: 20, energy: 0, social: 10, fun: 8, hygiene: 0, comfort: 5, bladder: 10 },
    quirks: ['nocturnalFeeder', 'daylightDrain', 'noReflection', 'fledgling'],
    coverJob: job(`${townie.job}'s night work`, 6, 0.3),
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
    memo: {},
  };
}
