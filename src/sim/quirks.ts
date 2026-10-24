import { addSuspicion, adjustNeed, emit, isFullMoon, type Ctx, type NeedSource } from './context.ts';
import { breakFurniture, breakRoom } from './house.ts';
import { createFledgling } from './fledgling.ts';
import { chance, pick } from './rng.ts';
import {
  BOND_PER_STAGE,
  FEED_AWARENESS,
  advanceBond,
  isAlly,
  stageRank,
  syncAllies,
  townieAbroad,
} from './townies.ts';
import type { Action, Monster, NeedKey, QuirkId, Townie } from './types.ts';
import { t as tr } from './i18n.ts';

/** What an action did; quirks may rewrite `text` before it is logged. */
export interface ActionOutcome {
  text: string;
  data: Record<string, number | string | boolean>;
}

export interface Quirk {
  id: QuirkId;
  description: string;
  /** Needs this monster simply does not care about (ignored for anger). */
  ignoredNeeds?: NeedKey[];
  onDusk?: (ctx: Ctx, monster: Monster) => void;
  /** Return `null` to cancel the action, an Action to replace it, or undefined to keep it. */
  beforeAction?: (ctx: Ctx, monster: Monster, action: Action) => Action | null | undefined;
  afterAction?: (ctx: Ctx, monster: Monster, action: Action, outcome: ActionOutcome) => void;
  /** Runs after every monster's night action has resolved. */
  onNight?: (ctx: Ctx, monster: Monster) => void;
  onDawn?: (ctx: Ctx, monster: Monster) => void;
  /** Return true to replace the default "sleep through the day" behaviour. */
  onDay?: (ctx: Ctx, monster: Monster) => boolean | undefined;
  filterNeedChange?: (
    ctx: Ctx,
    monster: Monster,
    key: NeedKey,
    delta: number,
    source: NeedSource,
  ) => number;
}

export const CHARM_BOND = BOND_PER_STAGE;
export const CHARM_SUSPICION = 5;
export const TURNED_SUSPICION = 20;
export const TURNED_NEIGHBOUR_AWARENESS = 30;
export const CONFIDANT_SUSPICION = -10;
export const FLEDGLING_FEED_SUSPICION = 2;
export const FLEDGLING_SOCIAL_SUSPICION = 3;
export const REWRAP_COMFORT = 30;
export const HOARD_CHANCE = 0.3;
export const ARTEFACT_FUN = 5;
export const CURSE_COMFORT = -20;
export const CURSE_HYGIENE = -10;
export const CURSE_ANGER = 10;
export const PRANK_FUN = 15;
export const PRANK_COMFORT = -10;
export const PRANK_ANGER = 5;
export const STEAL_CHANCE = 0.5;
export const STEAL_HUNGER = 10;
export const STEAL_ANGER = 10;

export const ARTEFACTS = ['canopic jar', 'scarab amulet', 'funerary mask', 'ushabti figure', 'basalt cat'] as const;
export const FEED_SUSPICION_COUNT = 3;
export const DAYLIGHT_DRAIN = 15;
export const FULL_MOON_SUSPICION = 15;
export const FULL_MOON_SHIFT_DISASTER = 10;
export const GOLEM_SOCIAL_CAP = 20;
export const GOLEM_BREAK_CHANCE = 0.4;
export const GOLEM_BREAK_COMFORT = 10;

const QUIRKS: Partial<Record<QuirkId, Quirk>> = {
  nocturnalFeeder: {
    id: 'nocturnalFeeder',
    description: tr('quirks.nocturnalFeeder.1'),
    filterNeedChange: (_ctx, _m, key, delta, source) =>
      key === 'hunger' && delta > 0 && source !== 'feed' ? 0 : delta,
    afterAction: (ctx, monster, action, outcome) => {
      if (action.kind !== 'feed') return;
      const village = ctx.state.village;
      const donor = village.townies.find((t) => isAlly(t) && t.relationship !== 'turned');
      if (donor) {
        outcome.text = tr('quirks.nocturnalFeeder.2', { name: monster.name, donor: donor.name });
        outcome.data['donor'] = donor.id;
        return;
      }
      const abroad = townieAbroad(village, 'night');
      const victim = abroad.length > 0 ? pick(ctx.state.rng, abroad) : undefined;
      addSuspicion(ctx, FEED_SUSPICION_COUNT);
      if (victim) {
        victim.awareness = Math.min(100, victim.awareness + FEED_AWARENESS);
        outcome.text = tr('quirks.nocturnalFeeder.3', { name: monster.name, victim: victim.name });
        outcome.data['victim'] = victim.id;
      } else {
        outcome.text = tr('quirks.nocturnalFeeder.4', { name: monster.name });
      }
      outcome.data['suspicion'] = FEED_SUSPICION_COUNT;
    },
  },
  daylightDrain: {
    id: 'daylightDrain',
    description: tr('quirks.daylightDrain.1'),
    onDay: (ctx, monster) => {
      const applied = adjustNeed(ctx, monster, 'energy', -DAYLIGHT_DRAIN, 'daySleep');
      emit(ctx, 'daylightDrain', tr('quirks.daylightDrain.2', { name: monster.name, applied }), {
        monsterId: monster.id,
        data: { energy: applied },
      });
      return true;
    },
  },
  noReflection: {
    id: 'noReflection',
    description: tr('quirks.daylightDrain.3'),
    ignoredNeeds: ['hygiene'],
    filterNeedChange: (_ctx, _m, key, delta) => (key === 'hygiene' ? 0 : delta),
  },
  charm: {
    id: 'charm',
    description: tr('quirks.charm.1'),
    afterAction: (ctx, monster, action, outcome) => {
      if (action.kind !== 'socialise') return;
      const village = ctx.state.village;
      const mark = currentMark(ctx, village.townies);
      if (!mark) return;
      addSuspicion(ctx, CHARM_SUSPICION);
      const reached = advanceBond(mark, CHARM_BOND, 'turned');
      outcome.text = tr('quirks.charm.2', { name: monster.name, mark: mark.name });
      outcome.data['townie'] = mark.id;
      outcome.data['relationship'] = mark.relationship;
      outcome.data['suspicion'] = CHARM_SUSPICION;
      if (reached) onStageReached(ctx, monster, mark, reached);
    },
  },
  fullMoon: {
    id: 'fullMoon',
    description:
      tr('quirks.fullMoon.1'),
    onDusk: (ctx, monster) => {
      if (!isFullMoon(ctx.state.night)) return;
      monster.needs.hygiene = 0;
      monster.needs.comfort = 0;
      monster.needs.fun = 100;
      emit(ctx, 'fullMoonRises', tr('quirks.fullMoonRises.1', { name: monster.name }), {
        monsterId: monster.id,
      });
    },
    beforeAction: (ctx, monster, action) => {
      if (!isFullMoon(ctx.state.night)) return undefined;
      breakRoom(ctx.state.house, 'kitchen');
      addSuspicion(ctx, FULL_MOON_SUSPICION);
      let text = tr('quirks.fullMoon.2', { name: monster.name, FULL_MOON_SUSPICION });
      let suspicion = FULL_MOON_SUSPICION;
      if (action.kind === 'coverJob') {
        addSuspicion(ctx, FULL_MOON_SHIFT_DISASTER);
        suspicion += FULL_MOON_SHIFT_DISASTER;
        text += tr('quirks.fullMoon.3', { v: monster.coverJob.title, FULL_MOON_SHIFT_DISASTER });
      }
      emit(ctx, 'blackout', text, {
        monsterId: monster.id,
        data: { suspicion, lostAction: action.kind, memory: false },
      });
      return null;
    },
  },
  dayWalker: {
    id: 'dayWalker',
    description: tr('quirks.blackout.1'),
  },
  villagersFlee: {
    id: 'villagersFlee',
    description: tr('quirks.villagersFlee.1', { GOLEM_SOCIAL_CAP }),
    ignoredNeeds: ['social'],
    filterNeedChange: (_ctx, monster, key, delta) => {
      if (key !== 'social' || delta <= 0) return delta;
      return Math.max(0, Math.min(delta, GOLEM_SOCIAL_CAP - monster.needs.social));
    },
    afterAction: (_ctx, monster, action, outcome) => {
      if (action.kind !== 'socialise') return;
      const social = Number(outcome.data['social'] ?? 0);
      outcome.text =
        social > 0
          ? tr('quirks.villagersFlee.2', { name: monster.name, social })
          : tr('quirks.villagersFlee.3', { name: monster.name });
    },
  },
  lightningPowered: {
    id: 'lightningPowered',
    description: tr('quirks.lightningPowered.1'),
    filterNeedChange: (ctx, _m, key, delta) => {
      if (key !== 'energy' || delta <= 0) return delta;
      return ctx.state.house.lightningRod ? delta : 0;
    },
  },
  heavyHanded: {
    id: 'heavyHanded',
    description: tr('quirks.heavyHanded.1', { GOLEM_BREAK_COMFORT }),
    onNight: (ctx, monster) => {
      if (!chance(ctx.state.rng, GOLEM_BREAK_CHANCE)) return;
      const intact = ctx.state.house.furniture.filter((f) => !f.broken);
      if (intact.length === 0) return;
      const victim = pick(ctx.state.rng, intact);
      breakFurniture(ctx.state.house, victim.id);
      for (const m of ctx.state.monsters) adjustNeed(ctx, m, 'comfort', -GOLEM_BREAK_COMFORT, 'house');
      emit(
        ctx,
        'furnitureBroken',
        tr('quirks.furnitureBroken.1', { name: monster.name, victim: victim.name, GOLEM_BREAK_COMFORT }),
        { monsterId: monster.id, data: { furniture: victim.id, comfort: -GOLEM_BREAK_COMFORT } },
      );
      if (victim.artefact) curse(ctx, monster, victim.name, 'broke');
    },
  },
};

function currentMark(ctx: Ctx, townies: Townie[]): Townie | undefined {
  const candidates = townies.filter((t) => t.relationship !== 'turned');
  const started = candidates.filter((t) => t.relationship !== 'stranger' || t.bond > 0);
  if (started.length > 0) {
    return started.reduce((best, t) =>
      stageRank(t.relationship) * 100 + t.bond > stageRank(best.relationship) * 100 + best.bond ? t : best,
    );
  }
  const abroad = candidates.filter((t) => t.abroad === 'night');
  const pool = abroad.length > 0 ? abroad : candidates;
  return pool.length > 0 ? pick(ctx.state.rng, pool) : undefined;
}

/** Shared by charm and ordinary socialising: what a new relationship stage does. */
export function onStageReached(ctx: Ctx, monster: Monster, townie: Townie, stage: Townie['relationship']): void {
  const village = ctx.state.village;
  const who = townie.name.charAt(0).toUpperCase() + townie.name.slice(1);
  switch (stage) {
    case 'friend':
      emit(ctx, 'relationship', tr('quirks.relationship.1', { who, name: monster.name }), {
        monsterId: monster.id,
        data: { townie: townie.id, stage },
      });
      break;
    case 'confidant':
      syncAllies(village);
      addSuspicion(ctx, CONFIDANT_SUSPICION);
      emit(ctx, 'relationship', tr('quirks.relationship.2', { who, CONFIDANT_SUSPICION }), {
        monsterId: monster.id,
        data: { townie: townie.id, stage, suspicion: CONFIDANT_SUSPICION },
      });
      break;
    case 'thrall':
      emit(ctx, 'relationship', tr('quirks.relationship.3', { who, name: monster.name }), {
        monsterId: monster.id,
        data: { townie: townie.id, stage },
      });
      break;
    case 'turned': {
      const fledgling = createFledgling(townie);
      ctx.state.monsters.push(fledgling);
      village.turned.push(townie.name);
      syncAllies(village);
      for (const id of townie.neighbours) {
        const n = village.townies.find((t) => t.id === id);
        if (n && !isAlly(n)) n.awareness = Math.min(100, n.awareness + TURNED_NEIGHBOUR_AWARENESS);
      }
      addSuspicion(ctx, TURNED_SUSPICION);
      emit(
        ctx,
        'turned',
        tr('quirks.turned.1', { who, fledgling: fledgling.name, TURNED_SUSPICION }),
        { monsterId: fledgling.id, data: { townie: townie.id, stage, suspicion: TURNED_SUSPICION } },
      );
      break;
    }
    case 'stranger':
      break;
  }
}

/** The Mummy's artefacts do not like being handled. */
export function curse(ctx: Ctx, monster: Monster, artefact: string, how: 'moved' | 'broke'): void {
  const comfort = adjustNeed(ctx, monster, 'comfort', CURSE_COMFORT, 'quirk');
  const hygiene = adjustNeed(ctx, monster, 'hygiene', CURSE_HYGIENE, 'quirk');
  const anger = adjustNeed(ctx, monster, 'anger', CURSE_ANGER, 'quirk');
  emit(
    ctx,
    'curse',
    tr('quirks.curse.1', { name: monster.name, how, artefact, comfort, hygiene, anger }),
    { monsterId: monster.id, data: { artefact, how } },
  );
}

export function artefacts(ctx: Ctx) {
  return ctx.state.house.furniture.filter((f) => f.artefact);
}

QUIRKS.undying = {
  id: 'undying',
  description: tr('quirks.undying.1'),
  ignoredNeeds: ['energy', 'bladder'],
  onDusk: (_ctx, monster) => {
    monster.needs.energy = 100;
    monster.needs.bladder = 100;
  },
  filterNeedChange: (_ctx, _m, key, delta) => (key === 'energy' || key === 'bladder' ? 0 : delta),
};

QUIRKS.unravelling = {
  id: 'unravelling',
  description: tr('quirks.unravelling.1'),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'sleep') return;
    const bed = ctx.state.house.furniture.find((f) => f.id === monster.bed);
    if (bed && !bed.broken) {
      const comfort = adjustNeed(ctx, monster, 'comfort', REWRAP_COMFORT, 'sleep');
      outcome.text = tr('quirks.unravelling.2', { name: monster.name, bed: bed.name, comfort });
      outcome.data['comfort'] = comfort;
    } else {
      outcome.text = tr('quirks.unravelling.3', { name: monster.name });
    }
  },
};

QUIRKS.slowMoving = {
  id: 'slowMoving',
  description: tr('quirks.slowMoving.1'),
  afterAction: (_ctx, monster) => {
    monster.memo['busyNights'] = 1;
  },
};

QUIRKS.hoarder = {
  id: 'hoarder',
  description: tr('quirks.hoarder.1'),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'feed' && action.kind !== 'socialise' && action.kind !== 'coverJob') return;
    if (!chance(ctx.state.rng, HOARD_CHANCE)) return;
    const name = pick(ctx.state.rng, ARTEFACTS);
    const n = artefacts(ctx).length + 1;
    ctx.state.house.furniture.push({ id: `artefact-${n}`, name, room: monster.bedroom, broken: false, artefact: true });
    outcome.text += tr('quirks.hoarder.2', { name });
    outcome.data['artefact'] = name;
  },
  onDawn: (ctx, monster) => {
    const n = artefacts(ctx).length;
    if (n > 0) adjustNeed(ctx, monster, 'fun', ARTEFACT_FUN * n, 'quirk');
  },
};

QUIRKS.visibility = {
  id: 'visibility',
  description: tr('quirks.visibility.1'),
  onDusk: (_ctx, monster) => {
    monster.memo['visible'] = monster.assignedAction === 'socialise';
  },
  filterNeedChange: (_ctx, monster, key, delta) => (key === 'social' && delta > 0 && !monster.memo['visible'] ? 0 : delta),
  afterAction: (_ctx, monster, action, outcome) => {
    if (action.kind === 'gameNight' && !monster.memo['visible']) outcome.text += tr('quirks.visibility.2');
    if (action.kind === 'socialise') outcome.text += tr('quirks.visibility.3');
  },
};

QUIRKS.prankster = {
  id: 'prankster',
  description: tr('quirks.prankster.1'),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind !== 'lieLow') return;
    const others = ctx.state.monsters.filter((m) => m.id !== monster.id);
    const fun = adjustNeed(ctx, monster, 'fun', PRANK_FUN, 'lieLow');
    if (others.length === 0) return;
    const victim = pick(ctx.state.rng, others);
    const comfort = adjustNeed(ctx, victim, 'comfort', PRANK_COMFORT, 'house');
    adjustNeed(ctx, victim, 'anger', PRANK_ANGER, 'house');
    outcome.text = tr('quirks.prankster.2', { name: monster.name, victim: victim.name, bed: victim.bed, v: fun + Number(outcome.data['fun'] ?? 0), comfort });
    outcome.data['victim'] = victim.id;
  },
};

QUIRKS.foodThief = {
  id: 'foodThief',
  description: tr('quirks.foodThief.1'),
  onNight: (ctx, monster) => {
    if (!chance(ctx.state.rng, STEAL_CHANCE)) return;
    const eaters = ctx.state.monsters.filter((m) => m.id !== monster.id && !m.quirks.includes('nocturnalFeeder'));
    if (eaters.length === 0) return;
    const victim = pick(ctx.state.rng, eaters);
    const lost = -adjustNeed(ctx, victim, 'hunger', -STEAL_HUNGER, 'house');
    adjustNeed(ctx, monster, 'hunger', STEAL_HUNGER, 'feed');
    const anger = adjustNeed(ctx, victim, 'anger', STEAL_ANGER, 'house');
    emit(ctx, 'foodStolen', tr('quirks.foodStolen.1', { victim: victim.name, lost, anger }), {
      monsterId: monster.id,
      data: { victim: victim.id, hunger: lost },
    });
  },
};

QUIRKS.lowProfile = {
  id: 'lowProfile',
  description: tr('quirks.foodStolen.2'),
  afterAction: (ctx, _m, _a, outcome) => {
    const raised = Number(outcome.data['suspicion'] ?? 0);
    if (raised <= 0) return;
    const refund = Math.floor(raised / 2);
    if (refund === 0) return;
    addSuspicion(ctx, -refund);
    outcome.data['suspicion'] = raised - refund;
    outcome.text += tr('quirks.lowProfile.1');
  },
};

QUIRKS.fledgling = {
  id: 'fledgling',
  description: tr('quirks.fledgling.1'),
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind === 'feed' && outcome.data['donor'] === undefined) {
      addSuspicion(ctx, FLEDGLING_FEED_SUSPICION);
      outcome.text += tr('quirks.fledgling.2', { FLEDGLING_FEED_SUSPICION });
    }
    if (action.kind === 'socialise') {
      addSuspicion(ctx, FLEDGLING_SOCIAL_SUSPICION);
      outcome.text = tr('quirks.fledgling.3', { name: monster.name, FLEDGLING_SOCIAL_SUSPICION });
    }
  },
};

/** Archetype modules add their quirks here at import time. */
export function registerQuirk(quirk: Quirk): void {
  QUIRKS[quirk.id] = quirk;
}

export function getQuirk(id: QuirkId): Quirk {
  const q = QUIRKS[id];
  if (!q) throw new Error(`Quirk "${id}" is not registered`);
  return q;
}

export function ignoredNeeds(monster: Monster): Set<NeedKey> {
  const set = new Set<NeedKey>();
  for (const id of monster.quirks) for (const k of getQuirk(id).ignoredNeeds ?? []) set.add(k);
  return set;
}
