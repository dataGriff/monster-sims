/**
 * A tiny step library that maps Gherkin phrasing onto direct sim calls.
 * No cucumber runtime: each spec file is one feature, each `it` one scenario.
 */
import { expect } from 'vitest';
import { findMonster } from '../src/sim/context.ts';
import { createGame, dawn, day, dusk, night, runNight } from '../src/sim/loop.ts';
import { createRng, nextFloat } from '../src/sim/rng.ts';
import type {
  ActionKind,
  Event,
  GameState,
  MonsterId,
  NeedKey,
  NightPlan,
  RngState,
} from '../src/sim/types.ts';

export interface GivenOptions {
  seed?: number;
  suspicion?: number;
  nights?: number;
}

/** Given a new game with seed … and Suspicion … */
export function aNewGame(options: GivenOptions = {}): GameState {
  const state = createGame({ seed: options.seed ?? 42, nightsToSurvive: options.nights ?? 7 });
  if (options.suspicion !== undefined) state.village.suspicion = options.suspicion;
  return state;
}

/** Given it is the dusk of night N (the next dusk will be night N). */
export function itIsTheDuskOfNight(state: GameState, n: number): void {
  state.night = n - 1;
}

export function need(state: GameState, id: MonsterId, key: NeedKey): number {
  return findMonster(state, id).needs[key];
}

export function setNeed(state: GameState, id: MonsterId, key: NeedKey, value: number): void {
  findMonster(state, id).needs[key] = value;
}

export function setNeeds(state: GameState, id: MonsterId, values: Partial<Record<NeedKey, number>>): void {
  for (const [k, v] of Object.entries(values)) setNeed(state, id, k as NeedKey, v as number);
}

export function setEveryonesNeed(state: GameState, key: NeedKey, value: number): void {
  for (const m of state.monsters) m.needs[key] = value;
}

/** A plan where the named monsters act and everyone else idles. */
export function plan(
  nightAssignments: Partial<Record<MonsterId, ActionKind>>,
  dayAssignments?: Partial<Record<MonsterId, ActionKind>>,
): NightPlan {
  return dayAssignments ? { night: nightAssignments, day: dayAssignments } : { night: nightAssignments };
}

export function everyone(kind: ActionKind): Partial<Record<MonsterId, ActionKind>> {
  return { count: kind, wolfman: kind, golem: kind };
}

/** When … for the night: dusk + night only, so needs are read before decay. */
export function duskAndNight(state: GameState, p: NightPlan): void {
  dusk(state, p);
  night(state);
}

/** When … for a full night: dusk -> night -> dawn -> day. */
export function fullNight(state: GameState, p: NightPlan): readonly Event[] {
  return runNight(state, p);
}

export function fullNights(state: GameState, p: NightPlan, count: number): void {
  for (let i = 0; i < count; i++) runNight(state, p);
}

export { dusk, night, dawn, day };

export function eventsOfKind(state: GameState, kind: string, monsterId?: MonsterId): Event[] {
  return state.log.filter((e) => e.kind === kind && (monsterId === undefined || e.monsterId === monsterId));
}

/** Then the night ends with Suspicion N: reads the last dawn summary. */
export function suspicionAtEndOfNight(state: GameState): number {
  const last = eventsOfKind(state, 'suspicion').at(-1);
  if (!last) throw new Error('no dawn has happened yet');
  return Number(last.data?.['after']);
}

/** Then the log says "…" (optionally: says the given monster "…"). */
export function logSays(state: GameState, fragment: string, monsterId?: MonsterId): boolean {
  return state.log.some(
    (e) => e.text.includes(fragment) && (monsterId === undefined || e.monsterId === monsterId),
  );
}

export function expectLogSays(state: GameState, fragment: string, monsterId?: MonsterId): void {
  expect(
    state.log.filter((e) => monsterId === undefined || e.monsterId === monsterId).map((e) => e.text),
  ).toSatisfy((texts: string[]) => texts.some((t) => t.includes(fragment)), `expected log to say "${fragment}"`);
}

export function brokenFurnitureNames(state: GameState): string[] {
  return state.house.furniture.filter((f) => f.broken).map((f) => f.name);
}

/**
 * Given a seed on which the next roll(s) …: scan seeds until the predicate,
 * applied to a fresh RNG for that seed, holds. Keeps scenarios deterministic
 * without poking at the RNG from inside the sim.
 */
export function seedWhere(predicate: (rng: RngState) => boolean, start = 1): number {
  for (let seed = start; seed < start + 10_000; seed++) {
    if (predicate(createRng(seed))) return seed;
  }
  throw new Error('no seed satisfied the predicate');
}

export function rollBelow(p: number): (rng: RngState) => boolean {
  return (rng) => nextFloat(rng) < p;
}

export function rollAtLeast(p: number): (rng: RngState) => boolean {
  return (rng) => nextFloat(rng) >= p;
}

export function rolls(...checks: Array<(rng: RngState) => boolean>): (rng: RngState) => boolean {
  return (rng) => checks.every((check) => check(rng));
}
