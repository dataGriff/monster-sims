import { describe, expect, it } from 'vitest';
import { isFullMoon } from '../src/sim/context.ts';
import {
  aNewGame,
  brokenFurnitureNames,
  dusk,
  duskAndNight,
  eventsOfKind,
  expectLogSays,
  fullNight,
  itIsTheDuskOfNight,
  need,
  plan,
  setNeeds,
  suspicionAtEndOfNight,
  everyone,
  dawn,
  day,
} from './steps.ts';

const KITCHEN = ['kitchen table', 'stove'];

describe('Feature: The Wolf Man', () => {
  it('Scenario: The moon is full every 7th night', () => {
    for (let n = 1; n <= 6; n++) expect(isFullMoon(n)).toBe(false);
    expect(isFullMoon(7)).toBe(true);
    expect(isFullMoon(14)).toBe(true);
  });

  it('Scenario: Full moon crashes hygiene and comfort and maxes fun', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    itIsTheDuskOfNight(game, 7);
    setNeeds(game, 'wolfman', { hygiene: 80, comfort: 80, fun: 60 });
    dusk(game, plan({ wolfman: 'sleep' }));
    expect(need(game, 'wolfman', 'hygiene')).toBe(0);
    expect(need(game, 'wolfman', 'comfort')).toBe(0);
    expect(need(game, 'wolfman', 'fun')).toBe(100);
  });

  it('Scenario: Full moon blackout wrecks the kitchen and raises Suspicion', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    itIsTheDuskOfNight(game, 7);
    fullNight(game, plan({ wolfman: 'sleep' }));
    expect(eventsOfKind(game, 'action', 'wolfman')).toHaveLength(0);
    expect(brokenFurnitureNames(game)).toEqual(expect.arrayContaining(KITCHEN));
    expectLogSays(game, 'remembers nothing', 'wolfman');
    expect(suspicionAtEndOfNight(game)).toBe(49);
  });

  it('Scenario: A cover-job shift on a full moon is a disaster', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    itIsTheDuskOfNight(game, 7);
    fullNight(game, plan({ wolfman: 'coverJob' }));
    expectLogSays(game, 'ended in disaster', 'wolfman');
    expect(suspicionAtEndOfNight(game)).toBe(59);
  });

  it('Scenario: On an ordinary night he just does his job', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    itIsTheDuskOfNight(game, 3);
    duskAndNight(game, plan({ wolfman: 'sleep' }));
    expect(eventsOfKind(game, 'action', 'wolfman')).toHaveLength(1);
    expect(brokenFurnitureNames(game).filter((n) => KITCHEN.includes(n))).toHaveLength(0);
  });

  it('Scenario: Only the Wolf Man can act in daylight', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    duskAndNight(game, plan(everyone('lieLow'), everyone('coverJob')));
    dawn(game);
    day(game);
    const dayActions = eventsOfKind(game, 'action').filter((e) => e.phase === 'day');
    expect(dayActions.map((e) => e.monsterId)).toEqual(['wolfman']);
    expect(eventsOfKind(game, 'daylightRefused').map((e) => e.monsterId)).toEqual(['count', 'golem']);
  });
});
