import { resolveAction } from './actions.ts';
import { addSuspicion, adjustNeed, emit, type Ctx } from './context.ts';
import { breakRoom, createHouse, roomName } from './house.ts';
import { createMonsters } from './monsters.ts';
import { SATISFACTION_KEYS, clamp } from './needs.ts';
import { DEFAULT_PLAN, planForNight } from './plan.ts';
import { getQuirk, ignoredNeeds } from './quirks.ts';
import { chance, createRng, pick } from './rng.ts';
import type { GameState, Monster, NightPlan, Plan, RoomId } from './types.ts';
import {
  ANGRY_HOUSE_LEVEL,
  ANGRY_HOUSE_SUSPICION,
  BASELINE_SUSPICION,
  MOOD_TEXT,
  MOB_ATTACK_CHANCE,
  NIGHTLY_RUMOUR,
  QUIET_NIGHT_DRIFT,
  SNOOPING_SUSPICION,
  THRESHOLDS,
  createVillage,
  moodFor,
  moodRank,
} from './village.ts';

export const DAY_SLEEP_ENERGY = 30;
export const DAY_SLEEP_BLADDER = 40;
export const LOW_NEED = 20;
export const ANGER_RISE = 10;
export const ANGER_FALL = 5;
export const MOB_COMFORT = 15;
export const MOB_ANGER = 10;

export interface GameOptions {
  seed: number;
  nightsToSurvive?: number;
  suspicion?: number;
}

export function createGame(options: GameOptions): GameState {
  return {
    night: 0,
    nightsToSurvive: options.nightsToSurvive ?? 7,
    rng: createRng(options.seed),
    monsters: createMonsters(),
    house: createHouse(),
    village: createVillage(options.suspicion),
    pendingSuspicion: 0,
    noise: 0,
    log: [],
    status: 'running',
  };
}

function quirkHooks(monster: Monster) {
  return monster.quirks.map((id) => getQuirk(id));
}

/** Dusk: advance the night counter and queue everyone's action from the plan. */
export function dusk(state: GameState, plan: NightPlan): void {
  state.night += 1;
  state.pendingSuspicion = 0;
  state.noise = 0;
  const ctx: Ctx = { state, phase: 'dusk' };

  const parts: string[] = [];
  for (const m of state.monsters) {
    m.assignedAction = plan.night[m.id] ?? null;
    m.assignedDayAction = plan.day?.[m.id] ?? null;
    parts.push(`${m.name}: ${m.assignedAction ?? 'idle'}`);
  }
  emit(ctx, 'dusk', `Dusk falls on night ${state.night}. Plans: ${parts.join(', ')}.`);

  for (const m of state.monsters) for (const q of quirkHooks(m)) q.onDusk?.(ctx, m);
}

/** Night: resolve every queued action in household order, then night-time quirks. */
export function night(state: GameState): void {
  const ctx: Ctx = { state, phase: 'night' };
  for (const m of state.monsters) {
    if (m.assignedAction === null) {
      emit(ctx, 'idle', `${m.name} did nothing in particular.`, { monsterId: m.id });
      continue;
    }
    resolveAction(ctx, m, { monsterId: m.id, kind: m.assignedAction, slot: 'night' });
  }
  for (const m of state.monsters) for (const q of quirkHooks(m)) q.onNight?.(ctx, m);
}

function applyDecay(ctx: Ctx, monster: Monster): void {
  const ignored = ignoredNeeds(monster);
  for (const key of SATISFACTION_KEYS) {
    const amount = monster.decay[key];
    if (!amount) continue;
    const before = monster.needs[key];
    adjustNeed(ctx, monster, key, -amount, 'decay');
    if (!ignored.has(key) && before >= LOW_NEED && monster.needs[key] < LOW_NEED) {
      emit(ctx, 'needCritical', `${monster.name}'s ${key} has become critical (${monster.needs[key]}).`, {
        monsterId: monster.id,
        data: { need: key, value: monster.needs[key] },
      });
    }
  }
}

function updateAnger(ctx: Ctx, monster: Monster): void {
  const ignored = ignoredNeeds(monster);
  const low = SATISFACTION_KEYS.filter((k) => !ignored.has(k) && monster.needs[k] < LOW_NEED);
  if (low.length > 0) {
    const applied = adjustNeed(ctx, monster, 'anger', ANGER_RISE, 'decay');
    if (applied > 0) {
      emit(ctx, 'anger', `${monster.name} is fuming about ${low.join(' and ')} (anger +${applied}).`, {
        monsterId: monster.id,
        data: { anger: monster.needs.anger, causes: low.join(',') },
      });
    }
  } else {
    adjustNeed(ctx, monster, 'anger', -ANGER_FALL, 'decay');
  }
}

function laidLowTonight(state: GameState): boolean {
  return state.log.some(
    (e) => e.night === state.night && e.kind === 'action' && e.data?.['action'] === 'lieLow',
  );
}

/** Dawn: decay needs, update anger, settle the night's Suspicion, check for game over. */
export function dawn(state: GameState): void {
  const ctx: Ctx = { state, phase: 'dawn' };
  for (const m of state.monsters) {
    applyDecay(ctx, m);
    updateAnger(ctx, m);
  }
  for (const m of state.monsters) for (const q of quirkHooks(m)) q.onDawn?.(ctx, m);

  const total = state.monsters.reduce((sum, m) => sum + m.needs.anger, 0);
  state.house.householdAnger = Math.round(total / Math.max(1, state.monsters.length));

  const village = state.village;
  const before = village.suspicion;
  const moodBefore = moodFor(before);
  if (moodRank(moodBefore) >= moodRank('snooping') && !laidLowTonight(state)) {
    addSuspicion(ctx, SNOOPING_SUSPICION);
    emit(ctx, 'snooping', `Van Helsing snooped around the grounds and nobody was lying low (Suspicion +${SNOOPING_SUSPICION}).`, {
      data: { suspicion: SNOOPING_SUSPICION },
    });
  }
  if (state.house.householdAnger >= ANGRY_HOUSE_LEVEL) {
    addSuspicion(ctx, ANGRY_HOUSE_SUSPICION);
    emit(ctx, 'angryHouse', `Shouting from the manor carried across the valley (Suspicion +${ANGRY_HOUSE_SUSPICION}).`, {
      data: { suspicion: ANGRY_HOUSE_SUSPICION, householdAnger: state.house.householdAnger },
    });
  }

  if (state.noise > 0) {
    state.pendingSuspicion += NIGHTLY_RUMOUR;
    emit(ctx, 'rumour', `The village had something to talk about (Suspicion +${NIGHTLY_RUMOUR}).`, {
      data: { suspicion: NIGHTLY_RUMOUR, noise: state.noise },
    });
  } else {
    const gap = BASELINE_SUSPICION - before;
    const drift = Math.sign(gap) * Math.min(QUIET_NIGHT_DRIFT, Math.abs(gap));
    if (drift !== 0) {
      state.pendingSuspicion += drift;
      const text =
        drift < 0
          ? `A quiet night. The village forgets a little (Suspicion ${drift}).`
          : `A quiet night, but a house of strangers is never quite trusted (Suspicion +${drift}).`;
      emit(ctx, 'quietNight', text, { data: { suspicion: drift } });
    }
  }

  const after = clamp(before + state.pendingSuspicion);
  village.suspicion = after;
  state.pendingSuspicion = 0;
  emit(ctx, 'suspicion', `Suspicion ${before} -> ${after}.`, { data: { before, after, delta: after - before } });

  const moodAfter = moodFor(after);
  if (moodRank(moodAfter) > moodRank(moodBefore) && moodAfter !== 'mobAtDoor') {
    emit(ctx, 'villageMood', MOOD_TEXT[moodAfter], { data: { mood: moodAfter } });
  } else if (moodRank(moodAfter) < moodRank(moodBefore)) {
    emit(ctx, 'villageMood', 'The village calms down a little.', { data: { mood: moodAfter } });
  }

  if (after >= THRESHOLDS.mobAtDoor) {
    state.status = 'lost';
    emit(ctx, 'gameOver', 'The mob is at the door. Monster Manor has fallen.', { data: { outcome: 'lost' } });
    emitSummary(ctx);
  }
}

/** One closing event with the numbers a results screen needs. */
function emitSummary(ctx: Ctx): void {
  const { state } = ctx;
  const broken = state.house.furniture.filter((f) => f.broken).length;
  const allies = state.village.allies;
  const outcome = state.status === 'won' ? 'survived' : 'fell';
  const allyText = allies.length > 0 ? ` Allies: ${allies.join(', ')}.` : ' No allies.';
  emit(
    ctx,
    'summary',
    `Run over: the household ${outcome} after ${state.night} night${state.night === 1 ? '' : 's'}. Final Suspicion ${state.village.suspicion}, household anger ${state.house.householdAnger}, ${broken} broken furnishing${broken === 1 ? '' : 's'}.${allyText}`,
    {
      data: {
        outcome: state.status,
        nights: state.night,
        suspicion: state.village.suspicion,
        householdAnger: state.house.householdAnger,
        brokenFurniture: broken,
        allies: allies.length,
      },
    },
  );
}

function daySleep(ctx: Ctx, monster: Monster): void {
  for (const q of quirkHooks(monster)) {
    if (q.onDay?.(ctx, monster)) return;
  }
  const energy = adjustNeed(ctx, monster, 'energy', DAY_SLEEP_ENERGY, 'daySleep');
  adjustNeed(ctx, monster, 'bladder', DAY_SLEEP_BLADDER, 'daySleep');
  const text =
    energy > 0
      ? `${monster.name} slept through the day (energy +${energy}).`
      : `${monster.name} lay dormant through the day and did not recharge.`;
  emit(ctx, 'daySleep', text, { monsterId: monster.id, data: { energy } });
}

/** Day: everyone sleeps (unless they can act in daylight); a gathered mob may attack. */
export function day(state: GameState): void {
  if (state.status !== 'running') return;
  const ctx: Ctx = { state, phase: 'day' };

  for (const m of state.monsters) {
    if (m.assignedDayAction !== null && m.daylightActive) {
      resolveAction(ctx, m, { monsterId: m.id, kind: m.assignedDayAction, slot: 'day' });
      continue;
    }
    if (m.assignedDayAction !== null) {
      emit(ctx, 'daylightRefused', `${m.name} cannot act in daylight; the ${m.assignedDayAction} will have to wait.`, {
        monsterId: m.id,
        data: { action: m.assignedDayAction },
      });
    }
    daySleep(ctx, m);
  }

  if (state.village.suspicion >= THRESHOLDS.mob && chance(state.rng, MOB_ATTACK_CHANCE)) {
    const room = pick(state.rng, state.house.rooms).id as RoomId;
    const broken = breakRoom(state.house, room);
    for (const m of state.monsters) {
      adjustNeed(ctx, m, 'comfort', -MOB_COMFORT, 'mob');
      adjustNeed(ctx, m, 'anger', MOB_ANGER, 'mob');
    }
    const damage = broken.length > 0 ? ` They smashed the ${broken.join(', the ')}.` : '';
    emit(ctx, 'mobAttack', `The mob stormed ${roomName(state.house, room)} while the house slept.${damage}`, {
      data: { room, broken: broken.length },
    });
  }

  if (state.night >= state.nightsToSurvive) {
    state.status = 'won';
    emit(ctx, 'victory', `Night ${state.night} has passed. The household survived. The village, for now, believes nothing.`, {
      data: { outcome: 'won' },
    });
    emitSummary(ctx);
  }
}

/** One full cycle: dusk -> night -> dawn -> day. Returns the events of that night. */
export function runNight(state: GameState, plan: NightPlan): readonly import('./types.ts').Event[] {
  if (state.status !== 'running') return [];
  const start = state.log.length;
  dusk(state, plan);
  night(state);
  dawn(state);
  day(state);
  return state.log.slice(start);
}

/** Play until the run is won or lost. */
export function runGame(state: GameState, plan: Plan = DEFAULT_PLAN): GameState {
  while (state.status === 'running') {
    runNight(state, planForNight(plan, state.night + 1));
  }
  return state;
}

/** Convenience: fresh game from a seed, played to the end. */
export function play(seed: number, plan: Plan = DEFAULT_PLAN, options: Omit<GameOptions, 'seed'> = {}): GameState {
  return runGame(createGame({ seed, ...options }), plan);
}
