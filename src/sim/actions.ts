import { addSuspicion, adjustNeed, emit, type Ctx } from './context.ts';
import { JOB_PAY } from './build.ts';
import { brokenFurniture, lightRoom } from './house.ts';
import { artefacts, curse, getQuirk, onStageReached, type ActionOutcome } from './quirks.ts';
import { chance, pick } from './rng.ts';
import { SOCIAL_BOND, SOCIAL_BOND_CAP, advanceBond, townieAbroad } from './townies.ts';
import type { Action, ActionKind, Monster, RoomId } from './types.ts';
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
export const PROMOTION_STREAK = 3;
export const PROMOTION_RELIEF = 2;
export const MAX_LEVEL = 3;
export const HEAT_ON_FAIL = 15;
export const HEAT_ON_SUCCESS = -5;
export const HEAT_QUESTIONS = 50;
export const HEAT_QUESTIONS_PENALTY = 0.1;
export const HEAT_SACKED = 100;
export const CLASH_PENALTY = 0.15;
export const CLASH_ENERGY = -10;
export const NO_JOB_FUN = -5;
const LEVEL_TITLES = ['', '', 'senior ', 'head '];
export const REPAIR_MAX = 2;
export const REPAIR_COMFORT = 10;
export const REPAIR_FUN = 10;
export const LIE_LOW_SUSPICION = -3;
export const LIE_LOW_COMFORT = 10;
export const LIE_LOW_HUNGER = 5;
export const LIE_LOW_BLADDER = 30;
export const LIE_LOW_FUN = 10;
/** Group action: only works when the house is calm. */
export const GAME_NIGHT_MAX_ANGER = 25;
export const GAME_NIGHT_FUN = 25;
export const GAME_NIGHT_SOCIAL = 15;
export const GAME_NIGHT_ANGER = -10;
export const BICKER_FUN = -5;
export const BICKER_ANGER = 5;
export const SOLITAIRE_FUN = 5;

export const ACTION_LABEL: Record<ActionKind, string> = {
  feed: 'feed',
  sleep: 'sleep',
  socialise: 'socialise',
  coverJob: 'cover job',
  repair: 'repair',
  lieLow: 'lie low',
  gameNight: 'game night',
};

/** Which room an action lights up at night, if any. Lit windows raise exposure. */
export function actionRoom(monster: Monster, kind: ActionKind): RoomId | null {
  switch (kind) {
    case 'feed':
      return monster.quirks.some((q) => q === 'nocturnalFeeder' || q === 'freshwater' || q === 'nightRoad' || q === 'wildHunt')
        ? null
        : 'kitchen';
    case 'sleep':
      return monster.bedroom;
    case 'repair':
      return 'workshop';
    case 'gameNight':
      return 'parlour';
    case 'socialise':
    case 'coverJob':
    case 'lieLow':
      return null;
  }
}

/** Probability that a cover-job shift goes wrong for this monster right now. */
export function coverJobFailChance(ctx: Ctx, monster: Monster, slot: 'night' | 'day' = 'night'): number {
  const village = ctx.state.village;
  let p = monster.coverJob.failChance;
  if (moodRank(moodFor(village.suspicion)) >= moodRank('gossip')) p += GOSSIP_FAIL_PENALTY;
  if (monster.coverJob.heat >= HEAT_QUESTIONS) p += HEAT_QUESTIONS_PENALTY;
  if (slot === 'day' && monster.assignedAction === 'coverJob') p += CLASH_PENALTY;
  p -= ALLY_FAIL_BONUS * village.allies.length;
  return Math.max(0, Math.min(1, p));
}

export function jobTitle(monster: Monster): string {
  return `${LEVEL_TITLES[monster.coverJob.level] ?? ''}${monster.coverJob.title}`;
}

function perform(ctx: Ctx, monster: Monster, action: Action): ActionOutcome {
  const name = monster.name;
  switch (action.kind) {
    case 'feed': {
      const hunger = adjustNeed(ctx, monster, 'hunger', FEED_HUNGER, 'feed');
      return { text: `${name} ate (hunger +${hunger}).`, data: { hunger } };
    }
    case 'sleep': {
      const bed = ctx.state.house.furniture.find((f) => f.id === monster.bed);
      const bedBroken = !bed || bed.broken;
      const energy = adjustNeed(ctx, monster, 'energy', bedBroken ? SLEEP_ENERGY / 2 : SLEEP_ENERGY, 'sleep');
      adjustNeed(ctx, monster, 'bladder', SLEEP_BLADDER, 'sleep');
      const where = bedBroken ? ' on the floor, the bed being in pieces,' : '';
      const text =
        energy > 0
          ? `${name} slept${where} (energy +${energy}).`
          : `${name} lay still all night but did not recharge${ctx.state.house.lightningRod ? '' : '; the lightning rod is down'}.`;
      return { text, data: { energy, bedBroken } };
    }
    case 'socialise': {
      const social = adjustNeed(ctx, monster, 'social', SOCIAL_GAIN, 'socialise');
      const fun = adjustNeed(ctx, monster, 'fun', SOCIAL_FUN, 'socialise');
      addSuspicion(ctx, SOCIAL_SUSPICION);
      const outcome: ActionOutcome = {
        text: social > 0 ? `${name} spent the evening at the inn (social +${social}).` : `${name} went out and nobody would talk to him.`,
        data: { social, fun, suspicion: SOCIAL_SUSPICION },
      };
      if (social > 0 && !monster.quirks.includes('charm')) {
        const abroad = townieAbroad(ctx.state.village, 'night');
        if (abroad.length > 0) {
          const met = pick(ctx.state.rng, abroad);
          const reached = advanceBond(met, SOCIAL_BOND, SOCIAL_BOND_CAP);
          outcome.text = `${name} spent the evening at the inn with ${met.name} (social +${social}).`;
          outcome.data['townie'] = met.id;
          if (reached) onStageReached(ctx, monster, met, reached);
        }
      }
      return outcome;
    }
    case 'coverJob': {
      const job = monster.coverJob;
      if (!job.employed) {
        const fun = adjustNeed(ctx, monster, 'fun', NO_JOB_FUN, 'coverJob');
        return { text: `${name} has no job to go to any more and sat in the kitchen (fun ${fun}).`, data: { success: false, unemployed: true } };
      }
      adjustNeed(ctx, monster, 'energy', COVER_JOB_ENERGY, 'coverJob');
      adjustNeed(ctx, monster, 'fun', COVER_JOB_FUN, 'coverJob');
      const clash = action.slot === 'day' && monster.assignedAction === 'coverJob';
      if (clash) adjustNeed(ctx, monster, 'energy', CLASH_ENERGY, 'coverJob');
      const clashNote = clash ? ' Two shifts in one turn of the clock took it out of him.' : '';
      const failed = chance(ctx.state.rng, coverJobFailChance(ctx, monster, action.slot));
      if (failed) {
        job.streak = 0;
        job.heat = Math.min(HEAT_SACKED, job.heat + HEAT_ON_FAIL);
        addSuspicion(ctx, COVER_JOB_FAIL_SUSPICION);
        let text = `${name}'s shift as ${jobTitle(monster)} went badly; people talked (Suspicion +${COVER_JOB_FAIL_SUSPICION}).${clashNote}`;
        if (job.heat >= HEAT_SACKED) {
          job.employed = false;
          text += ` The employer has had enough: ${name} is sacked.`;
        } else if (job.heat >= HEAT_QUESTIONS) {
          text += ' The employer is starting to ask questions.';
        }
        return { text, data: { success: false, suspicion: COVER_JOB_FAIL_SUSPICION, heat: job.heat, sacked: !job.employed } };
      }
      addSuspicion(ctx, -job.relief);
      ctx.state.house.coin += JOB_PAY;
      job.heat = Math.max(0, job.heat + HEAT_ON_SUCCESS);
      job.streak += 1;
      let text = `${name} worked a quiet shift as ${jobTitle(monster)} (Suspicion -${job.relief}, +${JOB_PAY} coin).${clashNote}`;
      let promoted = false;
      if (job.streak >= PROMOTION_STREAK && job.level < MAX_LEVEL) {
        job.level += 1;
        job.relief += PROMOTION_RELIEF;
        job.streak = 0;
        promoted = true;
        text += ` Promoted: ${name} is now ${jobTitle(monster)} (relief ${job.relief}).`;
      }
      return { text, data: { success: true, suspicion: -job.relief, coin: JOB_PAY, promoted, level: job.level } };
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
      const relics = artefacts(ctx);
      const relic = relics[0];
      if (relic && !monster.quirks.includes('hoarder')) curse(ctx, monster, relic.name, 'moved');
      const text =
        fixed.length > 0
          ? `${name} repaired the ${fixed.join(' and the ')} (house comfort +${REPAIR_COMFORT}).`
          : `${name} tidied the house; nothing needed fixing (house comfort +${REPAIR_COMFORT}).`;
      return { text, data: { fixed: fixed.length, comfort: REPAIR_COMFORT } };
    }
    case 'gameNight': {
      const players = ctx.state.monsters.filter((m) => m.assignedAction === 'gameNight');
      if (players.length < 2) {
        const fun = adjustNeed(ctx, monster, 'fun', SOLITAIRE_FUN, 'gameNight');
        return { text: `${name} laid out a game for one and played patience (fun +${fun}).`, data: { fun, players: 1 } };
      }
      if (ctx.state.house.householdAnger >= GAME_NIGHT_MAX_ANGER) {
        const fun = adjustNeed(ctx, monster, 'fun', BICKER_FUN, 'gameNight');
        const anger = adjustNeed(ctx, monster, 'anger', BICKER_ANGER, 'gameNight');
        return {
          text: `${name} tried to start a game but everyone was too cross to play (fun ${fun}, anger +${anger}).`,
          data: { fun, anger, players: players.length, bickered: true },
        };
      }
      const fun = adjustNeed(ctx, monster, 'fun', GAME_NIGHT_FUN, 'gameNight');
      const social = adjustNeed(ctx, monster, 'social', GAME_NIGHT_SOCIAL, 'gameNight');
      const anger = adjustNeed(ctx, monster, 'anger', GAME_NIGHT_ANGER, 'gameNight');
      const first = players[0]?.id === monster.id;
      const text = first
        ? `${name} dealt cards in the parlour for the household (fun +${fun}, social +${social}, anger ${anger}).`
        : `${name} joined the game (fun +${fun}, social +${social}, anger ${anger}).`;
      return { text, data: { fun, social, anger, players: players.length } };
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

  if (action.slot === 'night') {
    const room = actionRoom(monster, action.kind);
    if (room) lightRoom(ctx.state.house, room);
  }
  const outcome = perform(ctx, monster, action);
  for (const id of monster.quirks) getQuirk(id).afterAction?.(ctx, monster, action, outcome);

  emit(ctx, 'action', outcome.text, {
    monsterId: monster.id,
    data: { action: action.kind, slot: action.slot, ...outcome.data },
  });
}
