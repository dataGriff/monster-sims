import { describe, expect, it } from 'vitest';
import { breakFurniture, breakRoom } from '../src/sim/house.ts';
import { GOLEM_BREAK_CHANCE } from '../src/sim/quirks.ts';
import {
  aNewGame,
  brokenFurnitureNames,
  duskAndNight,
  eventsOfKind,
  expectLogSays,
  fullNight,
  need,
  plan,
  rollAtLeast,
  rollBelow,
  seedWhere,
  setNeed,
} from './steps.ts';

describe('Feature: The Golem', () => {
  it('Scenario: Social can never rise above 20', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setNeed(game, 'golem', 'social', 5);
    duskAndNight(game, plan({ golem: 'socialise' }));
    expect(need(game, 'golem', 'social')).toBe(20);
  });

  it('Scenario: Socialising at the cap means nobody comes', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setNeed(game, 'golem', 'social', 20);
    duskAndNight(game, plan({ golem: 'socialise' }));
    expect(need(game, 'golem', 'social')).toBe(20);
    expectLogSays(game, 'bought a plant and no one came', 'golem');
  });

  it('Scenario: Energy recharges through the lightning rod', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    game.house.lightningRod = true;
    setNeed(game, 'golem', 'energy', 30);
    fullNight(game, plan({ golem: 'sleep' }));
    expect(need(game, 'golem', 'energy')).toBe(95);
  });

  it('Scenario: Without the lightning rod he does not recharge at all', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    game.house.lightningRod = false;
    setNeed(game, 'golem', 'energy', 30);
    fullNight(game, plan({ golem: 'sleep' }));
    expect(need(game, 'golem', 'energy')).toBe(25);
    expectLogSays(game, 'did not recharge', 'golem');
  });

  it('Scenario: He frequently breaks furniture and the whole house loses comfort', () => {
    const seed = seedWhere(rollBelow(GOLEM_BREAK_CHANCE));
    const game = aNewGame({ seed, suspicion: 30 });
    duskAndNight(game, plan({ golem: 'lieLow' }));
    expect(brokenFurnitureNames(game)).toHaveLength(1);
    expect(eventsOfKind(game, 'furnitureBroken', 'golem')).toHaveLength(1);
    expect(need(game, 'count', 'comfort')).toBe(70);
    expect(need(game, 'wolfman', 'comfort')).toBe(70);
    expect(need(game, 'golem', 'comfort')).toBe(80);
  });

  it('Scenario: On a careful night nothing breaks', () => {
    const seed = seedWhere(rollAtLeast(GOLEM_BREAK_CHANCE));
    const game = aNewGame({ seed, suspicion: 30 });
    duskAndNight(game, plan({ golem: 'lieLow' }));
    expect(brokenFurnitureNames(game)).toHaveLength(0);
    expect(need(game, 'count', 'comfort')).toBe(80);
  });

  it('Scenario: Repair fixes broken furniture and the lightning rod', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    breakFurniture(game.house, 'piano');
    game.house.lightningRod = false;
    duskAndNight(game, plan({ golem: 'repair' }));
    expect(brokenFurnitureNames(game)).not.toContain('piano');
    expect(game.house.lightningRod).toBe(true);
    expect(need(game, 'count', 'comfort')).toBe(90);
  });

  it('Scenario: A mob tearing up the roof takes the lightning rod with it', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    expect(game.house.lightningRod).toBe(true);
    const wrecked = breakRoom(game.house, 'roof');
    expect(game.house.lightningRod).toBe(false);
    expect(wrecked).toContain('lightning rod');
  });
});
