/** The Bride (MM-35): made, not asked. Lightning-powered like the Golem and not about to be paired with him. */
import { addSuspicion, adjustNeed, emit } from '../context.ts';
import { job } from '../fledgling.ts';
import { makeNeeds } from '../needs.ts';
import { registerQuirk } from '../quirks.ts';
import type { Monster } from '../types.ts';
import { t } from '../i18n.ts';

export const SHRIEK_FUN = 20;
export const SHRIEK_SUSPICION = 4;

registerQuirk({
  id: 'neverAsked',
  description: t('bride.neverAsked.1'),
  onDusk: (ctx, monster) => {
    const golem = ctx.state.monsters.find((m) => m.archetype === 'golem');
    if (!golem || monster.assignedAction === null || monster.assignedAction !== golem.assignedAction) return;
    const refused = monster.assignedAction;
    monster.assignedAction = 'lieLow';
    emit(ctx, 'refused', t('bride.refused.1', { name: monster.name, refused, golem: golem.name }), {
      monsterId: monster.id,
      data: { refused },
    });
  },
});

registerQuirk({
  id: 'shriek',
  description: t('bride.refused.2'),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'lieLow') return;
    const fun = adjustNeed(ctx, monster, 'fun', SHRIEK_FUN, 'lieLow');
    addSuspicion(ctx, SHRIEK_SUSPICION);
    outcome.text = t('bride.shriek.1', { name: monster.name, fun, SHRIEK_SUSPICION });
    outcome.data['suspicion'] = SHRIEK_SUSPICION;
  },
});

export function createBride(): Monster {
  return {
    id: 'bride',
    archetype: 'bride',
    name: t('bride.bride.1'),
    bedroom: 'workshop',
    bed: 'slab2',
    needs: makeNeeds({ social: 50 }),
    decay: { hunger: 8, energy: 5, social: 10, fun: 8, hygiene: 5, comfort: 5, bladder: 5 },
    quirks: ['lightningPowered', 'neverAsked', 'shriek'],
    coverJob: job('seamstress', 8, 0.2),
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
    memo: {},
  };
}
