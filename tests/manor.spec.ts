import { describe, expect, it } from 'vitest';
import { breakFurniture, getRoom, lightRoom, mostExposedRoom, roomExposure } from '../src/sim/house.ts';
import { aNewGame, dusk, everyone, expectLogSays, fullNight, logSays, plan, suspicionAtEndOfNight } from './steps.ts';

describe('Feature: The manor and its rooms', () => {
  it('Scenario: Exposure counts windows, light and wreckage', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    expect(roomExposure(game.house, 'parlour')).toBe(30);
    expect(roomExposure(game.house, 'kitchen')).toBe(20);
    lightRoom(game.house, 'kitchen');
    expect(roomExposure(game.house, 'kitchen')).toBe(35);
    breakFurniture(game.house, 'piano');
    expect(roomExposure(game.house, 'parlour')).toBe(35);
    expect(roomExposure(game.house, 'crypt')).toBe(0);
  });

  it('Scenario: The most exposed room is the one with the most windows, until something changes', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    expect(mostExposedRoom(game.house).id).toBe('parlour');
  });

  it('Scenario: Acting in a room at night lights it and the village sees', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    fullNight(game, plan({ wolfman: 'feed', golem: 'sleep' }));
    expect(getRoom(game.house, 'kitchen').lit).toBe(true);
    expect(getRoom(game.house, 'workshop').lit).toBe(true);
    expectLogSays(game, 'Lamplight showed in the kitchen and the workshop');
    expect(suspicionAtEndOfNight(game)).toBe(32);
    dusk(game, plan({}));
    expect(game.house.rooms.some((r) => r.lit)).toBe(false);
  });

  it('Scenario: Lying low keeps every light off', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    fullNight(game, plan(everyone('lieLow')));
    expect(logSays(game, 'Lamplight')).toBe(false);
    expect(suspicionAtEndOfNight(game)).toBe(21);
  });

  it('Scenario: Some rooms have a secret passage', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    expect(getRoom(game.house, 'crypt').secretPassage).toBe(true);
    expect(getRoom(game.house, 'kitchen').secretPassage).toBe(false);
  });
});
