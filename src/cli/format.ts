import { t } from '../sim/i18n.ts';
import type { Event, GameState } from '../sim/types.ts';

const HEADLINE_KINDS = new Set(['action', 'blackout', 'wildHunt', 'idle', 'suspicion']);
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
  'sandbox',
  'dryingOut',
  'flood',
  'chandelier',
  'refused',
  'wail',
  'story',
]);

function nightLine(n: number, events: readonly Event[]): string {
  const night = events.filter((e) => e.phase === 'night' && HEADLINE_KINDS.has(e.kind));
  const suspicion = events.find((e) => e.kind === 'suspicion');
  const parts = night.map((e) => e.text);
  if (suspicion) parts.push(suspicion.text);
  return t('cli.night', { n, parts: parts.join(' ') });
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
  const out: string[] = [t('cli.title', { seed, nights: state.nightsToSurvive })];
  let night = -1;
  let phase = '';
  for (const e of state.log) {
    if (e.night !== night) {
      night = e.night;
      phase = '';
      out.push('', t('cli.nightHeader', { n: night }));
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
  out.push(t('cli.title', { seed, nights: state.nightsToSurvive }));
  out.push(
    t('cli.household', {
      names: state.monsters.map((m) => m.name).join(', '),
      suspicion: Number(state.log.find((e) => e.kind === 'suspicion')?.data?.['before'] ?? state.village.suspicion),
    }),
  );
  out.push('');
  for (let n = 1; n <= state.night; n++) {
    out.push(formatNight(n, state.log.filter((e) => e.night === n)));
    out.push('');
  }
  out.push(state.status === 'won' ? t('cli.won') : t('cli.lost'));
  out.push(t('cli.final', { suspicion: state.village.suspicion, anger: state.house.householdAnger }));
  return out.join('\n');
}
