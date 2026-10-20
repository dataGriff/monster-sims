import type { Village, VillageMood } from './types.ts';

export const THRESHOLDS = {
  gossip: 40,
  snooping: 70,
  mob: 90,
  mobAtDoor: 100,
} as const;

/** Suspicion added every dawn: a house of strangers is always talked about. */
export const NIGHTLY_RUMOUR = 4;
export const SNOOPING_SUSPICION = 3;
export const ANGRY_HOUSE_SUSPICION = 5;
export const ANGRY_HOUSE_LEVEL = 70;
export const MOB_ATTACK_CHANCE = 0.5;

export const STARTING_SUSPICION = 30;

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
