import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/cli/args.ts';
import { isHuntNight } from '../src/sim/archetypes/welsh.ts';
import { createGame } from '../src/sim/loop.ts';
import { VALLEY_HOUSEHOLD } from '../src/sim/monsters.ts';
import type { GameState } from '../src/sim/types.ts';
import { dawn, day, duskAndNight, eventsOfKind, expectLogSays, fullNight, itIsTheDuskOfNight, logSays, need, plan, setNeed, suspicionAtEndOfNight, townie } from './steps.ts';

function valley(suspicion = 30): GameState {
  return createGame({ seed: 42, setting: 'valley', household: [...VALLEY_HOUSEHOLD], suspicion });
}
const IDLE = plan({});

describe('Feature: The Welsh folklore set', () => {
  it('Scenario: The terrace', () => {
    const game = valley();
    expect(game.village.townies).toHaveLength(10);
    expect(game.village.townies.map((t) => t.name)).toEqual(expect.arrayContaining(['the minister', 'Mam-gu at the end of the terrace']));
    expect(game.monsters.map((m) => m.name)).toEqual(['Y Gwyllgi', 'Cŵn Annwn', 'Gwrach y Rhibyn']);
  });

  it('Scenario: The cunning man comes down from the mountain at 70', () => {
    const game = valley(70);
    fullNight(game, IDLE);
    expectLogSays(game, 'The dyn hysbys has come down from the mountain');
  });

  it('Scenario: The black dog is an omen, not a friend', () => {
    const game = valley();
    setNeed(game, 'gwyllgi', 'social', 40);
    duskAndNight(game, plan({ gwyllgi: 'socialise' }));
    expect(need(game, 'gwyllgi', 'social')).toBe(40);
    dawn(game);
    day(game);
    expectLogSays(game, 'crossed themselves', 'gwyllgi');
    expect(suspicionAtEndOfNight(game)).toBe(40);
  });

  it('Scenario: Y Gwyllgi feeds on the mountain', () => {
    const game = valley();
    fullNight(game, plan({ gwyllgi: 'feed' }));
    expectLogSays(game, 'sheep', 'gwyllgi');
    expect(logSays(game, 'Lamplight')).toBe(false);
  });

  it('Scenario: Every third night the hounds ride', () => {
    expect([1, 2, 3, 6].map(isHuntNight)).toEqual([false, false, true, true]);
    const game = valley();
    itIsTheDuskOfNight(game, 3);
    duskAndNight(game, plan({ cwnannwn: 'sleep' }));
    expect(eventsOfKind(game, 'action', 'cwnannwn')).toHaveLength(0);
    expect(need(game, 'cwnannwn', 'fun')).toBe(100);
    expect(need(game, 'cwnannwn', 'hunger')).toBe(100);
    dawn(game);
    day(game);
    expect(suspicionAtEndOfNight(game)).toBe(46);
  });

  it('Scenario: Hygiene and bladder mean nothing to the hounds', () => {
    const game = valley();
    fullNight(game, IDLE);
    expect(need(game, 'cwnannwn', 'hygiene')).toBe(100);
    expect(need(game, 'cwnannwn', 'bladder')).toBe(100);
  });

  it("Scenario: Gwrach y Rhibyn wails at a frightened villager's window", () => {
    const game = valley();
    townie(game, 'minister').awareness = 55;
    fullNight(game, IDLE);
    expectLogSays(game, "wailed at the minister's window", 'gwrach');
    expect(townie(game, 'minister').awareness).toBe(70);
    expect(need(game, 'gwrach', 'fun')).toBe(80);
    expect(suspicionAtEndOfNight(game)).toBe(39);
  });

  it('Scenario: Mist at the crossroads', () => {
    const game = valley();
    fullNight(game, plan({ gwrach: 'lieLow' }));
    expect(suspicionAtEndOfNight(game)).toBe(25);
  });

  it('Scenario: The CLI knows the valley', () => {
    expect(parseArgs(['--setting', 'valley']).setting).toBe('valley');
    expect(() => parseArgs(['--setting', 'moon'])).toThrow(/--setting/);
  });
});
