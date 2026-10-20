import { createTownies } from './townies.ts';
import type { Setting, Village, VillageMood } from './types.ts';
import { t } from './i18n.ts';

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
/** Van Helsing packs up once Suspicion falls below this. */
export const HUNTER_LEAVES_BELOW = 50;

export const STARTING_SUSPICION = BASELINE_SUSPICION;

export function createVillage(suspicion = STARTING_SUSPICION, setting: Setting = 'manor'): Village {
  return { suspicion, townies: createTownies(setting), allies: [], turned: [], hunterPresent: false };
}

export function moodFor(suspicion: number): VillageMood {
  if (suspicion >= THRESHOLDS.mobAtDoor) return 'mobAtDoor';
  if (suspicion >= THRESHOLDS.mob) return 'mob';
  if (suspicion >= THRESHOLDS.snooping) return 'snooping';
  if (suspicion >= THRESHOLDS.gossip) return 'gossip';
  return 'calm';
}

export function moodText(mood: VillageMood): string {
  const texts: Record<VillageMood, string> = {
  calm: t('village.text.1'),
  gossip: t('village.text.2'),
  snooping: t('village.text.3'),
  mob: t('village.text.4'),
  mobAtDoor: t('village.text.5'),
  };
  return texts[mood];
}

const ORDER: VillageMood[] = ['calm', 'gossip', 'snooping', 'mob', 'mobAtDoor'];

export function moodRank(mood: VillageMood): number {
  return ORDER.indexOf(mood);
}
