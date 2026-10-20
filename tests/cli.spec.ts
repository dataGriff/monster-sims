import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/cli/args.ts';
import { formatGame, formatVerbose } from '../src/cli/format.ts';
import { play } from '../src/sim/loop.ts';

describe('Feature: Text-mode runner', () => {
  it('Scenario: Arguments', () => {
    const args = parseArgs(['--seed', '7', '--plan', 'p.json', '--nights', '14', '--verbose']);
    expect(args).toMatchObject({ seed: 7, plan: 'p.json', nights: 14, verbose: true, json: false });
    expect(() => parseArgs(['--seed', 'abc'])).toThrow(/--seed/);
    expect(() => parseArgs(['--bogus'])).toThrow(/Unknown argument/);
  });

  it('Scenario: The compact log has one headline per night and a result', () => {
    const game = play(42);
    const lines = formatGame(game, 42).split('\n');
    for (let n = 1; n <= 7; n++) {
      const headline = lines.find((l) => l.startsWith(`Night ${n} —`));
      expect(headline, `night ${n}`).toBeDefined();
      expect(headline).toMatch(/Suspicion \d+ -> \d+( \(incl\. rumour \+\d+\))?\.$/);
    }
    expect(lines.filter((l) => /^Night \d+ —/.test(l))).toHaveLength(7);
    expect(lines.at(-2)).toMatch(/^Result: /);
  });

  it('Scenario: The verbose log prints one plain-English line per event', () => {
    const game = play(42);
    const lines = formatVerbose(game, 42).split('\n');
    const headers = lines.filter((l) => /^(== Night \d+ ==|-- \w+ --)$/.test(l));
    const body = lines.filter((l) => l !== '' && !/^(== Night \d+ ==|-- \w+ --)$/.test(l));
    expect(body).toHaveLength(game.log.length + 1); // + title line
    expect(headers.filter((h) => h.startsWith('== Night'))).toHaveLength(7);
    for (const e of game.log) expect(body).toContain(e.text);
  });
});
