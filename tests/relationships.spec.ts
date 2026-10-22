import { describe, expect, it } from 'vitest';
import { SOCIAL_BOND, SOCIAL_BOND_CAP, advanceBond, stageRank } from '../src/sim/townies.ts';
import type { GameState } from '../src/sim/types.ts';
import { aNewGame, befriend, eventsOfKind, expectLogSays, fullNight, fullNights, plan, suspicionAtEndOfNight, townie } from './steps.ts';

function mark(game: GameState) {
  const first = eventsOfKind(game, 'action', 'count')[0];
  return townie(game, String(first?.data?.['townie']));
}

describe('Feature: Transform / Infect relationship tree', () => {
  it('Scenario: One charm makes a friend', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    fullNight(game, plan({ count: 'socialise' }));
    expect(mark(game).relationship).toBe('friend');
    expectLogSays(game, 'now counts The Count a friend');
    expect(suspicionAtEndOfNight(game)).toBe(41);
  });

  it('Scenario: Two charms make a confidant who keeps the secret', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    fullNights(game, plan({ count: 'socialise' }), 2);
    expect(mark(game).relationship).toBe('confidant');
    expect(game.village.allies).toHaveLength(1);
    expectLogSays(game, "now keeps the manor's secrets");
    expect(suspicionAtEndOfNight(game)).toBe(42);
  });

  it('Scenario: Three charms make a thrall who talks the rumours down', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    fullNights(game, plan({ count: 'socialise' }), 3);
    expect(mark(game).relationship).toBe('thrall');
    expectLogSays(game, 'talked the rumours down');
    expect(suspicionAtEndOfNight(game)).toBe(52);
  });

  it('Scenario: Four charms turn the villager', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    fullNights(game, plan({ count: 'socialise' }), 4);
    const m = mark(game);
    expect(m.relationship).toBe('turned');
    expect(game.monsters).toHaveLength(4);
    expect(game.monsters.some((x) => x.id === `turned-${m.id}`)).toBe(true);
    for (const n of m.neighbours) expect(townie(game, n).awareness).toBe(30);
    expect(suspicionAtEndOfNight(game)).toBe(83);
  });

  it('Scenario: A turned villager takes orders like anyone else', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    fullNights(game, plan({ count: 'socialise' }), 4);
    const fledgling = game.monsters.find((x) => x.archetype === 'fledgling');
    expect(fledgling).toBeDefined();
    fullNight(game, plan({ [fledgling!.id]: 'feed' }));
    expectLogSays(game, 'went out to feed', fledgling!.id);
  });

  it('Scenario: Other monsters make friends but never thralls', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    befriend(game, 'ferryman', 'confidant');
    for (let i = 0; i < 10; i++) advanceBond(townie(game, 'ferryman'), SOCIAL_BOND, SOCIAL_BOND_CAP);
    expect(townie(game, 'ferryman').relationship).toBe('confidant');
    fullNights(game, plan({ wolfman: 'socialise' }), 10);
    expect(game.village.townies.some((t) => t.bond > 0 || t.relationship !== 'stranger')).toBe(true);
    const stages = game.village.townies.map((t) => stageRank(t.relationship));
    expect(Math.max(...stages)).toBeLessThanOrEqual(stageRank('confidant'));
    expect(game.village.turned).toHaveLength(0);
  });
});
