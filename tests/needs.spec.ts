import { describe, expect, it } from 'vitest';
import { aNewGame, duskAndNight, expectLogSays, fullNight, logSays, need, plan, setNeed, setNeeds } from './steps.ts';

const IDLE = plan({});

describe('Feature: Needs', () => {
  it('Scenario: Needs are clamped to 0–100', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setNeed(game, 'wolfman', 'hunger', 90);
    duskAndNight(game, plan({ wolfman: 'feed' }));
    expect(need(game, 'wolfman', 'hunger')).toBe(100);
  });

  it('Scenario: Each monster decays by its own table at dawn', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    const wolf = need(game, 'wolfman', 'hunger');
    const golem = need(game, 'golem', 'hunger');
    fullNight(game, IDLE);
    expect(wolf - need(game, 'wolfman', 'hunger')).toBe(15);
    expect(golem - need(game, 'golem', 'hunger')).toBe(5);
  });

  it('Scenario: A need crossing below 20 emits a critical event', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setNeed(game, 'wolfman', 'hunger', 25);
    fullNight(game, IDLE);
    expectLogSays(game, 'hunger has become critical', 'wolfman');
  });

  it('Scenario: A need already below 20 does not re-announce itself', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setNeed(game, 'wolfman', 'hunger', 5);
    fullNight(game, IDLE);
    expect(logSays(game, 'hunger has become critical')).toBe(false);
  });

  it('Scenario: Anger rises while a need is critical and falls otherwise', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setNeeds(game, 'wolfman', { hunger: 5, anger: 20 });
    setNeed(game, 'golem', 'anger', 20);
    fullNight(game, IDLE);
    expect(need(game, 'wolfman', 'anger')).toBe(30);
    expect(need(game, 'golem', 'anger')).toBe(15);
  });
});
