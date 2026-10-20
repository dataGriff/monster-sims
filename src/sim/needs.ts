import { NEED_KEYS, type NeedKey, type Needs } from './types.ts';

export function clamp(value: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, value));
}

export function makeNeeds(overrides: Partial<Needs> = {}): Needs {
  const needs: Needs = {
    hunger: 80,
    energy: 80,
    social: 60,
    fun: 60,
    hygiene: 80,
    comfort: 80,
    bladder: 80,
    anger: 10,
  };
  for (const key of NEED_KEYS) {
    const v = overrides[key];
    if (v !== undefined) needs[key] = clamp(v);
  }
  return needs;
}

/** Needs that count as "satisfaction" meters (everything but anger). */
export const SATISFACTION_KEYS: readonly NeedKey[] = NEED_KEYS.filter((k) => k !== 'anger');
