import { addSuspicion, adjustNeed, emit, isFullMoon, type Ctx, type NeedSource } from './context.ts';
import { breakFurniture, breakRoom } from './house.ts';
import { createFledgling } from './monsters.ts';
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
export const FEED_SUSPICION_COUNT = 3;
export const DAYLIGHT_DRAIN = 15;
export const FULL_MOON_SUSPICION = 15;
export const FULL_MOON_SHIFT_DISASTER = 10;
export const GOLEM_SOCIAL_CAP = 20;
export const GOLEM_BREAK_CHANCE = 0.4;
export const GOLEM_BREAK_COMFORT = 10;

const QUIRKS: Record<QuirkId, Quirk> = {
  fledgling: { id: 'fledgling', description: 'placeholder, replaced below' },
  nocturnalFeeder: {
    id: 'nocturnalFeeder',
    description: 'Hunger only fills from "feed" at night; every other source is ignored.',
    filterNeedChange: (_ctx, _m, key, delta, source) =>
      key === 'hunger' && delta > 0 && source !== 'feed' ? 0 : delta,
    afterAction: (ctx, monster, action, outcome) => {
      if (action.kind !== 'feed') return;
      const village = ctx.state.village;
      const donor = village.townies.find((t) => isAlly(t) && t.relationship !== 'turned');
      if (donor) {
        outcome.text = `${monster.name} fed quietly; ${donor.name} rolled up a sleeve without being asked.`;
        outcome.data['donor'] = donor.id;
        return;
      }
      const abroad = townieAbroad(village, 'night');
      const victim = abroad.length > 0 ? pick(ctx.state.rng, abroad) : undefined;
      addSuspicion(ctx, FEED_SUSPICION_COUNT);
      if (victim) {
        victim.awareness = Math.min(100, victim.awareness + FEED_AWARENESS);
        outcome.text = `${monster.name} went out to feed; ${victim.name} woke up pale.`;
        outcome.data['victim'] = victim.id;
      } else {
        outcome.text = `${monster.name} went out to feed; a villager woke up pale.`;
      }
      outcome.data['suspicion'] = FEED_SUSPICION_COUNT;
    },
  },
  daylightDrain: {
    id: 'daylightDrain',
    description: 'Energy drains in daylight instead of recovering.',
    onDay: (ctx, monster) => {
      const applied = adjustNeed(ctx, monster, 'energy', -DAYLIGHT_DRAIN, 'daySleep');
      emit(ctx, 'daylightDrain', `${monster.name} tossed in the crypt all day (energy ${applied}).`, {
        monsterId: monster.id,
        data: { energy: applied },
      });
      return true;
    },
  },
  noReflection: {
    id: 'noReflection',
    description: 'Hygiene never changes and is never a cause for anger (no reflection).',
    ignoredNeeds: ['hygiene'],
    filterNeedChange: (_ctx, _m, key, delta) => (key === 'hygiene' ? 0 : delta),
  },
  charm: {
    id: 'charm',
    description: 'Socialising charms a villager up the tree friend → confidant → thrall → turned: +bond, +Suspicion.',
    afterAction: (ctx, monster, action, outcome) => {
      if (action.kind !== 'socialise') return;
      const village = ctx.state.village;
      const mark = currentMark(ctx, village.townies);
      if (!mark) return;
      addSuspicion(ctx, CHARM_SUSPICION);
      const reached = advanceBond(mark, CHARM_BOND, 'turned');
      outcome.text = `${monster.name} charmed ${mark.name}.`;
      outcome.data['townie'] = mark.id;
      outcome.data['relationship'] = mark.relationship;
      outcome.data['suspicion'] = CHARM_SUSPICION;
      if (reached) onStageReached(ctx, monster, mark, reached);
    },
  },
  fullMoon: {
    id: 'fullMoon',
    description:
      'Every 7th night hygiene and comfort crash, fun maxes, and he blacks out: kitchen wrecked, Suspicion +15, no memory.',
    onDusk: (ctx, monster) => {
      if (!isFullMoon(ctx.state.night)) return;
      monster.needs.hygiene = 0;
      monster.needs.comfort = 0;
      monster.needs.fun = 100;
      emit(ctx, 'fullMoonRises', `The moon is full. ${monster.name} feels the change coming.`, {
        monsterId: monster.id,
      });
    },
    beforeAction: (ctx, monster, action) => {
      if (!isFullMoon(ctx.state.night)) return undefined;
      breakRoom(ctx.state.house, 'kitchen');
      addSuspicion(ctx, FULL_MOON_SUSPICION);
      let text = `${monster.name} blacked out under the full moon. The kitchen is wrecked and howls carried to the village (Suspicion +${FULL_MOON_SUSPICION}). He remembers nothing.`;
      let suspicion = FULL_MOON_SUSPICION;
      if (action.kind === 'coverJob') {
        addSuspicion(ctx, FULL_MOON_SHIFT_DISASTER);
        suspicion += FULL_MOON_SHIFT_DISASTER;
        text += ` His ${monster.coverJob.title} shift ended in disaster (Suspicion +${FULL_MOON_SHIFT_DISASTER}).`;
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
    description: 'The only monster who can act in daylight.',
  },
  villagersFlee: {
    id: 'villagersFlee',
    description: `Social can never rise above ${GOLEM_SOCIAL_CAP}: villagers flee. He does not take it personally.`,
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
          ? `${monster.name} bought a plant and no one came, but the walk did him good (social +${social}).`
          : `${monster.name} bought a plant and no one came.`;
    },
  },
  lightningPowered: {
    id: 'lightningPowered',
    description: 'Energy recharges only through the lightning rod.',
    filterNeedChange: (ctx, _m, key, delta) => {
      if (key !== 'energy' || delta <= 0) return delta;
      return ctx.state.house.lightningRod ? delta : 0;
    },
  },
  heavyHanded: {
    id: 'heavyHanded',
    description: `Frequently breaks furniture (comfort -${GOLEM_BREAK_COMFORT} for the whole house).`,
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
        `${monster.name} sat on the ${victim.name} and it did not survive (house comfort -${GOLEM_BREAK_COMFORT}).`,
        { monsterId: monster.id, data: { furniture: victim.id, comfort: -GOLEM_BREAK_COMFORT } },
      );
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
      emit(ctx, 'relationship', `${who} now counts ${monster.name} a friend.`, {
        monsterId: monster.id,
        data: { townie: townie.id, stage },
      });
      break;
    case 'confidant':
      syncAllies(village);
      addSuspicion(ctx, CONFIDANT_SUSPICION);
      emit(ctx, 'relationship', `${who} now keeps the manor's secrets (Suspicion ${CONFIDANT_SUSPICION}).`, {
        monsterId: monster.id,
        data: { townie: townie.id, stage, suspicion: CONFIDANT_SUSPICION },
      });
      break;
    case 'thrall':
      emit(ctx, 'relationship', `${who} is ${monster.name}'s thrall now and runs errands for the manor.`, {
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
        `${who} did not go home. ${fledgling.name} has moved into the crypt and the neighbours have noticed (Suspicion +${TURNED_SUSPICION}).`,
        { monsterId: fledgling.id, data: { townie: townie.id, stage, suspicion: TURNED_SUSPICION } },
      );
      break;
    }
    case 'stranger':
      break;
  }
}

QUIRKS.fledgling = {
  id: 'fledgling',
  description: 'Newly turned: feeds clumsily and is recognised in the village.',
  afterAction: (ctx, monster, action, outcome) => {
    if (action.kind === 'feed' && outcome.data['donor'] === undefined) {
      addSuspicion(ctx, FLEDGLING_FEED_SUSPICION);
      outcome.text += ` Clumsy work (Suspicion +${FLEDGLING_FEED_SUSPICION}).`;
    }
    if (action.kind === 'socialise') {
      addSuspicion(ctx, FLEDGLING_SOCIAL_SUSPICION);
      outcome.text = `${monster.name} went into the village and was recognised (Suspicion +${FLEDGLING_SOCIAL_SUSPICION}).`;
    }
  },
};

export function getQuirk(id: QuirkId): Quirk {
  return QUIRKS[id];
}

export function ignoredNeeds(monster: Monster): Set<NeedKey> {
  const set = new Set<NeedKey>();
  for (const id of monster.quirks) for (const k of getQuirk(id).ignoredNeeds ?? []) set.add(k);
  return set;
}
