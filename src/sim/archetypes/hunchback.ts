/** The Hunchback (MM-35): company is for gargoyles, the roof is sanctuary, and the bells never fail him. */
import { addSuspicion, adjustNeed } from '../context.ts';
import { job } from '../fledgling.ts';
import { makeNeeds } from '../needs.ts';
import { registerQuirk } from '../quirks.ts';
import type { Monster } from '../types.ts';
import { t } from '../i18n.ts';

export const GARGOYLE_SOCIAL = 15;
export const SANCTUARY_SUSPICION = -3;
export const BELLS_SOCIAL = -10;

registerQuirk({
  id: 'belfry',
  description: t('hunchback.belfry.1'),
  filterNeedChange: (_ctx, _m, key, delta, source) => (key === 'social' && delta > 0 && source === 'socialise' ? 0 : delta),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'sleep' && action.kind !== 'lieLow') return;
    const social = adjustNeed(ctx, monster, 'social', GARGOYLE_SOCIAL, 'quirk');
    outcome.text += t('hunchback.belfry.2', { social });
    outcome.data['social'] = social;
  },
});

registerQuirk({
  id: 'sanctuary',
  description: t('hunchback.sanctuary.1'),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'lieLow') return;
    addSuspicion(ctx, SANCTUARY_SUSPICION);
    outcome.text = t('hunchback.sanctuary.2', { name: monster.name, v: Number(outcome.data['suspicion']) + SANCTUARY_SUSPICION, v2: outcome.data['social'] !== undefined ? t('hunchback.sanctuary.3') : '' });
    outcome.data['suspicion'] = Number(outcome.data['suspicion']) + SANCTUARY_SUSPICION;
  },
});

registerQuirk({
  id: 'belovedBells',
  description: t('hunchback.belovedBells.1'),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'coverJob' || outcome.data['success'] !== true) return;
    const social = adjustNeed(ctx, monster, 'social', BELLS_SOCIAL, 'coverJob');
    outcome.text += t('hunchback.belovedBells.2', { social });
  },
});

export function createHunchback(): Monster {
  return {
    id: 'hunchback',
    archetype: 'hunchback',
    name: t('hunchback.hunchback.1'),
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
