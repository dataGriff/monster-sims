import { describe, expect, it } from 'vitest';
import { coverJobFailChance, jobTitle } from '../src/sim/actions.ts';
import { findMonster } from '../src/sim/context.ts';
import type { Archetype } from '../src/sim/types.ts';
import { aNewGame, dusk, expectLogSays, fullNight, fullNights, plan, rollAtLeast, rollBelow, rolls, seedWhere } from './steps.ts';

const PAIR: Archetype[] = ['count', 'wolfman'];
const P = 0.2;

describe('Feature: Cover job progression', () => {
  it('Scenario: Three good shifts earn a promotion', () => {
    const seed = seedWhere(rolls(rollAtLeast(P), rollAtLeast(P), rollAtLeast(P)));
    const game = aNewGame({ seed, suspicion: 30, household: PAIR });
    fullNights(game, plan({ wolfman: 'coverJob' }), 3);
    const wolf = findMonster(game, 'wolfman');
    expect(wolf.coverJob.level).toBe(2);
    expect(wolf.coverJob.relief).toBe(10);
    expect(jobTitle(wolf)).toBe('senior carter');
    expectLogSays(game, 'Promoted', 'wolfman');
  });

  it('Scenario: A bad shift heats up the workplace', () => {
    const game = aNewGame({ seed: seedWhere(rollBelow(P)), suspicion: 30, household: PAIR });
    fullNight(game, plan({ wolfman: 'coverJob' }));
    expect(findMonster(game, 'wolfman').coverJob).toMatchObject({ heat: 15, streak: 0 });
  });

  it('Scenario: A good shift cools it', () => {
    const game = aNewGame({ seed: seedWhere(rollAtLeast(P)), suspicion: 30, household: PAIR });
    findMonster(game, 'wolfman').coverJob.heat = 20;
    fullNight(game, plan({ wolfman: 'coverJob' }));
    expect(findMonster(game, 'wolfman').coverJob.heat).toBe(15);
  });

  it('Scenario: At 50 heat the employer asks questions', () => {
    const game = aNewGame({ seed: 42, suspicion: 30, household: PAIR });
    const wolf = findMonster(game, 'wolfman');
    wolf.coverJob.heat = 50;
    expect(coverJobFailChance({ state: game, phase: 'night' }, wolf)).toBeCloseTo(0.3);
  });

  it('Scenario: At 100 heat he is sacked', () => {
    const game = aNewGame({ seed: seedWhere(rollBelow(P)), suspicion: 30, household: PAIR });
    findMonster(game, 'wolfman').coverJob.heat = 90;
    fullNights(game, plan({ wolfman: 'coverJob' }), 2);
    expect(findMonster(game, 'wolfman').coverJob.employed).toBe(false);
    expectLogSays(game, 'is sacked', 'wolfman');
    expectLogSays(game, 'no job to go to', 'wolfman');
  });

  it('Scenario: A night shift and a day shift clash', () => {
    const probe = aNewGame({ seed: 42, suspicion: 30, household: PAIR });
    dusk(probe, plan({ wolfman: 'coverJob' }, { wolfman: 'coverJob' }));
    expect(coverJobFailChance({ state: probe, phase: 'day' }, findMonster(probe, 'wolfman'), 'day')).toBeCloseTo(0.35);
    const game = aNewGame({ seed: seedWhere(rolls(rollAtLeast(P), rollAtLeast(0.35))), suspicion: 30, household: PAIR });
    fullNight(game, plan({ wolfman: 'coverJob' }, { wolfman: 'coverJob' }));
    expectLogSays(game, 'Two shifts in one turn of the clock', 'wolfman');
  });
});
