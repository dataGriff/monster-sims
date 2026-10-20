import { resolveAction } from './actions.ts';
import { maybeFight, maybeRogueNight, moveOuts, recomputeHouseholdAnger } from './anger.ts';
import { applyBuild } from './build.ts';
import { addSuspicion, adjustNeed, emit, type Ctx } from './context.ts';
import { createHouse, dousedLights, litWindowedRooms, mostExposedRoom } from './house.ts';
import { mobAtTheDoor, mobByDay } from './mob.ts';
import { createMonsters } from './monsters.ts';
import { SATISFACTION_KEYS, clamp } from './needs.ts';
import { DEFAULT_PLAN, planForNight } from './plan.ts';
import { getQuirk, ignoredNeeds } from './quirks.ts';
import { createRng } from './rng.ts';
import {
  AWARENESS_FORGET,
  GOSSIP_SPREAD,
  HUNTER_ID,
  OUTSPOKEN_AT,
  OUTSPOKEN_SUSPICION,
  createHunter,
  hunter,
  isAlly,
} from './townies.ts';
import type { GameOptions, GameState, Monster, NightPlan, Plan } from './types.ts';
import {
  ANGRY_HOUSE_LEVEL,
  ANGRY_HOUSE_SUSPICION,
  BASELINE_SUSPICION,
  HUNTER_LEAVES_BELOW,
  MOOD_TEXT,
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
export const LIGHT_SUSPICION = 1;
export const THRALL_SUSPICION = -1;

export type { GameOptions };

export function createGame(options: GameOptions): GameState {
  return {
    options: { ...options },
    planHistory: [],
    taken: [],
    night: 0,
    nightsToSurvive: options.nightsToSurvive ?? 7,
    rng: createRng(options.seed),
    monsters: createMonsters(),
    house: createHouse(),
    village: createVillage(options.suspicion),
    pendingSuspicion: 0,
    noise: 0,
    departed: [],
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
  dousedLights(state.house);
  const ctx: Ctx = { state, phase: 'dusk' };

  const parts: string[] = [];
  const ids = new Set(state.monsters.map((m) => m.id));
  for (const m of state.monsters) {
    m.assignedAction = plan.night[m.id] ?? null;
    m.assignedDayAction = plan.day?.[m.id] ?? null;
    parts.push(`${m.name}: ${m.assignedAction ?? 'idle'}`);
  }
  emit(ctx, 'dusk', `Dusk falls on night ${state.night}. Plans: ${parts.join(', ')}.`);
  for (const id of [...Object.keys(plan.night), ...Object.keys(plan.day ?? {})]) {
    if (!ids.has(id)) emit(ctx, 'planIgnored', `Nobody called "${id}" lives here; that assignment was ignored.`, { data: { monster: id } });
  }

  state.planHistory.push(structuredClone(plan));
  applyBuild(ctx, plan.build);
  for (const m of state.monsters) for (const q of quirkHooks(m)) q.onDusk?.(ctx, m);
  maybeRogueNight(ctx);
}

/** Night: resolve every queued action in household order, then night-time quirks. */
export function night(state: GameState): void {
  const ctx: Ctx = { state, phase: 'night' };
  // Snapshot: a turning can add a resident mid-night, and they act from tomorrow.
  const residents = state.monsters.slice();
  for (const m of residents) {
    if (m.assignedAction === null) {
      emit(ctx, 'idle', `${m.name} did nothing in particular.`, { monsterId: m.id });
      continue;
    }
    resolveAction(ctx, m, { monsterId: m.id, kind: m.assignedAction, slot: 'night' });
  }
  for (const m of state.monsters) for (const q of quirkHooks(m)) q.onNight?.(ctx, m);
  maybeFight(ctx);
}

/** Dawn: the village compares notes. Awareness spreads along fences and the outspoken add Suspicion. */
function villageTalks(ctx: Ctx): void {
  const { state } = ctx;
  const village = state.village;
  if (state.noise === 0) {
    for (const t of village.townies) t.awareness = Math.max(0, t.awareness - AWARENESS_FORGET);
  }
  const spreading = moodRank(moodFor(village.suspicion)) >= moodRank('gossip');
  const loud = village.townies.filter((t) => t.awareness >= OUTSPOKEN_AT && !isAlly(t) && t.relationship !== 'turned');
  if (spreading) {
    for (const t of loud) {
      for (const id of t.neighbours) {
        const n = village.townies.find((x) => x.id === id);
        if (n && !isAlly(n) && n.relationship !== 'turned') n.awareness = Math.min(100, n.awareness + GOSSIP_SPREAD);
      }
    }
    if (loud.length > 0) {
      emit(ctx, 'gossip', `${loud.map((t) => t.name).join(' and ')} talked over the fence and the neighbours listened.`, {
        data: { spreaders: loud.length },
      });
    }
  }
  for (const t of village.townies) {
    if (t.awareness >= OUTSPOKEN_AT && !t.outspoken && !isAlly(t) && t.relationship !== 'turned') {
      t.outspoken = true;
      state.pendingSuspicion += OUTSPOKEN_SUSPICION;
      const who = t.name.charAt(0).toUpperCase() + t.name.slice(1);
      emit(ctx, 'outspoken', `${who} is now saying out loud that something is wrong at the manor (Suspicion +${OUTSPOKEN_SUSPICION}).`, {
        data: { townie: t.id, suspicion: OUTSPOKEN_SUSPICION },
      });
    }
  }
  const thralls = village.townies.filter((t) => t.relationship === 'thrall');
  if (thralls.length > 0) {
    const relief = THRALL_SUSPICION * thralls.length;
    state.pendingSuspicion += relief;
    emit(ctx, 'thralls', `${thralls.map((t) => t.name).join(' and ')} quietly talked the rumours down (Suspicion ${relief}).`, {
      data: { thralls: thralls.length, suspicion: relief },
    });
  }
  const lit = litWindowedRooms(state.house);
  if (lit.length > 0) {
    const delta = LIGHT_SUSPICION * lit.length;
    state.pendingSuspicion += delta;
    emit(ctx, 'lightsSeen', `Lamplight showed in ${lit.map((r) => r.name).join(' and ')} (Suspicion +${delta}).`, {
      data: { rooms: lit.length, suspicion: delta },
    });
  }
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

function metTonight(state: GameState, townieId: string): boolean {
  return state.log.some(
    (e) => e.night === state.night && e.kind === 'action' && e.data?.['townie'] === townieId,
  );
}

/** Van Helsing (MM-18): arrives at 70, snoops the most exposed room each dawn, leaves below 50. */
function hunterAtDawn(ctx: Ctx, highEnough: boolean): void {
  const { state } = ctx;
  const village = state.village;
  let vh = hunter(village);
  if (!vh && highEnough) {
    vh = createHunter();
    village.townies.push(vh);
    village.hunterPresent = true;
    emit(ctx, 'hunterArrives', 'Van Helsing has taken a room at the inn and is asking questions.', { data: { townie: HUNTER_ID } });
  }
  if (!vh) return;
  if (vh.relationship === 'turned') return;
  if (!highEnough && village.suspicion < HUNTER_LEAVES_BELOW && !isAlly(vh)) {
    village.townies = village.townies.filter((t) => t.id !== vh.id);
    village.hunterPresent = false;
    emit(ctx, 'hunterLeaves', 'Van Helsing settled his bill at the inn and left on the morning coach.', { data: { townie: HUNTER_ID } });
    return;
  }
  if (isAlly(vh)) return;
  if (metTonight(state, vh.id)) {
    emit(ctx, 'distracted', 'Van Helsing spent the night being talked at and snooped nowhere.', { data: { townie: HUNTER_ID } });
    return;
  }
  const room = mostExposedRoom(state.house);
  if (laidLowTonight(state)) {
    emit(ctx, 'snoopingFoiled', `Van Helsing prowled around ${room.name} but found the curtains drawn and the doors barred.`, {
      data: { room: room.id, suspicion: 0 },
    });
    return;
  }
  if (room.secretPassage && !room.lit) {
    emit(ctx, 'snoopingFoiled', `Van Helsing prowled around ${room.name} and found nothing but a draught.`, {
      data: { room: room.id, suspicion: 0 },
    });
    return;
  }
  addSuspicion(ctx, SNOOPING_SUSPICION);
  emit(ctx, 'snooping', `Van Helsing snooped around ${room.name} and nobody was lying low (Suspicion +${SNOOPING_SUSPICION}).`, {
    data: { room: room.id, suspicion: SNOOPING_SUSPICION },
  });
}

/** Dawn: decay needs, update anger, settle the night's Suspicion, check for game over. */
export function dawn(state: GameState): void {
  const ctx: Ctx = { state, phase: 'dawn' };
  for (const m of state.monsters) {
    applyDecay(ctx, m);
    updateAnger(ctx, m);
  }
  for (const m of state.monsters) for (const q of quirkHooks(m)) q.onDawn?.(ctx, m);
  moveOuts(ctx);
  recomputeHouseholdAnger(state);
  if (state.status !== 'running') {
    emitSummary(ctx);
    return;
  }

  const village = state.village;
  const before = village.suspicion;
  const moodBefore = moodFor(before);
  villageTalks(ctx);
  hunterAtDawn(ctx, moodRank(moodBefore) >= moodRank('snooping'));
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
  const rumourNote = state.noise > 0 ? ` (incl. rumour +${NIGHTLY_RUMOUR})` : '';
  emit(ctx, 'suspicion', `Suspicion ${before} -> ${after}${rumourNote}.`, {
    data: { before, after, delta: after - before, rumour: state.noise > 0 ? NIGHTLY_RUMOUR : 0 },
  });

  const moodAfter = moodFor(after);
  if (moodRank(moodAfter) > moodRank(moodBefore) && moodAfter !== 'mobAtDoor') {
    emit(ctx, 'villageMood', MOOD_TEXT[moodAfter], { data: { mood: moodAfter } });
  } else if (moodRank(moodAfter) < moodRank(moodBefore)) {
    emit(ctx, 'villageMood', 'The village calms down a little.', { data: { mood: moodAfter } });
  }

  if (after >= THRESHOLDS.mobAtDoor) {
    if (mobAtTheDoor(ctx)) {
      recomputeHouseholdAnger(state);
      return;
    }
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

  mobByDay(ctx);

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
