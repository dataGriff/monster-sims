import { describe, expect, it } from 'vitest';
import { getRoom } from '../src/sim/house.ts';
import { FOG_LOST_CHANCE } from '../src/sim/mob.ts';
import { GOLEM_BREAK_CHANCE } from '../src/sim/quirks.ts';
import { MOB_ATTACK_CHANCE } from '../src/sim/village.ts';
import type { RngState } from '../src/sim/types.ts';
import { nextFloat } from '../src/sim/rng.ts';
import {
  aNewGame,
  brokenFurnitureNames,
  eventsOfKind,
  expectLogSays,
  fullNight,
  logSays,
  need,
  plan,
  rollAtLeast,
  rollBelow,
  rolls,
  seedWhere,
} from './steps.ts';

const IDLE = plan({});
const careful = rollAtLeast(GOLEM_BREAK_CHANCE);
const attacks = rollBelow(MOB_ATTACK_CHANCE);
/** A roll that would have been an attack without the organ, but is not with it. */
const nerveFails = (rng: RngState) => {
  const r = nextFloat(rng);
  return r >= MOB_ATTACK_CHANCE / 2 && r < MOB_ATTACK_CHANCE;
};

describe('Feature: Mob behaviour', () => {
  it('Scenario: The mob targets the most exposed room', () => {
    const game = aNewGame({ seed: seedWhere(rolls(careful, attacks)), suspicion: 90 });
    fullNight(game, IDLE);
    expect(eventsOfKind(game, 'mobAttack')[0]?.data?.['room']).toBe('parlour');
    for (const m of game.monsters) expect(need(game, m.id, 'comfort')).toBe(60);
  });

  it('Scenario: A raised drawbridge keeps the mob out', () => {
    const game = aNewGame({ seed: seedWhere(rolls(careful, attacks)), suspicion: 90 });
    game.house.defences.drawbridge = true;
    fullNight(game, IDLE);
    expectLogSays(game, 'found the drawbridge raised');
    expect(brokenFurnitureNames(game)).toHaveLength(0);
    for (const m of game.monsters) expect(need(game, m.id, 'comfort')).toBe(75);
  });

  it('Scenario: The fog machine may lose the mob in the millpond', () => {
    const game = aNewGame({ seed: seedWhere(rolls(careful, attacks, rollBelow(FOG_LOST_CHANCE))), suspicion: 90 });
    game.house.defences.fogMachine = true;
    fullNight(game, IDLE);
    expectLogSays(game, 'ended up in the millpond');
    expect(brokenFurnitureNames(game)).toHaveLength(0);
  });

  it('Scenario: Decoy coffins send the mob home satisfied, once', () => {
    const game = aNewGame({ seed: seedWhere(rolls(careful, attacks)), suspicion: 90 });
    game.house.defences.decoyCoffins = true;
    fullNight(game, IDLE);
    expectLogSays(game, 'burned them in the yard');
    expect(game.house.defences.decoyCoffins).toBe(false);
    expect(game.village.suspicion).toBe(87);
  });

  it('Scenario: The organ halves the chance the mob works up the nerve', () => {
    const game = aNewGame({ seed: seedWhere(rolls(careful, nerveFails)), suspicion: 90 });
    game.house.defences.organ = true;
    fullNight(game, IDLE);
    expectLogSays(game, 'The organ played a dirge');
    expect(logSays(game, 'The mob stormed')).toBe(false);
  });

  it('Scenario: A secret passage lets the household slip out', () => {
    const game = aNewGame({ seed: seedWhere(rolls(careful, attacks)), suspicion: 94 });
    getRoom(game.house, 'parlour').windows = 1;
    getRoom(game.house, 'kitchen').secretPassage = true;
    fullNight(game, IDLE);
    expect(eventsOfKind(game, 'mobAttack')[0]?.data?.['room']).toBe('kitchen');
    expectLogSays(game, 'slipped out through the passage');
    for (const m of game.monsters) expect(need(game, m.id, 'comfort')).toBe(75);
  });

  it('Scenario: At 100 the mob takes the resident whose light they watched', () => {
    const game = aNewGame({ seed: 42, suspicion: 96 });
    fullNight(game, plan({ golem: 'sleep' }));
    expect(game.status).toBe('running');
    expect(game.taken).toEqual(['golem']);
    expect(game.monsters).toHaveLength(2);
    expect(game.village.suspicion).toBe(75);
  });

  it('Scenario: At 100 decoy coffins buy the manor another chance', () => {
    const game = aNewGame({ seed: 42, suspicion: 96 });
    game.house.defences.decoyCoffins = true;
    fullNight(game, IDLE);
    expect(game.status).toBe('running');
    expect(game.house.defences.decoyCoffins).toBe(false);
    expect(game.village.suspicion).toBe(80);
  });

  it('Scenario: At 100 with nobody exposed and no decoys, the manor falls', () => {
    const game = aNewGame({ seed: 42, suspicion: 96 });
    fullNight(game, IDLE);
    expect(game.status).toBe('lost');
  });
});
