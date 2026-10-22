import type { RelationshipStage, Setting, Townie, Village } from './types.ts';

interface TownieSeed {
  id: string;
  name: string;
  job: string;
  weight: number;
  abroad: 'day' | 'night';
}

/** The village, in fence order: each townie neighbours the ones either side. */
const ROSTER: readonly TownieSeed[] = [
  { id: 'baker', name: 'the baker', job: 'baker', weight: 2, abroad: 'night' },
  { id: 'miller', name: 'the miller', job: 'miller', weight: 2, abroad: 'day' },
  { id: 'innkeeper', name: 'the innkeeper', job: 'innkeeper', weight: 3, abroad: 'night' },
  { id: 'schoolmistress', name: 'the schoolmistress', job: 'schoolmistress', weight: 3, abroad: 'day' },
  { id: 'blacksmith', name: 'the blacksmith', job: 'blacksmith', weight: 2, abroad: 'day' },
  { id: 'ferryman', name: 'the ferryman', job: 'ferryman', weight: 1, abroad: 'night' },
  { id: 'apothecary', name: 'the apothecary', job: 'apothecary', weight: 2, abroad: 'day' },
  { id: 'sexton', name: 'the sexton', job: 'sexton', weight: 1, abroad: 'night' },
  { id: 'constable', name: 'the constable', job: 'constable', weight: 3, abroad: 'night' },
  { id: 'widow', name: 'the widow at the end of the lane', job: 'lacemaker', weight: 1, abroad: 'day' },
];

/** The valley: a chapel-and-quarry terrace for the Welsh folklore set (MM-36). */
const VALLEY_ROSTER: readonly TownieSeed[] = [
  { id: 'minister', name: 'the minister', job: 'chapel minister', weight: 3, abroad: 'day' },
  { id: 'publican', name: 'the publican', job: 'publican', weight: 3, abroad: 'night' },
  { id: 'quarryman', name: 'the quarryman', job: 'quarryman', weight: 2, abroad: 'day' },
  { id: 'postmistress', name: 'the postmistress', job: 'postmistress', weight: 2, abroad: 'day' },
  { id: 'shepherd', name: 'the shepherd', job: 'shepherd', weight: 1, abroad: 'night' },
  { id: 'harpist', name: 'the harpist', job: 'harpist', weight: 2, abroad: 'night' },
  { id: 'clerk', name: 'the colliery clerk', job: 'colliery clerk', weight: 2, abroad: 'day' },
  { id: 'midwife', name: 'the midwife', job: 'midwife', weight: 2, abroad: 'night' },
  { id: 'schoolmaster', name: 'the schoolmaster', job: 'schoolmaster', weight: 3, abroad: 'day' },
  { id: 'mamgu', name: 'Mam-gu at the end of the terrace', job: 'knitter', weight: 1, abroad: 'night' },
];

export const STAGES: readonly RelationshipStage[] = ['stranger', 'friend', 'confidant', 'thrall', 'turned'];
export const BOND_PER_STAGE = 25;
/** Anyone can befriend a villager; only charm takes them past confidant. */
export const SOCIAL_BOND = 10;
export const SOCIAL_BOND_CAP: RelationshipStage = 'confidant';
export const OUTSPOKEN_AT = 50;
export const OUTSPOKEN_SUSPICION = 2;
export const GOSSIP_SPREAD = 5;
export const AWARENESS_FORGET = 5;
export const FEED_AWARENESS = 20;

export function createTownies(setting: Setting = 'manor'): Townie[] {
  const roster = setting === 'valley' ? VALLEY_ROSTER : ROSTER;
  const n = roster.length;
  return roster.map((t, i) => ({
    id: t.id,
    name: t.name,
    job: t.job,
    weight: t.weight,
    abroad: t.abroad,
    awareness: 0,
    outspoken: false,
    relationship: 'stranger',
    bond: 0,
    neighbours: [roster[(i + n - 1) % n]!.id, roster[(i + 1) % n]!.id],
    role: 'villager',
  }));
}

export const HUNTER_ID = 'vanhelsing';

/**
 * Van Helsing, as a townie: he lodges at the inn, so the innkeeper and the
 * constable hear everything he says. In the valley the part is played by the
 * dyn hysbys, the cunning man, who lodges over the pub.
 */
export function createHunter(setting: Setting = 'manor'): Townie {
  const valley = setting === 'valley';
  return {
    id: HUNTER_ID,
    name: valley ? 'the dyn hysbys' : 'Van Helsing',
    job: valley ? 'cunning man' : 'monster hunter',
    weight: 3,
    abroad: 'night',
    awareness: 50,
    outspoken: true,
    relationship: 'stranger',
    bond: 0,
    neighbours: valley ? ['publican', 'minister'] : ['innkeeper', 'constable'],
    role: 'hunter',
  };
}

export function hunter(village: Village): Townie | undefined {
  return village.townies.find((t) => t.role === 'hunter');
}

export function getTownie(village: Village, id: string): Townie {
  const t = village.townies.find((x) => x.id === id);
  if (!t) throw new Error(`No townie "${id}"`);
  return t;
}

export function stageRank(stage: RelationshipStage): number {
  return STAGES.indexOf(stage);
}

/** Townies a monster might run into tonight. */
export function townieAbroad(village: Village, when: 'day' | 'night'): Townie[] {
  return village.townies.filter((t) => t.abroad === when && t.relationship !== 'turned');
}

/** Confidants and thralls keep the manor's secrets. The turned live in it. */
export function isAlly(t: Townie): boolean {
  return t.relationship === 'confidant' || t.relationship === 'thrall';
}

export function syncAllies(village: Village): void {
  village.allies = village.townies.filter(isAlly).map((t) => t.name);
}

/**
 * Add bond with a townie, promoting them when a stage fills. Returns the new
 * stage if one was reached this call, else null. Progress stops at `cap`.
 */
export function advanceBond(t: Townie, amount: number, cap: RelationshipStage): RelationshipStage | null {
  if (stageRank(t.relationship) >= stageRank(cap)) return null;
  t.bond += amount;
  if (t.bond < BOND_PER_STAGE) return null;
  t.bond -= BOND_PER_STAGE;
  const next = STAGES[stageRank(t.relationship) + 1];
  if (!next) return null;
  t.relationship = next;
  if (isAlly(t)) {
    t.awareness = 0;
    t.outspoken = false;
  }
  if (stageRank(next) >= stageRank(cap)) t.bond = 0;
  return next;
}
