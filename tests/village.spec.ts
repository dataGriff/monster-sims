import { describe, expect, it } from 'vitest';
import { aNewGame, befriend, duskAndNight, eventsOfKind, expectLogSays, fullNight, plan, suspicionAtEndOfNight, townie } from './steps.ts';

const IDLE = plan({});

describe('Feature: The village', () => {
  it('Scenario: The roster', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    const townies = game.village.townies;
    expect(townies).toHaveLength(10);
    for (const t of townies) {
      expect(t.job.length).toBeGreaterThan(0);
      expect(t.weight).toBeGreaterThanOrEqual(1);
      expect(t.weight).toBeLessThanOrEqual(3);
      expect(t.neighbours).toHaveLength(2);
      for (const n of t.neighbours) expect(townies.some((x) => x.id === n)).toBe(true);
    }
    expect(townies.filter((t) => t.abroad === 'night')).toHaveLength(5);
  });

  it("Scenario: The Count's victim remembers the night", () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    duskAndNight(game, plan({ count: 'feed' }));
    const feed = eventsOfKind(game, 'action', 'count')[0];
    expect(feed?.text).toContain('woke up pale');
    const victim = townie(game, String(feed?.data?.['victim']));
    expect(feed?.text).toContain(victim.name);
    expect(victim.awareness).toBe(20);
  });

  it('Scenario: A townie whose awareness is still 50 after the night says so out loud', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    townie(game, 'baker').awareness = 55;
    fullNight(game, IDLE);
    expectLogSays(game, 'The baker is now saying out loud');
    expect(suspicionAtEndOfNight(game)).toBe(32);
    townie(game, 'baker').awareness = 60;
    fullNight(game, IDLE);
    expect(eventsOfKind(game, 'outspoken')).toHaveLength(1);
  });

  it('Scenario: Gossip spreads along the fences once the village is gossiping', () => {
    const game = aNewGame({ seed: 42, suspicion: 50 });
    const baker = townie(game, 'baker');
    baker.awareness = 60;
    baker.outspoken = true;
    fullNight(game, IDLE);
    expect(townie(game, 'miller').awareness).toBe(5);
    expect(townie(game, 'widow').awareness).toBe(5);
    expect(baker.awareness).toBe(55);
  });

  it('Scenario: Gossip does not spread while the village is calm', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    const baker = townie(game, 'baker');
    baker.awareness = 60;
    baker.outspoken = true;
    fullNight(game, IDLE);
    expect(townie(game, 'miller').awareness).toBe(0);
  });

  it('Scenario: A quiet night lets townies forget', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    townie(game, 'baker').awareness = 20;
    fullNight(game, IDLE);
    expect(townie(game, 'baker').awareness).toBe(15);
  });

  it('Scenario: Allies do not gossip and forget nothing', () => {
    const game = aNewGame({ seed: 42, suspicion: 50 });
    befriend(game, 'innkeeper', 'confidant');
    const baker = townie(game, 'baker');
    baker.awareness = 60;
    baker.outspoken = true;
    fullNight(game, IDLE);
    expect(townie(game, 'innkeeper').awareness).toBe(0);
    expect(game.village.allies).toEqual(['the innkeeper']);
  });
});
