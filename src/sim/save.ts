/**
 * Save/load (MM-26). A save is the seed, the options and every plan applied so
 * far; loading replays them, which is exact because the sim is deterministic.
 */
import { createGame, runNight } from './loop.ts';
import type { GameOptions, GameState, NightPlan } from './types.ts';

export interface SaveFile {
  version: 1;
  options: GameOptions;
  plans: NightPlan[];
}

export function saveGame(state: GameState): SaveFile {
  return { version: 1, options: { ...state.options }, plans: state.planHistory.map((p) => structuredClone(p)) };
}

export function loadGame(save: SaveFile): GameState {
  if (save.version !== 1) throw new Error(`Unsupported save version ${String(save.version)}`);
  const state = createGame(save.options);
  for (const plan of save.plans) runNight(state, plan);
  return state;
}

export function parseSave(raw: unknown): SaveFile {
  if (typeof raw !== 'object' || raw === null) throw new Error('save must be an object');
  const r = raw as Record<string, unknown>;
  if (r['version'] !== 1) throw new Error('save.version must be 1');
  const options = r['options'];
  if (typeof options !== 'object' || options === null || typeof (options as GameOptions).seed !== 'number') {
    throw new Error('save.options.seed must be a number');
  }
  if (!Array.isArray(r['plans'])) throw new Error('save.plans must be an array');
  return { version: 1, options: options as GameOptions, plans: r['plans'] as NightPlan[] };
}
