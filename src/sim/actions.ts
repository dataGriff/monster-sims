import { addSuspicion, adjustNeed, emit, type Ctx } from './context.ts';
import { brokenFurniture } from './house.ts';
import { getQuirk, type ActionOutcome } from './quirks.ts';
import { chance } from './rng.ts';
import type { Action, ActionKind, Monster } from './types.ts';
import { moodFor, moodRank } from './village.ts';

export const FEED_HUNGER = 50;
export const SLEEP_ENERGY = 40;
export const SLEEP_BLADDER = 50;
export const SOCIAL_GAIN = 30;
export const SOCIAL_FUN = 20;
export const SOCIAL_SUSPICION = 2;
export const COVER_JOB_ENERGY = -10;
export const COVER_JOB_FUN = -10;
export const COVER_JOB_FAIL_SUSPICION = 5;
export const GOSSIP_FAIL_PENALTY = 0.1;
export const ALLY_FAIL_BONUS = 0.05;
export const REPAIR_MAX = 2;
export const REPAIR_COMFORT = 10;
export const REPAIR_FUN = 10;
export const LIE_LOW_SUSPICION = -3;
export const LIE_LOW_COMFORT = 10;
export const LIE_LOW_HUNGER = 5;
export const LIE_LOW_BLADDER = 30;
export const LIE_LOW_FUN = 10;

export const ACTION_LABEL: Record<ActionKind, string> = {
  feed: 'feed',
  sleep: 'sleep',
  socialise: 'socialise',
  coverJob: 'cover job',
  repair: 'repair',
  lieLow: 'lie low',
};

/** Probability that a cover-job shift goes wrong for this monster right now. */
export function coverJobFailChance(ctx: Ctx, monster: Monster): number {
  const village = ctx.state.village;
  let p = monster.coverJob.failChance;
  if (moodRank(moodFor(village.suspicion)) >= moodRank('gossip')) p += GOSSIP_FAIL_PENALTY;
  p -= ALLY_FAIL_BONUS * village.allies.length;
  return Math.max(0, Math.min(1, p));
}

function perform(ctx: Ctx, monster: Monster, action: Action): ActionOutcome {
  const name = monster.name;
  switch (action.kind) {
    case 'feed': {
      const hunger = adjustNeed(ctx, monster, 'hunger', FEED_HUNGER, 'feed');
      return { text: `${name} ate (hunger +${hunger}).`, data: { hunger } };
    }
    case 'sleep': {
      const energy = adjustNeed(ctx, monster, 'energy', SLEEP_ENERGY, 'sleep');
      adjustNeed(ctx, monster, 'bladder', SLEEP_BLADDER, 'sleep');
      const text =
        energy > 0
          ? `${name} slept (energy +${energy}).`
          : `${name} lay still all night but did not recharge.`;
      return { text, data: { energy } };
    }
    case 'socialise': {
      const social = adjustNeed(ctx, monster, 'social', SOCIAL_GAIN, 'socialise');
      const fun = adjustNeed(ctx, monster, 'fun', SOCIAL_FUN, 'socialise');
      addSuspicion(ctx, SOCIAL_SUSPICION);
      const text =
        social > 0
          ? `${name} spent the evening at the inn (social +${social}).`
          : `${name} bought a plant and no one came.`;
      return { text, data: { social, fun, suspicion: SOCIAL_SUSPICION } };
    }
    case 'coverJob': {
      adjustNeed(ctx, monster, 'energy', COVER_JOB_ENERGY, 'coverJob');
      adjustNeed(ctx, monster, 'fun', COVER_JOB_FUN, 'coverJob');
      const failed = chance(ctx.state.rng, coverJobFailChance(ctx, monster));
      if (failed) {
        addSuspicion(ctx, COVER_JOB_FAIL_SUSPICION);
        return {
          text: `${name}'s shift as ${monster.coverJob.title} went badly; people talked (Suspicion +${COVER_JOB_FAIL_SUSPICION}).`,
          data: { success: false, suspicion: COVER_JOB_FAIL_SUSPICION },
        };
      }
      addSuspicion(ctx, -monster.coverJob.relief);
      return {
        text: `${name} worked a quiet shift as ${monster.coverJob.title} (Suspicion -${monster.coverJob.relief}).`,
        data: { success: true, suspicion: -monster.coverJob.relief },
      };
    }
    case 'repair': {
      const house = ctx.state.house;
      const fixed: string[] = [];
      if (!house.lightningRod) {
        house.lightningRod = true;
        fixed.push('lightning rod');
      }
      for (const f of brokenFurniture(house)) {
        if (fixed.length >= REPAIR_MAX) break;
        f.broken = false;
        fixed.push(f.name);
      }
      for (const m of ctx.state.monsters) adjustNeed(ctx, m, 'comfort', REPAIR_COMFORT, 'repair');
      adjustNeed(ctx, monster, 'fun', REPAIR_FUN, 'repair');
      const text =
        fixed.length > 0
          ? `${name} repaired the ${fixed.join(' and the ')} (house comfort +${REPAIR_COMFORT}).`
          : `${name} tidied the house; nothing needed fixing (house comfort +${REPAIR_COMFORT}).`;
      return { text, data: { fixed: fixed.length, comfort: REPAIR_COMFORT } };
    }
    case 'lieLow': {
      addSuspicion(ctx, LIE_LOW_SUSPICION);
      adjustNeed(ctx, monster, 'comfort', LIE_LOW_COMFORT, 'lieLow');
      const hunger = adjustNeed(ctx, monster, 'hunger', LIE_LOW_HUNGER, 'lieLow');
      adjustNeed(ctx, monster, 'bladder', LIE_LOW_BLADDER, 'lieLow');
      adjustNeed(ctx, monster, 'fun', LIE_LOW_FUN, 'lieLow');
      return {
        text: `${name} kept the curtains drawn and lay low (Suspicion ${LIE_LOW_SUSPICION}).`,
        data: { suspicion: LIE_LOW_SUSPICION, hunger },
      };
    }
  }
}

/**
 * Resolve one monster's action: quirks may cancel or replace it first, then the
 * action runs, then quirks may react and rewrite the log text.
 */
export function resolveAction(ctx: Ctx, monster: Monster, requested: Action): void {
  let action: Action | null = requested;
  for (const id of monster.quirks) {
    const hook = getQuirk(id).beforeAction;
    if (!hook || action === null) continue;
    const result = hook(ctx, monster, action);
    if (result !== undefined) action = result;
  }
  if (action === null) return;

  const outcome = perform(ctx, monster, action);
  for (const id of monster.quirks) getQuirk(id).afterAction?.(ctx, monster, action, outcome);

  emit(ctx, 'action', outcome.text, {
    monsterId: monster.id,
    data: { action: action.kind, slot: action.slot, ...outcome.data },
  });
}
