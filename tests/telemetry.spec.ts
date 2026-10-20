import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/cli/args.ts';
import { formatSummary, summarise, telemetryRecord } from '../src/cli/telemetry.ts';
import { play } from '../src/sim/loop.ts';

describe('Feature: Telemetry (opt-in)', () => {
  it('Scenario: A record describes one run', () => {
    const game = play(42);
    const record = telemetryRecord(game);
    expect(record).toMatchObject({ v: 1, outcome: 'won', nights: 7, endedBy: 'victory' });
    expect(record.suspicionCurve).toHaveLength(7);
    const total = Object.values(record.eventCounts).reduce((a, b) => a + b, 0);
    expect(total).toBe(game.log.length);
    expect(JSON.stringify(record)).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(Object.keys(record)).not.toContain('recordedAt');
  });

  it('Scenario: Records summarise', () => {
    const records = [1, 2, 3, 4, 5].map((seed) => telemetryRecord(play(seed)));
    const s = summarise(records);
    expect(s.runs).toBe(5);
    expect(s.wins + s.losses + s.unfinished).toBe(5);
    expect(s.avgCurve).toHaveLength(7);
    expect(s.avgCurve[0]).toBeCloseTo(records.reduce((a, r) => a + r.suspicionCurve[0]!, 0) / 5, 1);
    const text = formatSummary(s);
    expect(text).toContain('Runs: 5');
    expect(text).toContain('Most frequent events:');
  });

  it('Scenario: The CLI only records when asked', () => {
    expect(parseArgs(['--telemetry', 'runs.ndjson']).telemetry).toBe('runs.ndjson');
    expect(parseArgs([]).telemetry).toBeUndefined();
  });
});
