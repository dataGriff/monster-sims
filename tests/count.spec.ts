import { describe, expect, it } from 'vitest';
import {
  aNewGame,
  dawn,
  day,
  duskAndNight,
  eventsOfKind,
  expectLogSays,
  fullNight,
  fullNights,
  need,
  plan,
  setNeed,
  suspicionAtEndOfNight,
  everyone,
} from './steps.ts';

describe('Feature: The Count', () => {
  it('Scenario: Hunger only fills from "feed" at night', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setNeed(game, 'count', 'hunger', 40);
    duskAndNight(game, plan({ count: 'lieLow' }));
    expect(need(game, 'count', 'hunger')).toBe(40);

    const control = aNewGame({ seed: 42, suspicion: 30 });
    setNeed(control, 'wolfman', 'hunger', 40);
    duskAndNight(control, plan({ wolfman: 'lieLow' }));
    expect(need(control, 'wolfman', 'hunger')).toBe(45);
  });

  it('Scenario: Feeding fills hunger and leaves a pale villager', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setNeed(game, 'count', 'hunger', 40);
    duskAndNight(game, plan({ count: 'feed' }));
    expect(need(game, 'count', 'hunger')).toBe(90);
    // finish the night so Suspicion settles
    dawn(game);
    day(game);
    expect(suspicionAtEndOfNight(game)).toBe(37);
    expectLogSays(game, 'went out to feed', 'count');
  });

  it('Scenario: Energy drains in daylight instead of recovering', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setNeed(game, 'count', 'energy', 80);
    setNeed(game, 'wolfman', 'energy', 80);
    fullNight(game, plan(everyone('lieLow')));
    expect(need(game, 'count', 'energy')).toBe(65);
    expect(need(game, 'wolfman', 'energy')).toBe(100);
  });

  it('Scenario: Hygiene is ignored because he has no reflection', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setNeed(game, 'count', 'hygiene', 10);
    fullNights(game, plan(everyone('lieLow')), 3);
    expect(need(game, 'count', 'hygiene')).toBe(10);
    const fuming = eventsOfKind(game, 'anger', 'count').filter((e) =>
      String(e.data?.['causes']).includes('hygiene'),
    );
    expect(fuming).toHaveLength(0);
  });

  it('Scenario: Charm fills recruit progress and raises Suspicion', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    fullNight(game, plan({ count: 'socialise' }));
    expectLogSays(game, 'charmed', 'count');
    expect(game.village.recruitProgress).toBe(25);
    expect(suspicionAtEndOfNight(game)).toBe(41);
  });

  it('Scenario: Enough charm recruits a villager who keeps the secret', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    fullNights(game, plan({ count: 'socialise' }), 4);
    expect(game.village.allies).toHaveLength(1);
    expect(game.village.recruitProgress).toBe(0);
    expectLogSays(game, "now keeps the manor's secrets");
  });
});
