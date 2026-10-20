/** The Hunchback (MM-35): company is for gargoyles, the roof is sanctuary, and the bells never fail him. */
import { addSuspicion, adjustNeed } from '../context.ts';
import { job } from '../fledgling.ts';
import { makeNeeds } from '../needs.ts';
import { registerQuirk } from '../quirks.ts';
import type { Monster } from '../types.ts';

export const GARGOYLE_SOCIAL = 15;
export const SANCTUARY_SUSPICION = -3;
export const BELLS_SOCIAL = -10;

registerQuirk({
  id: 'belfry',
  description: 'Villagers do not count as company; a night on the roof with the gargoyles does.',
  filterNeedChange: (_ctx, _m, key, delta, source) => (key === 'social' && delta > 0 && source === 'socialise' ? 0 : delta),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'sleep' && action.kind !== 'lieLow') return;
    const social = adjustNeed(ctx, monster, 'social', GARGOYLE_SOCIAL, 'quirk');
    outcome.text += ` The gargoyles kept him company (social +${social}).`;
    outcome.data['social'] = social;
  },
});

registerQuirk({
  id: 'sanctuary',
  description: 'Lying low on the roof is claiming sanctuary, and the village respects it a little more.',
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'lieLow') return;
    addSuspicion(ctx, SANCTUARY_SUSPICION);
    outcome.text = `${monster.name} claimed sanctuary up among the bells (Suspicion ${Number(outcome.data['suspicion']) + SANCTUARY_SUSPICION}).${outcome.text.includes('gargoyles') ? ' The gargoyles kept him company.' : ''}`;
    outcome.data['suspicion'] = Number(outcome.data['suspicion']) + SANCTUARY_SUSPICION;
  },
});

registerQuirk({
  id: 'belovedBells',
  description: 'The bell ringer is the one resident the village is fond of; his shifts almost never fail, but the bells leave him deaf to company.',
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'coverJob' || outcome.data['success'] !== true) return;
    const social = adjustNeed(ctx, monster, 'social', BELLS_SOCIAL, 'coverJob');
    outcome.text += ` His ears rang till dawn (social ${social}).`;
  },
});

export function createHunchback(): Monster {
  return {
    id: 'hunchback',
    archetype: 'hunchback',
    name: 'The Hunchback',
    bedroom: 'roof',
    bed: 'belfry',
    needs: makeNeeds({ social: 40, hygiene: 60 }),
    decay: { hunger: 15, energy: 10, social: 8, fun: 8, hygiene: 8, comfort: 5, bladder: 15 },
    quirks: ['belfry', 'sanctuary', 'belovedBells'],
    coverJob: job('bell ringer', 10, 0.02),
    daylightActive: true,
    assignedAction: null,
    assignedDayAction: null,
    memo: {},
  };
}
