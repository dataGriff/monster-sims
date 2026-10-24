import { describe, expect, it } from 'vitest';
import { coverJobFailChance } from '../src/sim/actions.ts';
import { findMonster } from '../src/sim/context.ts';
import { play, runNight } from '../src/sim/loop.ts';
import { DEFAULT_PLAN } from '../src/sim/plan.ts';
import { GOLEM_BREAK_CHANCE } from '../src/sim/quirks.ts';
import { MOB_ATTACK_CHANCE, moodFor } from '../src/sim/village.ts';
import {
  aNewGame,
  brokenFurnitureNames,
  expectLogSays,
  fullNight,
  logSays,
  need,
  plan,
  rollAtLeast,
  rollBelow,
  rolls,
  seedWhere,
  setEveryonesNeed,
  suspicionAtEndOfNight,
} from './steps.ts';

const IDLE = plan({});

describe('Feature: Village Suspicion', () => {
  it('Scenario: Thresholds', () => {
    expect(moodFor(39)).toBe('calm');
    expect(moodFor(40)).toBe('gossip');
    expect(moodFor(70)).toBe('snooping');
    expect(moodFor(90)).toBe('mob');
    expect(moodFor(100)).toBe('mobAtDoor');
  });

  it('Scenario: A quiet night decays Suspicion toward the baseline of 30', () => {
    const game = aNewGame({ seed: 42, suspicion: 50 });
    fullNight(game, IDLE);
    expect(suspicionAtEndOfNight(game)).toBe(47);
    expectLogSays(game, 'A quiet night');
  });

  it('Scenario: Below the baseline a quiet night creeps back up', () => {
    const game = aNewGame({ seed: 42, suspicion: 20 });
    fullNight(game, IDLE);
    expect(suspicionAtEndOfNight(game)).toBe(23);
  });

  it('Scenario: A noisy night adds rumour on top of the noise', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    fullNight(game, plan({ wolfman: 'socialise' }));
    expect(suspicionAtEndOfNight(game)).toBe(36);
    expectLogSays(game, 'something to talk about');
  });

  it('Scenario: Crossing 40 starts the gossip', () => {
    const game = aNewGame({ seed: 42, suspicion: 38 });
    fullNight(game, plan({ wolfman: 'socialise' }));
    expect(suspicionAtEndOfNight(game)).toBe(44);
    expectLogSays(game, 'Gossip about the manor spreads');
  });

  it('Scenario: Gossip makes cover jobs riskier and allies make them safer', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    const count = findMonster(game, 'count');
    const ctx = { state: game, phase: 'night' as const };
    expect(coverJobFailChance(ctx, count)).toBeCloseTo(0.2);
    game.village.suspicion = 45;
    expect(coverJobFailChance(ctx, count)).toBeCloseTo(0.3);
    game.village.suspicion = 30;
    game.village.allies.push('the baker');
    expect(coverJobFailChance(ctx, count)).toBeCloseTo(0.15);
  });

  it('Scenario: A successful cover job lowers Suspicion', () => {
    const game0 = aNewGame({ seed: 42, suspicion: 30 });
    const p = coverJobFailChance({ state: game0, phase: 'night' }, findMonster(game0, 'golem'));
    const game = aNewGame({ seed: seedWhere(rollAtLeast(p)), suspicion: 30 });
    fullNight(game, plan({ golem: 'coverJob' }));
    expect(suspicionAtEndOfNight(game)).toBe(22);
  });

  it('Scenario: A failed cover job raises Suspicion', () => {
    const game0 = aNewGame({ seed: 42, suspicion: 30 });
    const p = coverJobFailChance({ state: game0, phase: 'night' }, findMonster(game0, 'golem'));
    const game = aNewGame({ seed: seedWhere(rollBelow(p)), suspicion: 30 });
    fullNight(game, plan({ golem: 'coverJob' }));
    expect(suspicionAtEndOfNight(game)).toBe(39);
  });

  it('Scenario: Van Helsing snoops at 70 unless someone lies low', () => {
    const game = aNewGame({ seed: 42, suspicion: 70 });
    fullNight(game, IDLE);
    expect(suspicionAtEndOfNight(game)).toBe(77);
    expectLogSays(game, 'Van Helsing snooped');
  });

  it('Scenario: Lying low keeps Van Helsing away', () => {
    const game = aNewGame({ seed: 42, suspicion: 70 });
    fullNight(game, plan({ count: 'lieLow' }));
    expect(suspicionAtEndOfNight(game)).toBe(64);
    expect(logSays(game, 'Van Helsing snooped')).toBe(false);
  });

  it('Scenario: At 90 the mob gathers and may attack a room by day', () => {
    const seed = seedWhere(rolls(rollAtLeast(GOLEM_BREAK_CHANCE), rollBelow(MOB_ATTACK_CHANCE)));
    const game = aNewGame({ seed, suspicion: 90 });
    fullNight(game, IDLE);
    expectLogSays(game, 'The mob stormed');
    expect(brokenFurnitureNames(game).length + (game.house.lightningRod ? 0 : 1)).toBeGreaterThan(0);
    for (const m of game.monsters) {
      expect(need(game, m.id, 'comfort')).toBe(60);
      expect(need(game, m.id, 'anger')).toBe(15);
    }
  });

  it('Scenario: A gathered mob does not always attack', () => {
    const seed = seedWhere(rolls(rollAtLeast(GOLEM_BREAK_CHANCE), rollAtLeast(MOB_ATTACK_CHANCE)));
    const game = aNewGame({ seed, suspicion: 90 });
    fullNight(game, IDLE);
    expect(logSays(game, 'The mob stormed')).toBe(false);
  });

  it('Scenario: An angry household is heard across the valley', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    setEveryonesNeed(game, 'anger', 80);
    fullNight(game, IDLE);
    expect(suspicionAtEndOfNight(game)).toBe(39);
    expectLogSays(game, 'Shouting from the manor');
  });

  it('Scenario: Suspicion 100 means the mob is at the door and the game is lost', () => {
    const game = aNewGame({ seed: 42, suspicion: 96 });
    fullNight(game, IDLE);
    expect(game.status).toBe('lost');
    expectLogSays(game, 'The mob is at the door');
    expect(game.log.at(-1)?.kind).toBe('summary');
    expect(game.log.at(-1)?.text).toContain('the household fell');
    expect(game.log.filter((e) => e.phase === 'day')).toHaveLength(0);
    const before = game.log.length;
    expect(runNight(game, IDLE)).toHaveLength(0);
    expect(game.log).toHaveLength(before);
    expect(game.night).toBe(1);
  });

  it('Scenario: Surviving 7 nights is a win', () => {
    const game = play(42, DEFAULT_PLAN);
    expect(game.status).toBe('won');
    expect(game.night).toBe(7);
    expectLogSays(game, 'The household survived');
    const last = game.log.at(-1);
    expect(last?.kind).toBe('summary');
    expect(last?.text).toContain('Run over');
    expect(last?.data?.['outcome']).toBe('won');
  });

  it('Scenario: The same seed and plan replay the same log', () => {
    const a = play(42, DEFAULT_PLAN);
    const b = play(42, DEFAULT_PLAN);
    expect(b.log).toEqual(a.log);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    const c = play(43, DEFAULT_PLAN);
    expect(c.log).not.toEqual(a.log);
  });
});
