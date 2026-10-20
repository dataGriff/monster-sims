import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/cli/args.ts';
import { isFullMoon } from '../src/sim/context.ts';
import { DIFFICULTIES, RUN_LENGTHS } from '../src/sim/difficulty.ts';
import { createGame } from '../src/sim/loop.ts';
import { expectLogSays, fullNight, plan, suspicionAtEndOfNight } from './steps.ts';

const IDLE = plan({});

describe('Feature: Difficulty and run length', () => {
  it('Scenario: The presets', () => {
    expect([DIFFICULTIES.gentle, DIFFICULTIES.standard, DIFFICULTIES.harsh].map((d) => d.startingSuspicion)).toEqual([25, 30, 35]);
    expect([DIFFICULTIES.gentle, DIFFICULTIES.standard, DIFFICULTIES.harsh].map((d) => d.quietDrift)).toEqual([5, 3, 2]);
    expect(Object.values(RUN_LENGTHS)).toEqual([7, 14, 28]);
    for (const n of Object.values(RUN_LENGTHS)) expect(isFullMoon(n)).toBe(true);
    expect(createGame({ seed: 1, difficulty: 'harsh' }).village.suspicion).toBe(35);
  });

  it('Scenario: A gentle village forgets faster', () => {
    const gentle = createGame({ seed: 42, difficulty: 'gentle', suspicion: 50 });
    fullNight(gentle, IDLE);
    expect(suspicionAtEndOfNight(gentle)).toBe(45);
    const harsh = createGame({ seed: 42, difficulty: 'harsh', suspicion: 50 });
    fullNight(harsh, IDLE);
    expect(suspicionAtEndOfNight(harsh)).toBe(48);
  });

  it('Scenario: A harsh village talks louder', () => {
    const game = createGame({ seed: 42, difficulty: 'harsh', suspicion: 30 });
    fullNight(game, plan({ wolfman: 'socialise' }));
    expect(suspicionAtEndOfNight(game)).toBe(37);
  });

  it('Scenario: Sandbox mode never ends the run', () => {
    const game = createGame({ seed: 42, sandbox: true, suspicion: 96 });
    fullNight(game, IDLE);
    expect(game.status).toBe('running');
    expect(game.village.suspicion).toBe(85);
    expectLogSays(game, 'in this sandbox');
  });

  it('Scenario: The CLI exposes all three', () => {
    expect(parseArgs(['--run', 'long', '--difficulty', 'harsh', '--sandbox'])).toMatchObject({ nights: 28, difficulty: 'harsh', sandbox: true });
    expect(() => parseArgs(['--difficulty', 'brutal'])).toThrow(/--difficulty/);
  });
});
