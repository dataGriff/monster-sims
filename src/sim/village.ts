import type { Village, VillageMood } from './types.ts';

export const THRESHOLDS = {
  gossip: 40,
  snooping: 70,
  mob: 90,
  mobAtDoor: 100,
} as const;

/** Suspicion added at dawn after a noisy night: the village talks when there is something to talk about. */
export const NIGHTLY_RUMOUR = 4;
/** On a quiet night Suspicion moves this far toward BASELINE_SUSPICION. */
export const QUIET_NIGHT_DRIFT = 3;
/** Where Suspicion settles if nothing ever happens: a house of strangers is never quite trusted. */
export const BASELINE_SUSPICION = 30;
export const SNOOPING_SUSPICION = 3;
export const ANGRY_HOUSE_SUSPICION = 5;
export const ANGRY_HOUSE_LEVEL = 70;
export const MOB_ATTACK_CHANCE = 0.5;

export const STARTING_SUSPICION = BASELINE_SUSPICION;

export function createVillage(suspicion = STARTING_SUSPICION): Village {
  return { suspicion, recruitProgress: 0, allies: [] };
}

export function moodFor(suspicion: number): VillageMood {
  if (suspicion >= THRESHOLDS.mobAtDoor) return 'mobAtDoor';
  if (suspicion >= THRESHOLDS.mob) return 'mob';
  if (suspicion >= THRESHOLDS.snooping) return 'snooping';
  if (suspicion >= THRESHOLDS.gossip) return 'gossip';
  return 'calm';
}

export const MOOD_TEXT: Record<VillageMood, string> = {
  calm: 'The village sleeps soundly.',
  gossip: 'Gossip about the manor spreads through the market.',
  snooping: 'Van Helsing has taken a room at the inn and is asking questions.',
  mob: 'A mob is gathering in the square with torches.',
  mobAtDoor: 'The mob is at the door.',
};

const ORDER: VillageMood[] = ['calm', 'gossip', 'snooping', 'mob', 'mobAtDoor'];

export function moodRank(mood: VillageMood): number {
  return ORDER.indexOf(mood);
}
