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
import { t } from '../i18n.ts';

export const DRY_AT = 20;
export const DRY_COMFORT = -15;
export const SOAK_HYGIENE = 100;
export const FLOOD_CHANCE = 0.5;
export const FLOOD_COMFORT = -5;
export const FLOOD_SUSPICION = 2;

registerQuirk({
  id: 'mustStayWet',
  description: t('lakeling.mustStayWet.1'),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'sleep') return;
    const tub = ctx.state.house.furniture.find((f) => f.id === monster.bed);
    if (tub && !tub.broken) {
      const hygiene = adjustNeed(ctx, monster, 'hygiene', SOAK_HYGIENE, 'sleep');
      outcome.text = t('lakeling.mustStayWet.2', { name: monster.name, tub: tub.name, hygiene });
      outcome.data['hygiene'] = hygiene;
    } else {
      outcome.text = t('lakeling.mustStayWet.3', { name: monster.name });
    }
  },
  onDawn: (ctx, monster) => {
    if (monster.needs.hygiene >= DRY_AT) return;
    const comfort = adjustNeed(ctx, monster, 'comfort', DRY_COMFORT, 'quirk');
    emit(ctx, 'dryingOut', t('lakeling.dryingOut.1', { name: monster.name, comfort }), {
      monsterId: monster.id,
      data: { hygiene: monster.needs.hygiene, comfort },
    });
  },
});

registerQuirk({
  id: 'floodsHall',
  description: t('lakeling.dryingOut.2'),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'sleep' || outcome.data['hygiene'] === undefined) return;
    if (!chance(ctx.state.rng, FLOOD_CHANCE)) return;
    for (const m of ctx.state.monsters) if (m.id !== monster.id) adjustNeed(ctx, m, 'comfort', FLOOD_COMFORT, 'house');
    addSuspicion(ctx, FLOOD_SUSPICION);
    emit(ctx, 'flood', t('lakeling.flood.1', { FLOOD_COMFORT, FLOOD_SUSPICION }), {
      monsterId: monster.id,
      data: { comfort: FLOOD_COMFORT, suspicion: FLOOD_SUSPICION },
    });
  },
});

registerQuirk({
  id: 'freshwater',
  description: t('lakeling.freshwater.1'),
  afterAction: (_ctx, monster, action, outcome) => {
    if (action.kind === 'feed') outcome.text = t('lakeling.freshwater.2', { name: monster.name, v: outcome.data['hunger'] });
  },
});

export function createLakeCreature(): Monster {
  return {
    id: 'lakeling',
    archetype: 'lakeling',
    name: t('lakeling.lakeling.1'),
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
