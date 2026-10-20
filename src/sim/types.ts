/**
 * Core types for the Monster Manor simulation.
 *
 * Everything here is plain data so a GameState can be serialised, diffed and
 * replayed. Behaviour (quirk hooks, action resolution) lives in functions that
 * take and return these shapes.
 */

/**
 * Monster ids are slugs. The launch household uses 'count', 'wolfman' and
 * 'golem'; a turned villager joins as 'turned-<townieId>'.
 */
export type MonsterId = string;

/** The built-in archetypes. A monster's `archetype` picks its quirks and text. */
export type Archetype = 'count' | 'wolfman' | 'golem' | 'fledgling';

export const NEED_KEYS = [
  'hunger',
  'energy',
  'social',
  'fun',
  'hygiene',
  'comfort',
  'bladder',
  'anger',
] as const;

export type NeedKey = (typeof NEED_KEYS)[number];

/**
 * Every need is clamped to 0–100.
 * For all needs except `anger`, 100 means fully satisfied.
 * `anger` is inverted: 0 is calm, 100 is furious.
 */
export type Needs = Record<NeedKey, number>;

export const ACTION_KINDS = [
  'feed',
  'sleep',
  'socialise',
  'coverJob',
  'repair',
  'lieLow',
  'gameNight',
] as const;

export type ActionKind = (typeof ACTION_KINDS)[number];

export type Phase = 'dusk' | 'night' | 'dawn' | 'day';

export type QuirkId =
  | 'nocturnalFeeder'
  | 'daylightDrain'
  | 'noReflection'
  | 'charm'
  | 'fullMoon'
  | 'dayWalker'
  | 'villagersFlee'
  | 'lightningPowered'
  | 'heavyHanded'
  | 'fledgling';

export interface CoverJob {
  /** Human-readable job title, e.g. "night watchman". */
  title: string;
  /** Suspicion removed on a successful shift. */
  relief: number;
  /** Base probability (0–1) that a shift goes wrong. */
  failChance: number;
}

export interface Monster {
  id: MonsterId;
  archetype: Archetype;
  name: string;
  /** Where this monster sleeps; the room is lit when they act there at night. */
  bedroom: RoomId;
  needs: Needs;
  /** Amount subtracted from each need at dawn (anger is handled separately). */
  decay: Partial<Needs>;
  quirks: QuirkId[];
  coverJob: CoverJob;
  /** Only monsters with this flag may take a day-slot action. */
  daylightActive: boolean;
  /** Action queued at dusk for the coming night; null if idle. */
  assignedAction: ActionKind | null;
  /** Action queued for the day slot (only honoured when daylightActive). */
  assignedDayAction: ActionKind | null;
}

export interface Action {
  monsterId: MonsterId;
  kind: ActionKind;
  slot: 'night' | 'day';
}

export type EventData = Record<string, number | string | boolean>;

/** A single log entry. `text` is what the CLI (and a future UI) prints. */
export interface Event {
  night: number;
  phase: Phase;
  kind: string;
  monsterId?: MonsterId;
  text: string;
  data?: EventData;
}

export type RoomId = 'crypt' | 'kitchen' | 'parlour' | 'workshop' | 'attic' | 'roof';

export interface Room {
  id: RoomId;
  name: string;
  /** Windows facing the village; each one adds to exposure. */
  windows: number;
  /** Lit at night by someone acting in the room. Reset at dusk. */
  lit: boolean;
  /** A way out that Van Helsing and the mob do not know about. */
  secretPassage: boolean;
}

export interface Furniture {
  id: string;
  name: string;
  room: RoomId;
  broken: boolean;
}

export interface House {
  rooms: Room[];
  furniture: Furniture[];
  lightningRod: boolean;
  /** 0–100, the mean anger of everyone living in the house. */
  householdAnger: number;
}

export type RelationshipStage = 'stranger' | 'friend' | 'confidant' | 'thrall' | 'turned';

export interface Townie {
  id: string;
  name: string;
  job: string;
  /** How much the village listens to this person (1–3). */
  weight: number;
  /** When they are out and about, and so who a monster can bump into. */
  abroad: 'day' | 'night';
  /** 0–100, their private suspicion of the manor. Spreads to neighbours. */
  awareness: number;
  /** Set once they have crossed 50 and said so out loud. */
  outspoken: boolean;
  relationship: RelationshipStage;
  /** 0–100 progress toward the next stage. */
  bond: number;
  /** Ids of the two townies they share a fence with. */
  neighbours: string[];
}

export type VillageMood = 'calm' | 'gossip' | 'snooping' | 'mob' | 'mobAtDoor';

export interface Village {
  /** 0–100. 40 gossip, 70 Van Helsing snooping, 90 mob gathers, 100 mob at the door. */
  suspicion: number;
  townies: Townie[];
  /** Names of townies at confidant or beyond: they keep the manor's secrets. */
  allies: string[];
  /** Townies who were turned and now live in the manor. */
  turned: string[];
}

export interface RngState {
  seed: number;
  state: number;
}

export type GameStatus = 'running' | 'won' | 'lost';

/** Dusk assignments for one night. */
export interface NightPlan {
  night: Partial<Record<MonsterId, ActionKind>>;
  day?: Partial<Record<MonsterId, ActionKind>>;
}

export interface Plan {
  nights: NightPlan[];
}

export interface GameState {
  /** Number of nights completed. */
  night: number;
  /** Total nights in the run; surviving them all is a win. */
  nightsToSurvive: number;
  rng: RngState;
  monsters: Monster[];
  house: House;
  village: Village;
  /** Suspicion change accumulated during the current night, applied at dawn. */
  pendingSuspicion: number;
  /** Count of things this night that gave the village something to talk about. */
  noise: number;
  /** Monsters who have stormed out. */
  departed: string[];
  log: Event[];
  status: GameStatus;
}
