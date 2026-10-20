/**
 * Core types for the Monster Manor simulation.
 *
 * Everything here is plain data so a GameState can be serialised, diffed and
 * replayed. Behaviour (quirk hooks, action resolution) lives in functions that
 * take and return these shapes.
 */

export type MonsterId = 'count' | 'wolfman' | 'golem';

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
  | 'heavyHanded';

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
  name: string;
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

export type RoomId = 'crypt' | 'kitchen' | 'parlour' | 'workshop' | 'roof';

export interface Room {
  id: RoomId;
  name: string;
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

export type VillageMood = 'calm' | 'gossip' | 'snooping' | 'mob' | 'mobAtDoor';

export interface Village {
  /** 0–100. 40 gossip, 70 Van Helsing snooping, 90 mob gathers, 100 mob at the door. */
  suspicion: number;
  /** 0–100, filled by the Count's charm; at 100 a villager becomes an ally. */
  recruitProgress: number;
  allies: string[];
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
  log: Event[];
  status: GameStatus;
}
