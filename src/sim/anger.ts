/**
 * The shared Household Anger meter (MM-15): the mean anger of the residents.
 * Low anger unlocks the group action (see `gameNight` in actions.ts); high
 * anger triggers fights, rogue nights and, at the top, someone moving out.
 */
import { addSuspicion, adjustNeed, emit, type Ctx } from './context.ts';
import { breakFurniture } from './house.ts';
import { chance, pick } from './rng.ts';
import type { GameState, Monster } from './types.ts';

export const FIGHT_ANGER = 60;
export const FIGHT_CHANCE = 0.5;
export const FIGHT_COMFORT = -10;
export const FIGHT_FUN = -10;
export const FIGHT_ANGER_RISE = 5;
export const FIGHT_SUSPICION = 3;
export const ROGUE_ANGER = 80;
export const ROGUE_CHANCE = 0.5;
export const ROGUE_SUSPICION = 8;
export const ROGUE_FUN = 20;
export const ROGUE_ANGER_RELIEF = -15;
export const MOVE_OUT_ANGER = 90;

export function recomputeHouseholdAnger(state: GameState): number {
  const total = state.monsters.reduce((sum, m) => sum + m.needs.anger, 0);
  state.house.householdAnger = state.monsters.length === 0 ? 0 : Math.round(total / state.monsters.length);
  return state.house.householdAnger;
}

/** Dusk: a furious house may send someone off-plan and out on the town. */
export function maybeRogueNight(ctx: Ctx): void {
  const { state } = ctx;
  if (state.house.householdAnger < ROGUE_ANGER) return;
  const candidates = state.monsters.filter((m) => m.assignedAction !== null);
  if (candidates.length === 0 || !chance(state.rng, ROGUE_CHANCE)) return;
  const rogue = pick(state.rng, candidates);
  const lost = rogue.assignedAction;
  rogue.assignedAction = null;
  const fun = adjustNeed(ctx, rogue, 'fun', ROGUE_FUN, 'quirk');
  const anger = adjustNeed(ctx, rogue, 'anger', ROGUE_ANGER_RELIEF, 'quirk');
  addSuspicion(ctx, ROGUE_SUSPICION);
  emit(
    ctx,
    'rogue',
    `${rogue.name} ignored the plan and went out on the town to cool off (fun +${fun}, anger ${anger}, Suspicion +${ROGUE_SUSPICION}).`,
    { monsterId: rogue.id, data: { lostAction: lost ?? 'idle', suspicion: ROGUE_SUSPICION } },
  );
}

/** Night: an angry house fights, and the village hears it. */
export function maybeFight(ctx: Ctx): void {
  const { state } = ctx;
  if (state.house.householdAnger < FIGHT_ANGER || state.monsters.length < 2) return;
  if (!chance(state.rng, FIGHT_CHANCE)) return;
  const a = pick(state.rng, state.monsters);
  const b = pick(
    state.rng,
    state.monsters.filter((m) => m.id !== a.id),
  );
  for (const m of [a, b]) {
    adjustNeed(ctx, m, 'comfort', FIGHT_COMFORT, 'house');
    adjustNeed(ctx, m, 'fun', FIGHT_FUN, 'house');
    adjustNeed(ctx, m, 'anger', FIGHT_ANGER_RISE, 'house');
  }
  const intact = state.house.furniture.filter((f) => !f.broken);
  let wreck = '';
  if (intact.length > 0) {
    const victim = pick(state.rng, intact);
    breakFurniture(state.house, victim.id);
    wreck = ` The ${victim.name} did not survive it.`;
  }
  addSuspicion(ctx, FIGHT_SUSPICION);
  emit(ctx, 'fight', `${a.name} and ${b.name} had a shouting match that carried to the lane.${wreck} (Suspicion +${FIGHT_SUSPICION})`, {
    data: { a: a.id, b: b.id, suspicion: FIGHT_SUSPICION },
  });
}

/** Dawn: anyone at the end of their tether packs a bag. Returns who left. */
export function moveOuts(ctx: Ctx): Monster[] {
  const { state } = ctx;
  const leaving = state.monsters.filter((m) => m.needs.anger >= MOVE_OUT_ANGER);
  for (const m of leaving) {
    state.monsters = state.monsters.filter((x) => x.id !== m.id);
    state.departed.push(m.id);
    emit(ctx, 'moveOut', `${m.name} has had enough and moved out before sunrise.`, { monsterId: m.id, data: { anger: m.needs.anger } });
  }
  if (leaving.length > 0 && state.monsters.length === 0) {
    state.status = 'lost';
    emit(ctx, 'gameOver', 'The manor stands empty. There is nobody left to suspect.', { data: { outcome: 'lost', reason: 'empty' } });
  }
  return leaving;
}
