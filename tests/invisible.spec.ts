import { describe, expect, it } from 'vitest';
import { GOLEM_BREAK_CHANCE, STEAL_CHANCE } from '../src/sim/quirks.ts';
import type { Archetype } from '../src/sim/types.ts';
import {
  aNewGame,
  duskAndNight,
  everyone,
  expectLogSays,
  fullNight,
  need,
  plan,
  rollAtLeast,
  rollBelow,
  rolls,
  seedWhere,
  setNeed,
  suspicionAtEndOfNight,
} from './steps.ts';

const HOUSEHOLD: Archetype[] = ['count', 'wolfman', 'golem', 'invisible'];

describe('Feature: The Invisible Man', () => {
  it('Scenario: Social only fills while he is visible', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: HOUSEHOLD });
    game.house.householdAnger = 10;
    setNeed(game, 'invisible', 'social', 40);
    duskAndNight(game, plan({ ...everyone('gameNight'), invisible: 'gameNight' }));
    expect(need(game, 'wolfman', 'social')).toBe(75);
    expect(need(game, 'invisible', 'social')).toBe(40);
    expectLogSays(game, 'Nobody could see him', 'invisible');
  });

  it('Scenario: Going out means wrapping up, and then company counts', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: HOUSEHOLD });
    setNeed(game, 'invisible', 'social', 40);
    duskAndNight(game, plan({ invisible: 'socialise' }));
    expect(need(game, 'invisible', 'social')).toBe(70);
    expectLogSays(game, 'put the hat on', 'invisible');
  });

  it('Scenario: Lying low means pranks', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: HOUSEHOLD });
    duskAndNight(game, plan({ invisible: 'lieLow' }));
    expect(need(game, 'invisible', 'fun')).toBe(85);
    const victims = game.monsters.filter((m) => m.id !== 'invisible' && m.needs.comfort === 70);
    expect(victims).toHaveLength(1);
    expectLogSays(game, 'short-sheeted', 'invisible');
  });

  it('Scenario: Food goes missing and the household gets cross', () => {
    const seed = seedWhere(rolls(rollAtLeast(GOLEM_BREAK_CHANCE), rollBelow(STEAL_CHANCE)));
    const game = aNewGame({ seed, suspicion: 30, household: HOUSEHOLD });
    duskAndNight(game, plan({}));
    expect(need(game, 'invisible', 'hunger')).toBe(90);
    const robbed = game.monsters.filter((m) => m.needs.hunger === 70 && m.needs.anger === 20);
    expect(robbed).toHaveLength(1);
    expect(robbed[0]?.id).not.toBe('count');
    expectLogSays(game, 'walked off the plate');
  });

  it('Scenario: Whatever he does raises the least Suspicion', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: HOUSEHOLD });
    fullNight(game, plan({ invisible: 'socialise' }));
    expect(suspicionAtEndOfNight(game)).toBe(35);
    expectLogSays(game, 'Hardly anyone noticed', 'invisible');
    const control = aNewGame({ seed: 42, suspicion: 30, household: HOUSEHOLD });
    fullNight(control, plan({ wolfman: 'socialise' }));
    expect(suspicionAtEndOfNight(control)).toBe(36);
  });

  it('Scenario: Even a bad shift is only half noticed', () => {
    const game = aNewGame({ seed: seedWhere(rollBelow(0.2)), suspicion: 30, household: HOUSEHOLD });
    fullNight(game, plan({ invisible: 'coverJob' }));
    expect(suspicionAtEndOfNight(game)).toBe(37);
  });
});
