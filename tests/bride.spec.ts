import { describe, expect, it } from 'vitest';
import type { Archetype } from '../src/sim/types.ts';
import { aNewGame, dawn, day, duskAndNight, eventsOfKind, expectLogSays, need, plan, setNeed, suspicionAtEndOfNight } from './steps.ts';

const H: Archetype[] = ['count', 'golem', 'bride'];

describe('Feature: The Bride', () => {
  it('Scenario: She will not be paired with the Golem', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    duskAndNight(game, plan({ golem: 'sleep', bride: 'sleep' }));
    expect(eventsOfKind(game, 'action', 'bride')[0]?.data?.['action']).toBe('lieLow');
    expectLogSays(game, 'was not asked', 'bride');
  });

  it('Scenario: Lying low ends in a shriek', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    duskAndNight(game, plan({ bride: 'lieLow' }));
    expect(need(game, 'bride', 'fun')).toBe(90);
    dawn(game);
    day(game);
    expect(suspicionAtEndOfNight(game)).toBe(35);
  });

  it('Scenario: Without the lightning rod she does not recharge', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    game.house.lightningRod = false;
    setNeed(game, 'bride', 'energy', 50);
    duskAndNight(game, plan({ bride: 'sleep', golem: 'feed' }));
    expect(need(game, 'bride', 'energy')).toBe(50);
  });
});
