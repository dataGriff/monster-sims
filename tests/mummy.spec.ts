import { describe, expect, it } from 'vitest';
import { breakFurniture } from '../src/sim/house.ts';
import { GOLEM_BREAK_CHANCE, HOARD_CHANCE } from '../src/sim/quirks.ts';
import type { Archetype, GameState } from '../src/sim/types.ts';
import {
  aNewGame,
  anyRoll,
  duskAndNight,
  eventsOfKind,
  expectLogSays,
  fullNight,
  fullNights,
  logSays,
  need,
  plan,
  rollAtLeast,
  rollBelow,
  rolls,
  seedWhere,
  setNeed,
  setNeeds,
} from './steps.ts';

const HOUSEHOLD: Archetype[] = ['count', 'wolfman', 'golem', 'mummy'];
const IDLE = plan({});

function withJar(game: GameState): GameState {
  game.house.furniture.push({ id: 'artefact-1', name: 'canopic jar', room: 'crypt', broken: false, artefact: true });
  return game;
}

describe('Feature: The Mummy', () => {
  it('Scenario: Energy is always full and there is no bladder', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: HOUSEHOLD });
    setNeeds(game, 'mummy', { energy: 50, bladder: 30 });
    fullNight(game, IDLE);
    expect(need(game, 'mummy', 'energy')).toBe(100);
    expect(need(game, 'mummy', 'bladder')).toBe(100);
    const causes = eventsOfKind(game, 'anger', 'mummy').map((e) => String(e.data?.['causes']));
    expect(causes.some((c) => c.includes('energy') || c.includes('bladder'))).toBe(false);
  });

  it('Scenario: Comfort drops as the bandages unravel', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: HOUSEHOLD });
    fullNight(game, IDLE);
    expect(need(game, 'mummy', 'comfort')).toBe(68);
  });

  it('Scenario: A night in the sarcophagus rewraps him', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: HOUSEHOLD });
    setNeed(game, 'mummy', 'comfort', 50);
    duskAndNight(game, plan({ mummy: 'sleep' }));
    expect(need(game, 'mummy', 'comfort')).toBe(80);
    expectLogSays(game, 'rewrapped by morning', 'mummy');
  });

  it('Scenario: Without a sarcophagus he just unravels on the floor', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: HOUSEHOLD });
    breakFurniture(game.house, 'sarcophagus');
    setNeed(game, 'mummy', 'comfort', 50);
    duskAndNight(game, plan({ mummy: 'sleep' }));
    expect(need(game, 'mummy', 'comfort')).toBe(50);
    expectLogSays(game, 'unravelled a little more', 'mummy');
  });

  it('Scenario: Every action costs two slots', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: HOUSEHOLD });
    fullNights(game, plan({ mummy: 'feed' }), 3);
    expect(eventsOfKind(game, 'action', 'mummy')).toHaveLength(2);
    const busy = eventsOfKind(game, 'busy', 'mummy');
    expect(busy).toHaveLength(1);
    expect(busy[0]?.text).toContain('cannot feed yet');
  });

  it('Scenario: He hoards artefacts and they cheer him up', () => {
    const seed = seedWhere(rolls(anyRoll(), rollBelow(HOARD_CHANCE)));
    const game = aNewGame({ seed, suspicion: 30, household: HOUSEHOLD });
    fullNight(game, plan({ mummy: 'coverJob' }));
    expect(game.house.furniture.some((f) => f.artefact && f.room === 'crypt')).toBe(true);
    expectLogSays(game, 'under one arm', 'mummy');
    expect(need(game, 'mummy', 'fun')).toBe(47);
  });

  it('Scenario: Moving an artefact curses the mover', () => {
    const game = withJar(aNewGame({ seed: 42, suspicion: 30, household: HOUSEHOLD }));
    duskAndNight(game, plan({ wolfman: 'repair' }));
    expect(need(game, 'wolfman', 'comfort')).toBe(70);
    expect(need(game, 'wolfman', 'hygiene')).toBe(70);
    expect(need(game, 'wolfman', 'anger')).toBe(20);
    expectLogSays(game, 'moved the canopic jar', 'wolfman');
  });

  it('Scenario: The Mummy may handle his own things', () => {
    const game = withJar(aNewGame({ seed: 42, suspicion: 30, household: HOUSEHOLD }));
    duskAndNight(game, plan({ mummy: 'repair' }));
    expect(logSays(game, 'A dry wind')).toBe(false);
  });

  it('Scenario: Breaking an artefact is worse luck still', () => {
    // intact furniture: 8 base + sarcophagus + the jar = 10; the jar is last
    const seed = seedWhere(rolls(rollBelow(GOLEM_BREAK_CHANCE), rollAtLeast(9 / 10)));
    const game = withJar(aNewGame({ seed, suspicion: 30, household: HOUSEHOLD }));
    duskAndNight(game, IDLE);
    expectLogSays(game, 'broke the canopic jar', 'golem');
  });
});
