import type { Event, GameState } from '../sim/types.ts';

const HEADLINE_KINDS = new Set(['action', 'blackout', 'idle', 'suspicion']);
const DETAIL_KINDS = new Set([
  'fullMoonRises',
  'recruited',
  'furnitureBroken',
  'snooping',
  'angryHouse',
  'villageMood',
  'mobAttack',
  'daylightRefused',
  'anger',
  'gameOver',
  'victory',
  'summary',
  'quietNight',
  'needCritical',
  'lightsSeen',
  'fight',
  'rogue',
  'moveOut',
  'relationship',
  'turned',
  'gossip',
  'outspoken',
  'thralls',
  'planIgnored',
  'built',
  'buildFailed',
  'mobRepelled',
  'organ',
  'mobAtDoor',
  'hunterArrives',
  'hunterLeaves',
  'distracted',
  'snooping',
  'snoopingFoiled',
  'busy',
  'curse',
  'foodStolen',
]);

function nightLine(n: number, events: readonly Event[]): string {
  const night = events.filter((e) => e.phase === 'night' && HEADLINE_KINDS.has(e.kind));
  const suspicion = events.find((e) => e.kind === 'suspicion');
  const parts = night.map((e) => e.text);
  if (suspicion) parts.push(suspicion.text);
  return `Night ${n} — ${parts.join(' ')}`;
}

export function formatNight(n: number, events: readonly Event[]): string {
  const lines = [nightLine(n, events)];
  for (const e of events) {
    if (DETAIL_KINDS.has(e.kind) || (e.phase === 'day' && e.kind === 'action')) {
      lines.push(`  · ${e.text}`);
    }
  }
  return lines.join('\n');
}

/** One line per event, grouped by night and phase (MM-11). */
export function formatVerbose(state: GameState, seed: number): string {
  const out: string[] = [`Monster Manor — seed ${seed}, ${state.nightsToSurvive} nights to survive.`];
  let night = -1;
  let phase = '';
  for (const e of state.log) {
    if (e.night !== night) {
      night = e.night;
      phase = '';
      out.push('', `== Night ${night} ==`);
    }
    if (e.phase !== phase) {
      phase = e.phase;
      out.push(`-- ${phase} --`);
    }
    out.push(e.text);
  }
  return out.join('\n');
}

export function formatGame(state: GameState, seed: number): string {
  const out: string[] = [];
  out.push(`Monster Manor — seed ${seed}, ${state.nightsToSurvive} nights to survive.`);
  out.push(
    `Household: ${state.monsters.map((m) => m.name).join(', ')}. Starting Suspicion ${state.log.find((e) => e.kind === 'suspicion')?.data?.['before'] ?? state.village.suspicion}.`,
  );
  out.push('');
  for (let n = 1; n <= state.night; n++) {
    out.push(formatNight(n, state.log.filter((e) => e.night === n)));
    out.push('');
  }
  out.push(state.status === 'won' ? 'Result: the household survived. You win.' : 'Result: the mob is at the door. Game over.');
  out.push(`Final Suspicion ${state.village.suspicion}. Household anger ${state.house.householdAnger}.`);
  return out.join('\n');
}
