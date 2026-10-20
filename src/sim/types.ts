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
export type Archetype =
  | 'count'
  | 'wolfman'
  | 'golem'
  | 'mummy'
  | 'invisible'
  | 'lakeling'
  | 'phantom'
  | 'bride'
  | 'hunchback'
  | 'gwyllgi'
  | 'cwnannwn'
  | 'gwrach'
  | 'fledgling';

/** Which village the manor stands over. The valley is the Welsh folklore set. */
export type Setting = 'manor' | 'valley';

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
  | 'fledgling'
  | 'undying'
  | 'unravelling'
  | 'slowMoving'
  | 'hoarder'
  | 'visibility'
  | 'prankster'
  | 'foodThief'
  | 'lowProfile'
  | 'mustStayWet'
  | 'floodsHall'
  | 'freshwater'
  | 'virtuoso'
  | 'masked'
  | 'chandelier'
  | 'neverAsked'
  | 'shriek'
  | 'belfry'
  | 'sanctuary'
  | 'belovedBells'
  | 'omen'
  | 'packAnimal'
  | 'nightRoad'
  | 'wildHunt'
  | 'otherworldly'
  | 'deathWail'
  | 'mistBorn'
  | 'crossroads';

export interface CoverJob {
  /** Human-readable job title, e.g. "night watchman". */
  title: string;
  /** Suspicion removed on a successful shift. */
  relief: number;
  /** Base probability (0–1) that a shift goes wrong. */
  failChance: number;
  /** 1–3. Each promotion adds relief and a grander title. */
  level: number;
  /** Successful shifts since the last promotion or failure. */
  streak: number;
  /** 0–100 workplace suspicion: how much the employer has noticed. 100 means sacked. */
  heat: number;
  employed: boolean;
}

export interface Monster {
  id: MonsterId;
  archetype: Archetype;
  name: string;
  /** Where this monster sleeps; the room is lit when they act there at night. */
  bedroom: RoomId;
  /** The furniture they sleep in. A broken bed halves what sleep restores. */
  bed: string;
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
  /** Archetype-specific scratch state (busy nights, visibility...). Plain data. */
  memo: Record<string, number | boolean | string>;
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
  /** Something the Mummy brought home. Moving it is unwise. */
  artefact?: boolean;
}

export type DefenceId = 'drawbridge' | 'fogMachine' | 'decoyCoffins' | 'organ';

export interface House {
  rooms: Room[];
  furniture: Furniture[];
  lightningRod: boolean;
  /** 0–100, the mean anger of everyone living in the house. */
  householdAnger: number;
  /** Spending money, earned from cover jobs. */
  coin: number;
  defences: Record<DefenceId, boolean>;
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
  /** Villagers live here; the hunter lodges at the inn while Suspicion is high. */
  role: 'villager' | 'hunter';
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
  /** Van Helsing is in the village. */
  hunterPresent: boolean;
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
  /** Things to buy at dusk, in order, while the coin lasts. */
  build?: string[];
  /** Which branch to take if a story event fires tonight, by story id. */
  choices?: Record<string, string>;
}

export type Difficulty = 'gentle' | 'standard' | 'harsh';

export interface GameOptions {
  seed: number;
  nightsToSurvive?: number;
  suspicion?: number;
  /** Who lives here at launch. Defaults to the Count, the Wolf Man and the Golem. */
  household?: Archetype[];
  /** Tunes Suspicion drift, rumour and the mob. Default standard. */
  difficulty?: Difficulty;
  /** Sandbox: the mob never ends the run. */
  sandbox?: boolean;
  /** 'manor' (default) or 'valley' for the Welsh folklore village. */
  setting?: Setting;
  /** Scripted story events at dusk. Off by default so bare sims stay predictable; the CLI turns them on. */
  stories?: boolean;
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
  /** Monsters the mob took. */
  taken: string[];
  /** What createGame was called with, so a save can rebuild the run. */
  options: GameOptions;
  /** Every dusk plan applied so far, in order. */
  planHistory: NightPlan[];
  /** Story events that have already fired, and when the last one did. */
  stories: { fired: string[]; lastNight: number };
  log: Event[];
  status: GameStatus;
}
