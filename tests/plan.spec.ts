import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAN, parsePlan, planForNight } from '../src/sim/plan.ts';
import { aNewGame, eventsOfKind, fullNight } from './steps.ts';

describe('Feature: Dusk plans', () => {
  it('Scenario: Plans accept the long form and the shorthand', () => {
    const long = parsePlan({
      nights: [
        { night: { count: 'feed' } },
        { night: { golem: 'sleep' }, day: { wolfman: 'coverJob' } },
      ],
    });
    expect(long.nights).toHaveLength(2);
    expect(long.nights[0]?.day).toBeUndefined();
    expect(long.nights[1]?.day).toEqual({ wolfman: 'coverJob' });

    const short = parsePlan([{ count: 'feed', wolfman: 'sleep' }]);
    expect(short.nights).toHaveLength(1);
    expect(short.nights[0]).toEqual({ night: { count: 'feed', wolfman: 'sleep' } });
  });

  it('Scenario: Malformed monster ids and unknown actions are rejected', () => {
    expect(() => parsePlan([{ 'The Mummy!': 'feed' }])).toThrow(/not a monster id/);
    expect(parsePlan([{ 'turned-baker': 'feed' }]).nights[0]?.night).toEqual({ 'turned-baker': 'feed' });
    expect(() => parsePlan([{ count: 'haunt' }])).toThrow(/unknown action "haunt"/);
    expect(() => parsePlan({})).toThrow(/plan must be/);
    const game = aNewGame({ seed: 42, suspicion: 30 });
    fullNight(game, { night: { mummy: 'feed' } });
    expect(eventsOfKind(game, 'planIgnored')[0]?.text).toContain('"mummy"');
  });

  it("Scenario: A short plan repeats its last night", () => {
    const plan = parsePlan([{ count: 'feed' }, { count: 'sleep' }]);
    expect(planForNight(plan, 5)).toEqual({ night: { count: 'sleep' } });
    expect(planForNight(plan, 1)).toEqual({ night: { count: 'feed' } });
  });

  it('Scenario: The default plan covers 7 nights', () => {
    expect(DEFAULT_PLAN.nights).toHaveLength(7);
  });
});
