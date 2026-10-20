/**
 * Pure view-model for the web client (MM-22/23/24). Everything here is derived
 * from GameState and the event log; nothing touches the DOM or canvas, so it
 * is unit-tested like the sim.
 */
import { actionRoom, coverJobFailChance, jobTitle } from '../sim/actions.ts';
import { isFullMoon } from '../sim/context.ts';
import { roomExposure } from '../sim/house.ts';
import { NEED_KEYS, type ActionKind, type Event, type GameState, type Monster, type NeedKey, type RoomId } from '../sim/types.ts';
import { moodFor, THRESHOLDS } from '../sim/village.ts';
import { isHuntNight } from '../sim/archetypes/welsh.ts';

/** Isometric grid cell per room: the manor is three rooms wide and two deep, with the roof above. */
export const ROOM_LAYOUT: Record<RoomId, { col: number; row: number; w: number; h: number }> = {
  roof: { col: 0, row: -1, w: 3, h: 1 },
  attic: { col: 0, row: 0, w: 1, h: 1 },
  parlour: { col: 1, row: 0, w: 1, h: 1 },
  workshop: { col: 2, row: 0, w: 1, h: 1 },
  crypt: { col: 0, row: 1, w: 1, h: 1 },
  kitchen: { col: 1, row: 1, w: 1, h: 1 },
  // the gate: not a room, used for residents who are out
};

export const TILE_W = 128;
export const TILE_H = 64;

/** Grid cell to screen point (top corner of the diamond). */
export function isoToScreen(col: number, row: number, originX: number, originY: number): { x: number; y: number } {
  return { x: originX + (col - row) * (TILE_W / 2), y: originY + (col + row) * (TILE_H / 2) };
}

/**
 * Okabe–Ito palette: distinguishable under the common colour-vision
 * deficiencies. One accent per archetype; the fledgling shares the Count's.
 */
export const ACCENTS: Record<string, string> = {
  count: '#D55E00',
  wolfman: '#E69F00',
  golem: '#009E73',
  mummy: '#F0E442',
  invisible: '#56B4E9',
  lakeling: '#0072B2',
  phantom: '#CC79A7',
  bride: '#999999',
  hunchback: '#882255',
  gwyllgi: '#332288',
  cwnannwn: '#44AA99',
  gwrach: '#DDCC77',
  fledgling: '#D55E00',
};

export function accentFor(m: Monster): string {
  return ACCENTS[m.archetype] ?? '#FFFFFF';
}

export type Pose = 'idle' | 'walk' | 'act' | 'asleep';

export interface Sprite {
  id: string;
  name: string;
  initial: string;
  accent: string;
  /** Room they are drawn in, or 'out' at the gate. */
  room: RoomId | 'out';
  pose: Pose;
  /** What they were last seen doing, for the tooltip. */
  caption: string;
}

function lastEventFor(events: readonly Event[], id: string): Event | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!;
    if (e.monsterId === id && (e.kind === 'action' || e.kind === 'idle' || e.kind === 'blackout' || e.kind === 'wildHunt' || e.kind === 'daySleep' || e.kind === 'daylightDrain' || e.kind === 'busy')) return e;
  }
  return undefined;
}

/** Where everyone is and what they are doing, from the last night's events and the current phase. */
export function spriteStates(state: GameState, phase: 'dusk' | 'night' | 'day'): Sprite[] {
  const nightEvents = state.log.filter((e) => e.night === state.night);
  return state.monsters.map((m) => {
    const base = { id: m.id, name: m.name, initial: m.name.replace(/^(The|Y) /, '').charAt(0), accent: accentFor(m) };
    if (phase === 'day') {
      const e = lastEventFor(nightEvents.filter((x) => x.phase === 'day'), m.id);
      const acted = e?.kind === 'action';
      return { ...base, room: acted ? 'out' : m.bedroom, pose: acted ? 'walk' : 'asleep', caption: e?.text ?? `${m.name} sleeps.` };
    }
    if (phase === 'dusk') {
      return { ...base, room: m.bedroom, pose: 'idle', caption: m.assignedAction ? `${m.name} will ${m.assignedAction}.` : `${m.name} waits for a plan.` };
    }
    const e = lastEventFor(nightEvents.filter((x) => x.phase === 'night'), m.id);
    if (!e || e.kind === 'idle') return { ...base, room: m.bedroom, pose: 'idle', caption: e?.text ?? `${m.name} did nothing.` };
    if (e.kind === 'blackout') return { ...base, room: 'kitchen', pose: 'act', caption: e.text };
    if (e.kind === 'wildHunt') return { ...base, room: 'roof', pose: 'act', caption: e.text };
    const kind = e.data?.['action'] as ActionKind | undefined;
    const room = kind ? actionRoom(m, kind) : null;
    if (kind === 'socialise' || kind === 'coverJob' || (kind === 'feed' && room === null)) return { ...base, room: 'out', pose: 'walk', caption: e.text };
    return { ...base, room: room ?? m.bedroom, pose: kind === 'sleep' ? 'asleep' : 'act', caption: e.text };
  });
}

export type MoonPhase = 'new' | 'waxing crescent' | 'first quarter' | 'waxing gibbous' | 'nearly full' | 'full' | 'waning';

/** The moon by night number: full on every 7th. */
export function moonPhase(night: number): MoonPhase {
  const n = ((night % 7) + 7) % 7;
  if (n === 0) return night === 0 ? 'new' : 'full';
  return (['new', 'new', 'waxing crescent', 'first quarter', 'waxing gibbous', 'nearly full', 'nearly full'] as const)[n] ?? 'new';
}

export function nightsUntilFullMoon(night: number): number {
  const n = ((night % 7) + 7) % 7;
  return n === 0 ? 7 : 7 - n;
}

export interface NeedBar {
  key: NeedKey;
  value: number;
  /** anger is inverted: high is bad. */
  critical: boolean;
  ignored: boolean;
}

export interface MonsterCard {
  id: string;
  name: string;
  accent: string;
  job: string;
  needs: NeedBar[];
  assigned: ActionKind | null;
  assignedDay: ActionKind | null;
  daylightActive: boolean;
}

export interface Hud {
  night: number;
  nightsToSurvive: number;
  status: GameState['status'];
  suspicion: number;
  mood: ReturnType<typeof moodFor>;
  thresholds: typeof THRESHOLDS;
  householdAnger: number;
  coin: number;
  moon: MoonPhase;
  nextFullMoonIn: number;
  lightningRod: boolean;
  allies: string[];
  hunterPresent: boolean;
  monsters: MonsterCard[];
}

export function hudModel(state: GameState): Hud {
  return {
    night: state.night,
    nightsToSurvive: state.nightsToSurvive,
    status: state.status,
    suspicion: state.village.suspicion,
    mood: moodFor(state.village.suspicion),
    thresholds: THRESHOLDS,
    householdAnger: state.house.householdAnger,
    coin: state.house.coin,
    moon: moonPhase(state.status === 'running' ? state.night + 1 : state.night),
    nextFullMoonIn: nightsUntilFullMoon(state.night),
    lightningRod: state.house.lightningRod,
    allies: state.village.allies,
    hunterPresent: state.village.hunterPresent,
    monsters: state.monsters.map((m) => ({
      id: m.id,
      name: m.name,
      accent: accentFor(m),
      job: m.coverJob.employed ? jobTitle(m) : 'unemployed',
      needs: NEED_KEYS.map((key) => ({
        key,
        value: m.needs[key],
        critical: key === 'anger' ? m.needs[key] >= 60 : m.needs[key] < 20,
        ignored: false,
      })),
      assigned: m.assignedAction,
      assignedDay: m.assignedDayAction,
      daylightActive: m.daylightActive,
    })),
  };
}

/**
 * Risk hints for the planning screen (MM-23): what could go wrong tonight if
 * this monster takes this action. Plain sentences; empty means nothing notable.
 */
export function riskHints(state: GameState, monster: Monster, kind: ActionKind | null): string[] {
  const hints: string[] = [];
  const tonight = state.night + 1;
  if (kind === null) return hints;
  if (monster.archetype === 'wolfman' && isFullMoon(tonight)) {
    hints.push(kind === 'coverJob' ? 'Full moon tonight: a shift would end in disaster.' : 'Full moon tonight: whatever he plans, he blacks out.');
  }
  if (monster.archetype === 'cwnannwn' && isHuntNight(tonight)) hints.push('The hounds ride tonight; the plan will be lost.');
  if (Number(monster.memo['busyNights'] ?? 0) > 0) hints.push('Still busy from last night; this action will be dropped.');
  if (kind === 'coverJob') {
    if (!monster.coverJob.employed) hints.push('Sacked: there is no job to go to.');
    else {
      const p = Math.round(coverJobFailChance({ state, phase: 'night' }, monster) * 100);
      hints.push(`Shift fails ${p}% of the time.`);
      if (monster.coverJob.heat >= 50) hints.push('The employer is asking questions.');
    }
  }
  if (kind === 'sleep') {
    const bed = state.house.furniture.find((f) => f.id === monster.bed);
    if (!bed || bed.broken) hints.push('Bed is broken: half the rest.');
    if (monster.quirks.includes('lightningPowered') && !state.house.lightningRod) hints.push('No lightning rod: no energy from sleeping.');
  }
  if (kind === 'socialise') {
    if (monster.quirks.includes('charm')) hints.push('Charm: works a villager up the tree, +Suspicion.');
    if (monster.quirks.includes('villagersFlee')) hints.push('Villagers flee: little company to be had.');
    if (monster.quirks.includes('omen')) hints.push('A black dog on the road frightens people.');
  }
  if (kind === 'gameNight') {
    if (state.house.householdAnger >= 25) hints.push('The house is too cross for a game night.');
    if (state.monsters.filter((m) => m.assignedAction === 'gameNight').length < 1) hints.push('Needs at least two players.');
  }
  if (kind === 'lieLow' && monster.quirks.includes('shriek')) hints.push('She will shriek: fun for her, +Suspicion.');
  if (monster.archetype === 'bride') {
    const golem = state.monsters.find((m) => m.archetype === 'golem');
    if (golem && golem.assignedAction === kind) hints.push('Same as the Golem: she will refuse and lie low.');
  }
  const room = actionRoom(monster, kind);
  if (room) {
    const exposure = roomExposure(state.house, room);
    const windows = state.house.rooms.find((r) => r.id === room)?.windows ?? 0;
    if (windows > 0) hints.push(`Lights ${room} (exposure ${exposure}): +${1} Suspicion if the village sees.`);
  }
  return hints;
}

/** Lighting for the day/night pass: 0 is deep night, 1 is noon. */
export function daylight(phase: 'dusk' | 'night' | 'day'): number {
  return phase === 'day' ? 1 : phase === 'dusk' ? 0.35 : 0.1;
}
