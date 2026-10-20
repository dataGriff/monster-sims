/** The Phantom (MM-35): fun only from music, half a face for company, and a temper with a chandelier in it. */
import { addSuspicion, adjustNeed, emit } from '../context.ts';
import { job } from '../fledgling.ts';
import { breakFurniture } from '../house.ts';
import { makeNeeds } from '../needs.ts';
import { registerQuirk } from '../quirks.ts';
import type { Monster } from '../types.ts';

export const ORGAN_FUN = 30;
export const HUM_FUN = 5;
export const ORGAN_SUSPICION = 3;
export const CHANDELIER_ANGER = 60;
export const CHANDELIER_SUSPICION = 10;
export const CHANDELIER_RELIEF = -30;

registerQuirk({
  id: 'virtuoso',
  description: 'Fun comes only from music. Lying low means playing the organ, if the house has one, and the music carries.',
  filterNeedChange: (_ctx, _m, key, delta, source) =>
    key === 'fun' && delta > 0 && (source === 'socialise' || source === 'gameNight') ? 0 : delta,
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'lieLow') return;
    if (ctx.state.house.defences.organ) {
      const fun = adjustNeed(ctx, monster, 'fun', ORGAN_FUN, 'lieLow');
      addSuspicion(ctx, ORGAN_SUSPICION);
      outcome.text = `${monster.name} played the organ until dawn (fun +${fun}); the music carried to the lane (Suspicion +${ORGAN_SUSPICION}).`;
      outcome.data['suspicion'] = Number(outcome.data['suspicion'] ?? 0) + ORGAN_SUSPICION;
    } else {
      const fun = adjustNeed(ctx, monster, 'fun', HUM_FUN, 'lieLow');
      outcome.text = `${monster.name} hummed to himself in the dark; there is no organ in this house (fun +${fun}).`;
    }
  },
});

registerQuirk({
  id: 'masked',
  description: 'Half a face behind a mask: company counts for half.',
  filterNeedChange: (_ctx, _m, key, delta) => (key === 'social' && delta > 0 ? Math.floor(delta / 2) : delta),
});

registerQuirk({
  id: 'chandelier',
  description: 'Push him to 60 anger and something heavy comes down in the parlour.',
  onDawn: (ctx, monster) => {
    if (monster.needs.anger < CHANDELIER_ANGER) return;
    const victim = ctx.state.house.furniture.find((f) => f.room === 'parlour' && !f.broken);
    if (!victim) return;
    breakFurniture(ctx.state.house, victim.id);
    addSuspicion(ctx, CHANDELIER_SUSPICION);
    const anger = adjustNeed(ctx, monster, 'anger', CHANDELIER_RELIEF, 'quirk');
    emit(ctx, 'chandelier', `${monster.name} brought the chandelier down on the ${victim.name}. The crash was heard in the square (Suspicion +${CHANDELIER_SUSPICION}, anger ${anger}).`, {
      monsterId: monster.id,
      data: { furniture: victim.id, suspicion: CHANDELIER_SUSPICION },
    });
  },
});

export function createPhantom(): Monster {
  return {
    id: 'phantom',
    archetype: 'phantom',
    name: 'The Phantom',
    bedroom: 'parlour',
    bed: 'daybed',
    needs: makeNeeds({ social: 40, fun: 50 }),
    decay: { hunger: 10, energy: 10, social: 12, fun: 10, hygiene: 8, comfort: 5, bladder: 10 },
    quirks: ['virtuoso', 'masked', 'chandelier'],
    coverJob: job('music teacher by post', 8, 0.15),
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
    memo: {},
  };
}
