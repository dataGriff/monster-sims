import { describe, expect, it } from 'vitest';
import { getRoom } from '../src/sim/house.ts';
import { nextFloat } from '../src/sim/rng.ts';
import { HUNTER_ID, createHunter, hunter } from '../src/sim/townies.ts';
import type { GameState } from '../src/sim/types.ts';
import { aNewGame, befriend, expectLogSays, fullNight, logSays, plan, seedWhere, suspicionAtEndOfNight } from './steps.ts';

const IDLE = plan({});

function withHunter(game: GameState): GameState {
  game.village.townies.push(createHunter());
  game.village.hunterPresent = true;
  return game;
}

describe('Feature: Van Helsing', () => {
  it('Scenario: He arrives at 70', () => {
    const game = aNewGame({ seed: 42, suspicion: 70 });
    fullNight(game, IDLE);
    expect(game.village.hunterPresent).toBe(true);
    expect(hunter(game.village)?.id).toBe(HUNTER_ID);
    expectLogSays(game, 'taken a room at the inn');
  });

  it('Scenario: He snoops the most exposed room unless someone lies low', () => {
    const game = aNewGame({ seed: 42, suspicion: 70 });
    fullNight(game, IDLE);
    expectLogSays(game, 'snooped around the parlour');
    expect(suspicionAtEndOfNight(game)).toBe(77);
    fullNight(game, plan({ count: 'lieLow' }));
    expectLogSays(game, 'found the curtains drawn');
  });

  it('Scenario: A secret passage leaves him nothing to find', () => {
    const game = aNewGame({ seed: 42, suspicion: 70 });
    for (const r of game.house.rooms) if (r.id !== 'crypt') r.windows = 0;
    fullNight(game, IDLE);
    expectLogSays(game, 'nothing but a draught');
    expect(suspicionAtEndOfNight(game)).toBe(67);
  });

  it('Scenario: He can be distracted by a good talker', () => {
    // six townies are abroad at night once he is here; he is the last of them
    const seed = seedWhere((rng) => nextFloat(rng) >= 5 / 6);
    const game = withHunter(aNewGame({ seed, suspicion: 70 }));
    fullNight(game, plan({ wolfman: 'socialise' }));
    expectLogSays(game, 'snooped nowhere');
    expect(suspicionAtEndOfNight(game)).toBe(76);
  });

  it('Scenario: A befriended hunter stops snooping', () => {
    const game = withHunter(aNewGame({ seed: 42, suspicion: 70 }));
    befriend(game, HUNTER_ID, 'confidant');
    fullNight(game, IDLE);
    expect(logSays(game, 'snooped')).toBe(false);
    expect(suspicionAtEndOfNight(game)).toBe(67);
  });

  it('Scenario: He leaves when Suspicion drops below 50', () => {
    const game = withHunter(aNewGame({ seed: 42, suspicion: 45 }));
    fullNight(game, IDLE);
    expectLogSays(game, 'left on the morning coach');
    expect(game.village.hunterPresent).toBe(false);
    expect(hunter(game.village)).toBeUndefined();
  });

  it('Scenario: He can be turned', () => {
    const game = withHunter(aNewGame({ seed: 42, suspicion: 70 }));
    befriend(game, HUNTER_ID, 'thrall');
    fullNight(game, plan({ count: 'socialise' }));
    expect(game.monsters.map((m) => m.name)).toContain('The Monster hunter (turned)');
    expect(getRoom(game.house, 'crypt').id).toBe('crypt');
  });
});
