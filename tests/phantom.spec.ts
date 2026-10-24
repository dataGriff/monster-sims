import { describe, expect, it } from 'vitest';
import type { Archetype } from '../src/sim/types.ts';
import { aNewGame, brokenFurnitureNames, dawn, duskAndNight, expectLogSays, fullNight, need, plan, setNeed, suspicionAtEndOfNight, day } from './steps.ts';

const H: Archetype[] = ['count', 'wolfman', 'phantom'];

describe('Feature: The Phantom', () => {
  it('Scenario: Without an organ, lying low is humming in the dark', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    duskAndNight(game, plan({ phantom: 'lieLow' }));
    expect(need(game, 'phantom', 'fun')).toBe(65);
    expectLogSays(game, 'no organ in this house', 'phantom');
  });

  it('Scenario: With an organ the music carries', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    game.house.defences.organ = true;
    duskAndNight(game, plan({ phantom: 'lieLow' }));
    expect(need(game, 'phantom', 'fun')).toBe(90);
    dawn(game);
    day(game);
    expectLogSays(game, 'the music carried', 'phantom');
    expect(suspicionAtEndOfNight(game)).toBe(34);
  });

  it('Scenario: Company is no fun and counts for half', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    setNeed(game, 'phantom', 'social', 40);
    duskAndNight(game, plan({ phantom: 'socialise' }));
    expect(need(game, 'phantom', 'social')).toBe(55);
    expect(need(game, 'phantom', 'fun')).toBe(50);
  });

  it('Scenario: At 60 anger the chandelier comes down', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    setNeed(game, 'phantom', 'anger', 70);
    fullNight(game, plan({}));
    expect(brokenFurnitureNames(game)).toContain('armchair');
    expect(need(game, 'phantom', 'anger')).toBe(35);
    expect(suspicionAtEndOfNight(game)).toBe(44);
    expectLogSays(game, 'brought the chandelier down', 'phantom');
  });
});
