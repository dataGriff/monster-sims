import { addSuspicion, adjustNeed, emit, isFullMoon, type Ctx, type NeedSource } from './context.ts';
import { breakFurniture, breakRoom } from './house.ts';
import { chance, pick } from './rng.ts';
import type { Action, Monster, NeedKey, QuirkId } from './types.ts';

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

export const VILLAGERS = [
  'the baker',
  'the miller',
  'the innkeeper',
  'the schoolmistress',
  'the blacksmith',
  'the ferryman',
  'the apothecary',
] as const;

export const CHARM_RECRUIT = 25;
export const CHARM_SUSPICION = 5;
export const FEED_SUSPICION_COUNT = 3;
export const DAYLIGHT_DRAIN = 15;
export const FULL_MOON_SUSPICION = 15;
export const FULL_MOON_SHIFT_DISASTER = 10;
export const GOLEM_SOCIAL_CAP = 20;
export const GOLEM_BREAK_CHANCE = 0.4;
export const GOLEM_BREAK_COMFORT = 10;

const QUIRKS: Record<QuirkId, Quirk> = {
  nocturnalFeeder: {
    id: 'nocturnalFeeder',
    description: 'Hunger only fills from "feed" at night; every other source is ignored.',
    filterNeedChange: (_ctx, _m, key, delta, source) =>
      key === 'hunger' && delta > 0 && source !== 'feed' ? 0 : delta,
    afterAction: (ctx, monster, action, outcome) => {
      if (action.kind !== 'feed') return;
      addSuspicion(ctx, FEED_SUSPICION_COUNT);
      outcome.text = `${monster.name} went out to feed; a villager woke up pale.`;
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
    description: 'Socialising charms a villager: +recruit progress, +Suspicion.',
    afterAction: (ctx, monster, action, outcome) => {
      if (action.kind !== 'socialise') return;
      const villager = pick(ctx.state.rng, VILLAGERS);
      const village = ctx.state.village;
      village.recruitProgress = Math.min(100, village.recruitProgress + CHARM_RECRUIT);
      addSuspicion(ctx, CHARM_SUSPICION);
      outcome.text = `${monster.name} charmed ${villager}.`;
      outcome.data['recruitProgress'] = village.recruitProgress;
      outcome.data['suspicion'] = CHARM_SUSPICION;
      if (village.recruitProgress >= 100) {
        village.recruitProgress = 0;
        village.allies.push(villager);
        addSuspicion(ctx, -10);
        const who = villager.charAt(0).toUpperCase() + villager.slice(1);
        emit(ctx, 'recruited', `${who} now keeps the manor's secrets (Suspicion -10).`, {
          monsterId: monster.id,
          data: { ally: villager },
        });
      }
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

export function getQuirk(id: QuirkId): Quirk {
  return QUIRKS[id];
}

export function ignoredNeeds(monster: Monster): Set<NeedKey> {
  const set = new Set<NeedKey>();
  for (const id of monster.quirks) for (const k of getQuirk(id).ignoredNeeds ?? []) set.add(k);
  return set;
}
