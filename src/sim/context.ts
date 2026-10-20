import { clamp } from './needs.ts';
import type {
  ActionKind,
  Event,
  EventData,
  GameState,
  Monster,
  NeedKey,
  Phase,
} from './types.ts';
import { getQuirk } from './quirks.ts';

/** Where a need change came from; quirks use this to allow, block or rewrite it. */
export type NeedSource = ActionKind | 'decay' | 'daySleep' | 'house' | 'mob' | 'quirk';

export interface Ctx {
  state: GameState;
  phase: Phase;
}

export function emit(
  ctx: Ctx,
  kind: string,
  text: string,
  extra: { monsterId?: Monster['id']; data?: EventData } = {},
): Event {
  const event: Event = { night: ctx.state.night, phase: ctx.phase, kind, text };
  if (extra.monsterId !== undefined) event.monsterId = extra.monsterId;
  if (extra.data !== undefined) event.data = extra.data;
  ctx.state.log.push(event);
  return event;
}

/**
 * Change a need, running the delta through every quirk filter the monster has.
 * Returns the delta actually applied.
 */
export function adjustNeed(
  ctx: Ctx,
  monster: Monster,
  key: NeedKey,
  delta: number,
  source: NeedSource,
): number {
  let allowed = delta;
  for (const id of monster.quirks) {
    const filter = getQuirk(id).filterNeedChange;
    if (filter) allowed = filter(ctx, monster, key, allowed, source);
  }
  const before = monster.needs[key];
  const after = clamp(before + allowed);
  monster.needs[key] = after;
  return after - before;
}

/** Queue a suspicion change; it is applied (and reported) at dawn. */
export function addSuspicion(ctx: Ctx, delta: number): void {
  ctx.state.pendingSuspicion += delta;
}

export function isFullMoon(night: number): boolean {
  return night > 0 && night % 7 === 0;
}

export function findMonster(state: GameState, id: Monster['id']): Monster {
  const m = state.monsters.find((x) => x.id === id);
  if (!m) throw new Error(`No monster with id "${id}"`);
  return m;
}
