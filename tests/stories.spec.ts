import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/loop.ts';
import { parsePlan } from '../src/sim/plan.ts';
import { STORIES } from '../src/sim/stories.ts';
import type { Archetype, GameState } from '../src/sim/types.ts';
import { aNewGame, eventsOfKind, expectLogSays, fullNight, itIsTheDuskOfNight, need, plan, suspicionAtEndOfNight } from './steps.ts';

function storyGame(night: number, household?: Archetype[]): GameState {
  const game = createGame({ seed: 42, suspicion: 30, stories: true, ...(household ? { household } : {}) });
  itIsTheDuskOfNight(game, night);
  return game;
}
const IDLE = plan({});

describe('Feature: Story events', () => {
  it('Scenario: The catalogue', () => {
    expect(STORIES).toHaveLength(20);
    expect(new Set(STORIES.map((s) => s.id)).size).toBe(20);
    for (const s of STORIES) {
      expect(s.choices.length).toBeGreaterThanOrEqual(2);
      expect(new Set(s.choices.map((c) => c.id)).size).toBe(s.choices.length);
    }
  });

  it('Scenario: The first branch happens unless the plan says otherwise', () => {
    const game = storyGame(2);
    fullNight(game, IDLE);
    expectLogSays(game, 'A lost traveller at the door');
    expect(suspicionAtEndOfNight(game)).toBe(36);

    const other = storyGame(2);
    const before = other.monsters.map((m) => m.needs.social);
    fullNight(other, { night: {}, choices: { lostTraveller: 'takeIn' } });
    const story = eventsOfKind(other, 'story')[0];
    expect(story?.data?.['choice']).toBe('takeIn');
    // social +10 at dusk, then each monster's own decay at dawn (the Golem is capped at 20 and gains nothing)
    other.monsters.forEach((m, i) => {
      const gain = m.id === 'golem' ? 0 : 10;
      expect(m.needs.social).toBe(Math.min(100, before[i]! + gain) - (m.decay.social ?? 0));
    });
    expect(suspicionAtEndOfNight(other)).toBe(28);
  });

  it('Scenario: Each story fires once, two nights apart', () => {
    // no lightning-powered resident, so the urgent storm cannot jump the queue
    const game = storyGame(2, ['count', 'wolfman']);
    for (let i = 0; i < 3; i++) fullNight(game, IDLE);
    const nights = eventsOfKind(game, 'story').map((e) => e.night);
    expect(nights).toEqual([2, 4]);
    const ids = eventsOfKind(game, 'story').map((e) => e.data?.['story']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Scenario: Urgent stories ignore the cooldown', () => {
    const game = storyGame(2);
    game.house.lightningRod = false;
    fullNight(game, IDLE);
    fullNight(game, IDLE);
    const storm = eventsOfKind(game, 'story').find((e) => e.text.startsWith('A storm over the manor'));
    expect(storm?.night).toBe(3);
    expect(game.house.lightningRod).toBe(true);
  });

  it('Scenario: The Count takes care of the traveller', () => {
    const game = storyGame(2);
    fullNight(game, { night: {}, choices: { lostTraveller: 'feedOnThem' } });
    expect(need(game, 'count', 'hunger')).toBe(100 - 15);
    expect(suspicionAtEndOfNight(game)).toBe(44);
  });

  it("Scenario: Full moon on the Count's shift", () => {
    const game = storyGame(7);
    fullNight(game, plan({ count: 'coverJob', wolfman: 'sleep' }));
    expect(eventsOfKind(game, 'action', 'count')[0]?.data?.['action']).toBe('lieLow');
    expectLogSays(game, 'sat up with the Wolf Man');
    expect(suspicionAtEndOfNight(game)).toBe(38);
  });

  it('Scenario: The Invisible Man handles the census', () => {
    const game = storyGame(3, ['count', 'wolfman', 'golem', 'invisible']);
    game.stories.fired.push('lostTraveller');
    fullNight(game, IDLE);
    expectLogSays(game, 'gentleman, retired');
    expect(suspicionAtEndOfNight(game)).toBe(25);
  });

  it('Scenario: Stories are off unless asked for', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    itIsTheDuskOfNight(game, 2);
    fullNight(game, IDLE);
    expect(eventsOfKind(game, 'story')).toHaveLength(0);
  });

  it('Scenario: Plans carry choices and shopping lists', () => {
    const parsed = parsePlan([{ night: { count: 'feed' }, build: ['cot'], choices: { lostTraveller: 'takeIn' } }]);
    expect(parsed.nights[0]).toEqual({ night: { count: 'feed' }, build: ['cot'], choices: { lostTraveller: 'takeIn' } });
    expect(() => parsePlan([{ night: {}, choices: { lostTraveller: 3 } }])).toThrow(/choices/);
    expect(() => parsePlan([{ night: {}, build: 'cot' }])).toThrow(/build/);
  });
});
