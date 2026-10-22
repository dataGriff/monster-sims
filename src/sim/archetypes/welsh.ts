/**
 * The Welsh folklore set (MM-36): Y Gwyllgi, the dog of darkness; Cŵn Annwn,
 * the hounds of the otherworld; and Gwrach y Rhibyn, the hag who wails at the
 * window before a death.
 */
import { addSuspicion, adjustNeed, emit } from '../context.ts';
import { job } from '../fledgling.ts';
import { makeNeeds } from '../needs.ts';
import { registerQuirk } from '../quirks.ts';
import { isAlly } from '../townies.ts';
import type { Monster } from '../types.ts';
import { t as tr } from '../i18n.ts';

export const OMEN_SUSPICION = 4;
export const OMEN_FUN = 20;
export const HUNT_EVERY = 3;
export const HUNT_SUSPICION = 12;
export const WAIL_FUN = 30;
export const WAIL_AWARENESS = 15;
export const WAIL_SUSPICION = 3;
export const CROSSROADS_SUSPICION = -2;

export function isHuntNight(night: number): boolean {
  return night > 0 && night % HUNT_EVERY === 0;
}

registerQuirk({
  id: 'omen',
  description: tr('welsh.omen.1'),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'socialise') return;
    addSuspicion(ctx, OMEN_SUSPICION);
    const fun = adjustNeed(ctx, monster, 'fun', OMEN_FUN, 'socialise');
    outcome.text = tr('welsh.omen.2', { name: monster.name, fun, OMEN_SUSPICION });
    outcome.data['suspicion'] = Number(outcome.data['suspicion'] ?? 0) + OMEN_SUSPICION;
  },
});

registerQuirk({
  id: 'packAnimal',
  description: tr('welsh.packAnimal.1'),
  filterNeedChange: (_ctx, _m, key, delta, source) => (key === 'social' && delta > 0 && source === 'socialise' ? 0 : delta),
});

registerQuirk({
  id: 'nightRoad',
  description: tr('welsh.nightRoad.1'),
  afterAction: (_ctx, monster, action, outcome) => {
    if (action.kind === 'feed') outcome.text = tr('welsh.nightRoad.2', { name: monster.name, v: outcome.data['hunger'] });
  },
});

registerQuirk({
  id: 'wildHunt',
  description: tr('welsh.wildHunt.1'),
  beforeAction: (ctx, monster, action) => {
    if (action.slot !== 'night' || !isHuntNight(ctx.state.night)) return undefined;
    monster.needs.fun = 100;
    monster.needs.hunger = 100;
    addSuspicion(ctx, HUNT_SUSPICION);
    emit(ctx, 'wildHunt', tr('welsh.wildHunt.2', { name: monster.name, HUNT_SUSPICION, kind: action.kind }), {
      monsterId: monster.id,
      data: { suspicion: HUNT_SUSPICION, lostAction: action.kind },
    });
    return null;
  },
  afterAction: (_ctx, monster, action, outcome) => {
    if (action.kind === 'feed') outcome.text = tr('welsh.wildHunt.3', { name: monster.name, v: outcome.data['hunger'] });
  },
});

registerQuirk({
  id: 'otherworldly',
  description: tr('welsh.otherworldly.1'),
  ignoredNeeds: ['hygiene', 'bladder'],
  filterNeedChange: (_ctx, _m, key, delta) => (key === 'hygiene' || key === 'bladder' ? 0 : delta),
});

registerQuirk({
  id: 'deathWail',
  description: tr('welsh.deathWail.1'),
  onDawn: (ctx, monster) => {
    const target = ctx.state.village.townies.find((t) => t.awareness >= 50 && !isAlly(t) && t.relationship !== 'turned');
    if (!target) return;
    const fun = adjustNeed(ctx, monster, 'fun', WAIL_FUN, 'quirk');
    target.awareness = Math.min(100, target.awareness + WAIL_AWARENESS);
    addSuspicion(ctx, WAIL_SUSPICION);
    emit(ctx, 'wail', tr('welsh.wail.1', { name: monster.name, target: target.name, fun, WAIL_SUSPICION }), {
      monsterId: monster.id,
      data: { townie: target.id, suspicion: WAIL_SUSPICION },
    });
  },
});

registerQuirk({
  id: 'mistBorn',
  description: tr('welsh.wail.2'),
  ignoredNeeds: ['hygiene'],
  filterNeedChange: (_ctx, _m, key, delta) => (key === 'hygiene' ? 0 : delta),
});

registerQuirk({
  id: 'crossroads',
  description: tr('welsh.crossroads.1'),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'lieLow') return;
    addSuspicion(ctx, CROSSROADS_SUSPICION);
    outcome.text = tr('welsh.crossroads.2', { name: monster.name, v: Number(outcome.data['suspicion']) + CROSSROADS_SUSPICION });
    outcome.data['suspicion'] = Number(outcome.data['suspicion']) + CROSSROADS_SUSPICION;
  },
});

export function createGwyllgi(): Monster {
  return {
    id: 'gwyllgi',
    archetype: 'gwyllgi',
    name: tr('welsh.gwyllgi.1'),
    bedroom: 'kitchen',
    bed: 'hearthrug',
    needs: makeNeeds({ social: 40 }),
    decay: { hunger: 15, energy: 10, social: 8, fun: 8, hygiene: 8, comfort: 5, bladder: 15 },
    quirks: ['omen', 'packAnimal', 'nightRoad'],
    coverJob: job('drover', 8, 0.2),
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
    memo: {},
  };
}

export function createCwnAnnwn(): Monster {
  return {
    id: 'cwnannwn',
    archetype: 'cwnannwn',
    name: tr('welsh.cwnannwn.1'),
    bedroom: 'roof',
    bed: 'kennel',
    needs: makeNeeds({ hygiene: 100, bladder: 100 }),
    decay: { hunger: 15, energy: 10, social: 5, fun: 10, hygiene: 0, comfort: 5, bladder: 0 },
    quirks: ['wildHunt', 'otherworldly', 'packAnimal'],
    coverJob: job('huntsman to the estate', 8, 0.2),
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
    memo: {},
  };
}

export function createGwrach(): Monster {
  return {
    id: 'gwrach',
    archetype: 'gwrach',
    name: tr('welsh.gwrach.1'),
    bedroom: 'parlour',
    bed: 'settle',
    needs: makeNeeds({ hygiene: 100 }),
    decay: { hunger: 5, energy: 8, social: 10, fun: 10, hygiene: 0, comfort: 5, bladder: 5 },
    quirks: ['deathWail', 'mistBorn', 'crossroads'],
    coverJob: job('layer-out of the dead', 8, 0.15),
    daylightActive: false,
    assignedAction: null,
    assignedDayAction: null,
    memo: {},
  };
}
