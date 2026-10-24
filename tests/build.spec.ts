import { describe, expect, it } from 'vitest';
import { coverJobFailChance } from '../src/sim/actions.ts';
import { CATALOGUE } from '../src/sim/build.ts';
import { findMonster } from '../src/sim/context.ts';
import { breakFurniture } from '../src/sim/house.ts';
import {
  aNewGame,
  brokenFurnitureNames,
  dusk,
  duskAndNight,
  expectLogSays,
  fullNight,
  need,
  plan,
  rollAtLeast,
  seedWhere,
  setNeed,
} from './steps.ts';

describe('Feature: Basic build mode', () => {
  it('Scenario: The catalogue and the purse', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    expect(CATALOGUE).toHaveLength(15);
    for (const id of ['coffin', 'slab', 'sarcophagus', 'tub', 'lightningRod']) {
      expect(CATALOGUE.some((i) => i.id === id)).toBe(true);
    }
    expect(game.house.coin).toBe(20);
  });

  it('Scenario: A successful shift pays', () => {
    const probe = aNewGame({ seed: 42, suspicion: 30 });
    const p = coverJobFailChance({ state: probe, phase: 'night' }, findMonster(probe, 'golem'));
    const game = aNewGame({ seed: seedWhere(rollAtLeast(p)), suspicion: 30 });
    fullNight(game, plan({ golem: 'coverJob' }));
    expect(game.house.coin).toBe(26);
  });

  it('Scenario: Buying replaces a broken bed', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    breakFurniture(game.house, 'cot');
    dusk(game, { night: {}, build: ['cot'] });
    expect(brokenFurnitureNames(game)).not.toContain('camp cot');
    expect(game.house.coin).toBe(15);
    expectLogSays(game, 'Bought a camp cot');
  });

  it('Scenario: You cannot buy what you already have or cannot afford', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    dusk(game, { night: {}, build: ['cot', 'drawbridge'] });
    expectLogSays(game, 'already in the attic');
    expectLogSays(game, 'Could not afford the drawbridge');
    expect(game.house.coin).toBe(20);
  });

  it('Scenario: A broken bed halves what sleep restores', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    breakFurniture(game.house, 'coffin');
    setNeed(game, 'count', 'energy', 30);
    duskAndNight(game, plan({ count: 'sleep' }));
    expect(need(game, 'count', 'energy')).toBe(50);
    expectLogSays(game, 'on the floor', 'count');
  });

  it('Scenario: Buying the lightning rod brings the Golem back to life', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    game.house.lightningRod = false;
    dusk(game, { night: {}, build: ['lightningRod'] });
    expect(game.house.lightningRod).toBe(true);
    expect(game.house.coin).toBe(0);
  });
});
