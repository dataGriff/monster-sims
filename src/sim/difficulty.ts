import type { Difficulty, GameState } from './types.ts';

export interface Tuning {
  startingSuspicion: number;
  /** How far a quiet night pulls Suspicion toward the baseline. */
  quietDrift: number;
  /** What a noisy night adds on top. */
  rumour: number;
  /** Chance per day that a gathered mob marches. */
  mobChance: number;
}

export const DIFFICULTIES: Record<Difficulty, Tuning> = {
  gentle: { startingSuspicion: 25, quietDrift: 5, rumour: 3, mobChance: 0.35 },
  standard: { startingSuspicion: 30, quietDrift: 3, rumour: 4, mobChance: 0.5 },
  harsh: { startingSuspicion: 35, quietDrift: 2, rumour: 5, mobChance: 0.65 },
};

/** Run-length presets. All three end on a full moon. */
export const RUN_LENGTHS = { short: 7, standard: 14, long: 28 } as const;
export type RunLength = keyof typeof RUN_LENGTHS;

export function tuning(state: GameState): Tuning {
  return DIFFICULTIES[state.options.difficulty ?? 'standard'];
}

export const SANDBOX_RESET = 85;
