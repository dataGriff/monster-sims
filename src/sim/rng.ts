import type { RngState } from './types.ts';

/** Create a seeded RNG state (mulberry32). Same seed, same sequence. */
export function createRng(seed: number): RngState {
  return { seed: seed >>> 0, state: seed >>> 0 };
}

/** Advance the RNG and return a float in [0, 1). Mutates `rng.state` only. */
export function nextFloat(rng: RngState): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [0, n). */
export function nextInt(rng: RngState, n: number): number {
  return Math.floor(nextFloat(rng) * n);
}

/** True with probability `p`. */
export function chance(rng: RngState, p: number): boolean {
  return nextFloat(rng) < p;
}

export function pick<T>(rng: RngState, items: readonly T[]): T {
  const item = items[nextInt(rng, items.length)];
  if (item === undefined) throw new Error('pick() called on an empty list');
  return item;
}
