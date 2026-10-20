import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/cli/args.ts';
import { createGame, play, runGame, runNight } from '../src/sim/loop.ts';
import { DEFAULT_PLAN, planForNight } from '../src/sim/plan.ts';
import { loadGame, parseSave, saveGame } from '../src/sim/save.ts';

function threeNights() {
  const game = createGame({ seed: 42 });
  for (let n = 1; n <= 3; n++) runNight(game, planForNight(DEFAULT_PLAN, n));
  return game;
}

describe('Feature: Save and load', () => {
  it('Scenario: A save replays to the identical state', () => {
    const game = threeNights();
    const save = saveGame(game);
    expect(save.plans).toHaveLength(3);
    const loaded = loadGame(JSON.parse(JSON.stringify(save)));
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(game));
    expect(loaded.night).toBe(3);
  });

  it('Scenario: A resumed run finishes the same as an unbroken one', () => {
    const loaded = loadGame(saveGame(threeNights()));
    runGame(loaded, DEFAULT_PLAN);
    const straight = play(42, DEFAULT_PLAN);
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(straight));
  });

  it('Scenario: Garbage saves are rejected', () => {
    expect(() => parseSave({ options: { seed: 1 }, plans: [] })).toThrow(/version/);
    expect(() => parseSave({ version: 1, options: {}, plans: [] })).toThrow(/seed/);
    expect(() => parseSave({ version: 1, options: { seed: 1 } })).toThrow(/plans/);
  });

  it('Scenario: The CLI can stop early, save, and resume', () => {
    expect(parseArgs(['--until', '3', '--save', 's.json'])).toMatchObject({ until: 3, save: 's.json' });
    expect(parseArgs(['--load', 's.json'])).toMatchObject({ load: 's.json' });
    expect(() => parseArgs(['--until', '0'])).toThrow(/--until/);
  });
});
