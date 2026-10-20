/**
 * Opt-in telemetry (MM-41): `pnpm play --telemetry runs.ndjson` appends one
 * JSON line per run; `pnpm telemetry runs.ndjson` summarises them. Records hold
 * only what tuning needs: no timestamps, no machine details.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import type { GameOptions, GameState } from '../sim/types.ts';

export interface TelemetryRecord {
  v: 1;
  options: GameOptions;
  outcome: GameState['status'];
  nights: number;
  finalSuspicion: number;
  peakSuspicion: number;
  suspicionCurve: number[];
  eventCounts: Record<string, number>;
  /** The kind of the event that ended the run (victory, gameOver), or 'running'. */
  endedBy: string;
}

export function telemetryRecord(state: GameState): TelemetryRecord {
  const curve = state.log.filter((e) => e.kind === 'suspicion').map((e) => Number(e.data?.['after']));
  const eventCounts: Record<string, number> = {};
  for (const e of state.log) eventCounts[e.kind] = (eventCounts[e.kind] ?? 0) + 1;
  const ender = state.log.find((e) => e.kind === 'victory' || e.kind === 'gameOver');
  return {
    v: 1,
    options: { ...state.options },
    outcome: state.status,
    nights: state.night,
    finalSuspicion: state.village.suspicion,
    peakSuspicion: curve.length > 0 ? Math.max(...curve) : state.village.suspicion,
    suspicionCurve: curve,
    eventCounts,
    endedBy: ender?.kind ?? 'running',
  };
}

export function appendTelemetry(file: string, record: TelemetryRecord): void {
  appendFileSync(file, JSON.stringify(record) + '\n');
}

export function readTelemetry(file: string): TelemetryRecord[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as TelemetryRecord);
}

export interface TelemetrySummary {
  runs: number;
  wins: number;
  losses: number;
  unfinished: number;
  avgNights: number;
  avgPeak: number;
  /** Mean Suspicion after each night, over the runs that reached it. */
  avgCurve: number[];
  endings: Record<string, number>;
  topEvents: Array<[string, number]>;
}

const mean = (xs: number[]) => (xs.length === 0 ? 0 : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10);

export function summarise(records: readonly TelemetryRecord[]): TelemetrySummary {
  const runs = records.length;
  const wins = records.filter((r) => r.outcome === 'won').length;
  const losses = records.filter((r) => r.outcome === 'lost').length;
  const longest = Math.max(0, ...records.map((r) => r.suspicionCurve.length));
  const avgCurve: number[] = [];
  for (let i = 0; i < longest; i++) {
    const vals = records.map((r) => r.suspicionCurve[i]).filter((v): v is number => v !== undefined);
    avgCurve.push(Math.round((vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length)) * 10) / 10);
  }
  const endings: Record<string, number> = {};
  const events: Record<string, number> = {};
  for (const r of records) {
    endings[r.endedBy] = (endings[r.endedBy] ?? 0) + 1;
    for (const [k, v] of Object.entries(r.eventCounts)) events[k] = (events[k] ?? 0) + v;
  }
  return {
    runs,
    wins,
    losses,
    unfinished: runs - wins - losses,
    avgNights: mean(records.map((r) => r.nights)),
    avgPeak: mean(records.map((r) => r.peakSuspicion)),
    avgCurve,
    endings,
    topEvents: Object.entries(events)
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, 10),
  };
}

export function formatSummary(s: TelemetrySummary): string {
  const lines = [
    `Runs: ${s.runs} (won ${s.wins}, lost ${s.losses}, unfinished ${s.unfinished})`,
    `Average nights: ${s.avgNights}. Average peak Suspicion: ${s.avgPeak}.`,
    `Mean Suspicion by dawn: ${s.avgCurve.join(' → ')}`,
    `Endings: ${Object.entries(s.endings).map(([k, v]) => `${k} ×${v}`).join(', ') || 'none'}`,
    'Most frequent events:',
    ...s.topEvents.map(([k, v]) => `  ${k.padEnd(18)} ${v}`),
  ];
  return lines.join('\n');
}

function main(argv: readonly string[]): number {
  const file = argv[0];
  if (!file) {
    process.stderr.write('usage: pnpm telemetry <runs.ndjson>\n');
    return 2;
  }
  process.stdout.write(formatSummary(summarise(readTelemetry(file))) + '\n');
  return 0;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  process.exitCode = main(process.argv.slice(2));
}
