import { describe, expect, it } from 'vitest';
import { FIGHT_CHANCE, ROGUE_CHANCE } from '../src/sim/anger.ts';
import { GOLEM_BREAK_CHANCE } from '../src/sim/quirks.ts';
import {
  aNewGame,
  anyRoll,
  brokenFurnitureNames,
  duskAndNight,
  eventsOfKind,
  everyone,
  expectLogSays,
  fullNight,
  need,
  plan,
  rollAtLeast,
  rollBelow,
  rolls,
  seedWhere,
  setEveryonesNeed,
  setNeed,
  suspicionAtEndOfNight,
} from './steps.ts';

const IDLE = plan({});

describe('Feature: Household Anger', () => {
  it('Scenario: A calm household can hold a game night', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    game.house.householdAnger = 10;
    duskAndNight(game, plan(everyone('gameNight')));
    expect(need(game, 'wolfman', 'fun')).toBe(85);
    expect(need(game, 'wolfman', 'social')).toBe(75);
    expect(need(game, 'wolfman', 'anger')).toBe(0);
    expect(need(game, 'golem', 'social')).toBe(20);
    expectLogSays(game, 'dealt cards in the parlour', 'count');
  });

  it('Scenario: A cross household just bickers', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    game.house.householdAnger = 40;
    duskAndNight(game, plan(everyone('gameNight')));
    expect(need(game, 'wolfman', 'fun')).toBe(55);
    expect(need(game, 'wolfman', 'anger')).toBe(15);
    expectLogSays(game, 'too cross to play');
  });

  it('Scenario: A game night for one is patience', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    duskAndNight(game, plan({ count: 'gameNight' }));
    expect(need(game, 'count', 'fun')).toBe(65);
  });

  it('Scenario: An angry household fights and the lane hears it', () => {
    const seed = seedWhere(rolls(rollAtLeast(GOLEM_BREAK_CHANCE), rollBelow(FIGHT_CHANCE)));
    const game = aNewGame({ seed, suspicion: 30 });
    game.house.householdAnger = 60;
    fullNight(game, IDLE);
    expectLogSays(game, 'shouting match');
    expect(brokenFurnitureNames(game)).toHaveLength(1);
    expect(suspicionAtEndOfNight(game)).toBe(37);
  });

  it('Scenario: A furious household sends someone off-plan', () => {
    // dusk: rogue roll, then who; night: Golem's breakage roll, then the fight roll
    const seed = seedWhere(rolls(rollBelow(ROGUE_CHANCE), anyRoll(), rollAtLeast(GOLEM_BREAK_CHANCE), rollAtLeast(FIGHT_CHANCE)));
    const game = aNewGame({ seed, suspicion: 30 });
    game.house.householdAnger = 80;
    fullNight(game, plan(everyone('lieLow')));
    expectLogSays(game, 'ignored the plan');
    expect(eventsOfKind(game, 'idle')).toHaveLength(1);
    expect(suspicionAtEndOfNight(game)).toBe(36);
  });

  it('Scenario: Someone at the end of their tether moves out', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setNeed(game, 'wolfman', 'anger', 95);
    fullNight(game, IDLE);
    expectLogSays(game, 'moved out', 'wolfman');
    expect(game.monsters).toHaveLength(2);
    expect(game.departed).toContain('wolfman');
  });

  it('Scenario: An empty manor is a loss', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setEveryonesNeed(game, 'anger', 95);
    fullNight(game, IDLE);
    expect(game.status).toBe('lost');
    expectLogSays(game, 'The manor stands empty');
  });
});
