import { describe, expect, it } from 'vitest';
import { FLOOD_CHANCE } from '../src/sim/archetypes/lakeling.ts';
import { breakFurniture } from '../src/sim/house.ts';
import type { Archetype } from '../src/sim/types.ts';
import { aNewGame, duskAndNight, expectLogSays, fullNight, logSays, need, plan, rollAtLeast, rollBelow, seedWhere, setNeed, suspicionAtEndOfNight } from './steps.ts';

const H: Archetype[] = ['count', 'wolfman', 'lakeling'];
const IDLE = plan({});

describe('Feature: The Lake Creature', () => {
  it('Scenario: Wetness drains fast', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    fullNight(game, IDLE);
    expect(need(game, 'lakeling', 'hygiene')).toBe(80);
  });

  it('Scenario: Below 20 he dries out', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    setNeed(game, 'lakeling', 'hygiene', 30);
    fullNight(game, IDLE);
    expect(need(game, 'lakeling', 'comfort')).toBe(60);
    expectLogSays(game, 'drying out', 'lakeling');
  });

  it('Scenario: A night in the tub soaks him back to full', () => {
    const game = aNewGame({ seed: seedWhere(rollAtLeast(FLOOD_CHANCE)), suspicion: 30, household: H });
    setNeed(game, 'lakeling', 'hygiene', 30);
    duskAndNight(game, plan({ lakeling: 'sleep' }));
    expect(need(game, 'lakeling', 'hygiene')).toBe(100);
    expectLogSays(game, 'soaked all night', 'lakeling');
  });

  it('Scenario: Half the time the tub goes over and the hall floods', () => {
    const game = aNewGame({ seed: seedWhere(rollBelow(FLOOD_CHANCE)), suspicion: 30, household: H });
    fullNight(game, plan({ lakeling: 'sleep' }));
    expectLogSays(game, 'water ran out under the front door');
    expect(need(game, 'count', 'comfort')).toBe(70);
    expect(suspicionAtEndOfNight(game)).toBe(37);
  });

  it('Scenario: Without a tub he sleeps damp on the flagstones', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    breakFurniture(game.house, 'tub');
    setNeed(game, 'lakeling', 'hygiene', 30);
    duskAndNight(game, plan({ lakeling: 'sleep' }));
    expect(need(game, 'lakeling', 'hygiene')).toBe(30);
    expectLogSays(game, 'no tub', 'lakeling');
  });

  it('Scenario: He feeds from the moat, not the kitchen', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: H });
    fullNight(game, plan({ lakeling: 'feed' }));
    expectLogSays(game, 'carp', 'lakeling');
    expect(logSays(game, 'Lamplight')).toBe(false);
  });
});
