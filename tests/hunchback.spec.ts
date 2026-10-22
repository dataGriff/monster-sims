import { describe, expect, it } from 'vitest';
import { coverJobFailChance } from '../src/sim/actions.ts';
import { findMonster } from '../src/sim/context.ts';
import type { Archetype } from '../src/sim/types.ts';
import { aNewGame, dawn, day, duskAndNight, eventsOfKind, everyone, expectLogSays, fullNight, need, plan, rollAtLeast, seedWhere, setNeed, suspicionAtEndOfNight } from './steps.ts';

const H: Archetype[] = ['count', 'wolfman', 'hunchback'];

describe('Feature: The Hunchback', () => {
  it('Scenario: Villagers are not company', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    setNeed(game, 'hunchback', 'social', 40);
    duskAndNight(game, plan({ hunchback: 'socialise' }));
    expect(need(game, 'hunchback', 'social')).toBe(40);
  });

  it('Scenario: Lying low on the roof is sanctuary among the gargoyles', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    setNeed(game, 'hunchback', 'social', 40);
    duskAndNight(game, plan({ hunchback: 'lieLow' }));
    expect(need(game, 'hunchback', 'social')).toBe(55);
    dawn(game);
    day(game);
    expectLogSays(game, 'claimed sanctuary', 'hunchback');
    expect(suspicionAtEndOfNight(game)).toBe(24);
  });

  it('Scenario: The bells never fail him but leave him deaf', () => {
    const probe = aNewGame({ seed: 42, suspicion: 30, household: H });
    expect(coverJobFailChance({ state: probe, phase: 'night' }, findMonster(probe, 'hunchback'))).toBeCloseTo(0.02);
    const game = aNewGame({ seed: seedWhere(rollAtLeast(0.02)), suspicion: 30, household: H });
    setNeed(game, 'hunchback', 'social', 40);
    fullNight(game, plan({ hunchback: 'coverJob' }));
    expectLogSays(game, 'ears rang', 'hunchback');
    expect(suspicionAtEndOfNight(game)).toBe(20);
  });

  it('Scenario: He can ring the noon bell too', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    fullNight(game, plan({ ...everyone('lieLow'), hunchback: 'lieLow' }, { hunchback: 'coverJob' }));
    expect(eventsOfKind(game, 'action', 'hunchback').some((e) => e.phase === 'day')).toBe(true);
  });
});
