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
  description: 'A black dog on the road at night is a death omen: socialising frightens people more than it befriends them, and he enjoys it.',
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'socialise') return;
    addSuspicion(ctx, OMEN_SUSPICION);
    const fun = adjustNeed(ctx, monster, 'fun', OMEN_FUN, 'socialise');
    outcome.text = `${monster.name} padded along the parish road with his eyes glowing; somebody crossed themselves (fun +${fun}, Suspicion +${OMEN_SUSPICION}).`;
    outcome.data['suspicion'] = Number(outcome.data['suspicion'] ?? 0) + OMEN_SUSPICION;
  },
});

registerQuirk({
  id: 'packAnimal',
  description: 'Company only counts when the household is together: villagers do not fill social, a game night does.',
  filterNeedChange: (_ctx, _m, key, delta, source) => (key === 'social' && delta > 0 && source === 'socialise' ? 0 : delta),
});

registerQuirk({
  id: 'nightRoad',
  description: 'Feeds on the road, not in the kitchen.',
  afterAction: (_ctx, monster, action, outcome) => {
    if (action.kind === 'feed') outcome.text = `${monster.name} took a sheep off the mountain (hunger +${outcome.data['hunger']}).`;
  },
});

registerQuirk({
  id: 'wildHunt',
  description: 'Every third night the hounds ride: fun and hunger fill, whatever was planned is lost, and the whole valley hears them.',
  beforeAction: (ctx, monster, action) => {
    if (action.slot !== 'night' || !isHuntNight(ctx.state.night)) return undefined;
    monster.needs.fun = 100;
    monster.needs.hunger = 100;
    addSuspicion(ctx, HUNT_SUSPICION);
    emit(ctx, 'wildHunt', `${monster.name} rode the sky over the valley all night. Every dog in the terrace howled back (Suspicion +${HUNT_SUSPICION}). The ${action.kind} will have to wait.`, {
      monsterId: monster.id,
      data: { suspicion: HUNT_SUSPICION, lostAction: action.kind },
    });
    return null;
  },
  afterAction: (_ctx, monster, action, outcome) => {
    if (action.kind === 'feed') outcome.text = `${monster.name} ran something down on the moor (hunger +${outcome.data['hunger']}).`;
  },
});

registerQuirk({
  id: 'otherworldly',
  description: 'Hygiene and bladder mean nothing to the hounds of Annwn.',
  ignoredNeeds: ['hygiene', 'bladder'],
  filterNeedChange: (_ctx, _m, key, delta) => (key === 'hygiene' || key === 'bladder' ? 0 : delta),
});

registerQuirk({
  id: 'deathWail',
  description: 'When a villager is frightened enough to talk, she wails at their window at dawn. It cheers her up and does nothing for them.',
  onDawn: (ctx, monster) => {
    const target = ctx.state.village.townies.find((t) => t.awareness >= 50 && !isAlly(t) && t.relationship !== 'turned');
    if (!target) return;
    const fun = adjustNeed(ctx, monster, 'fun', WAIL_FUN, 'quirk');
    target.awareness = Math.min(100, target.awareness + WAIL_AWARENESS);
    addSuspicion(ctx, WAIL_SUSPICION);
    emit(ctx, 'wail', `${monster.name} wailed at ${target.name}'s window before first light (fun +${fun}, Suspicion +${WAIL_SUSPICION}).`, {
      monsterId: monster.id,
      data: { townie: target.id, suspicion: WAIL_SUSPICION },
    });
  },
});

registerQuirk({
  id: 'mistBorn',
  description: 'Made of mist: hygiene is nothing to her.',
  ignoredNeeds: ['hygiene'],
  filterNeedChange: (_ctx, _m, key, delta) => (key === 'hygiene' ? 0 : delta),
});

registerQuirk({
  id: 'crossroads',
  description: 'Lying low, she is simply not there: a little more Suspicion drains away than for anyone else.',
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'lieLow') return;
    addSuspicion(ctx, CROSSROADS_SUSPICION);
    outcome.text = `${monster.name} was mist at the crossroads all night and nobody could have said she was ever here (Suspicion ${Number(outcome.data['suspicion']) + CROSSROADS_SUSPICION}).`;
    outcome.data['suspicion'] = Number(outcome.data['suspicion']) + CROSSROADS_SUSPICION;
  },
});

export function createGwyllgi(): Monster {
  return {
    id: 'gwyllgi',
    archetype: 'gwyllgi',
    name: 'Y Gwyllgi',
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
    name: 'Cŵn Annwn',
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
    name: 'Gwrach y Rhibyn',
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
