/**
 * The Lake Creature (MM-27). An original lake-dweller: must stay wet, keeps the
 * tub full, and the hall pays for it.
 */
import { addSuspicion, adjustNeed, emit } from '../context.ts';
import { job } from '../fledgling.ts';
import { makeNeeds } from '../needs.ts';
import { registerQuirk } from '../quirks.ts';
import { chance } from '../rng.ts';
import type { Monster } from '../types.ts';

export const DRY_AT = 20;
export const DRY_COMFORT = -15;
export const SOAK_HYGIENE = 100;
export const FLOOD_CHANCE = 0.5;
export const FLOOD_COMFORT = -5;
export const FLOOD_SUSPICION = 2;

registerQuirk({
  id: 'mustStayWet',
  description: 'Hygiene is wetness. It drops 20 a night; below 20 he dries out and loses comfort. A night in the tub soaks him back to 100.',
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'sleep') return;
    const tub = ctx.state.house.furniture.find((f) => f.id === monster.bed);
    if (tub && !tub.broken) {
      const hygiene = adjustNeed(ctx, monster, 'hygiene', SOAK_HYGIENE, 'sleep');
      outcome.text = `${monster.name} soaked all night in the ${tub.name} (wetness +${hygiene}).`;
      outcome.data['hygiene'] = hygiene;
    } else {
      outcome.text = `${monster.name} had no tub to lie in and slept damp and miserable on the flagstones.`;
    }
  },
  onDawn: (ctx, monster) => {
    if (monster.needs.hygiene >= DRY_AT) return;
    const comfort = adjustNeed(ctx, monster, 'comfort', DRY_COMFORT, 'quirk');
    emit(ctx, 'dryingOut', `${monster.name} is drying out; his skin has gone the colour of old paper (comfort ${comfort}).`, {
      monsterId: monster.id,
      data: { hygiene: monster.needs.hygiene, comfort },
    });
  },
});

registerQuirk({
  id: 'floodsHall',
  description: 'Half the nights he soaks, the tub goes over and water runs out under the front door.',
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'sleep' || outcome.data['hygiene'] === undefined) return;
    if (!chance(ctx.state.rng, FLOOD_CHANCE)) return;
    for (const m of ctx.state.monsters) if (m.id !== monster.id) adjustNeed(ctx, m, 'comfort', FLOOD_COMFORT, 'house');
    addSuspicion(ctx, FLOOD_SUSPICION);
    emit(ctx, 'flood', `The tub went over and the hall flooded; water ran out under the front door into the lane (house comfort ${FLOOD_COMFORT}, Suspicion +${FLOOD_SUSPICION}).`, {
      monsterId: monster.id,
      data: { comfort: FLOOD_COMFORT, suspicion: FLOOD_SUSPICION },
    });
  },
});

registerQuirk({
  id: 'freshwater',
  description: 'Feeds from the moat, so no kitchen light.',
  afterAction: (_ctx, monster, action, outcome) => {
    if (action.kind === 'feed') outcome.text = `${monster.name} slid into the moat and came back with a carp (hunger +${outcome.data['hunger']}).`;
  },
});

export function createLakeCreature(): Monster {
  return {
    id: 'lakeling',
    archetype: 'lakeling',
    name: 'The Lake Creature',
    bedroom: 'kitchen',
    bed: 'tub',
    needs: makeNeeds({ hygiene: 100 }),
    decay: { hunger: 10, energy: 10, social: 10, fun: 8, hygiene: 20, comfort: 5, bladder: 10 },
    quirks: ['mustStayWet', 'floodsHall', 'freshwater'],
    coverJob: job('lock keeper', 8, 0.2),
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
    memo: {},
  };
}
