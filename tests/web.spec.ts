import { describe, expect, it } from 'vitest';
import { findMonster } from '../src/sim/context.ts';
import { PLAYABLE } from '../src/sim/monsters.ts';
import { ACCENTS, ROOM_LAYOUT, hudModel, isoToScreen, moonPhase, riskHints, spriteStates } from '../src/web/viewmodel.ts';
import { aNewGame, dawn, duskAndNight, day, itIsTheDuskOfNight, plan } from './steps.ts';

describe('Feature: Web client view-model', () => {
  it('Scenario: The manor has a place for every room', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    for (const r of game.house.rooms) expect(ROOM_LAYOUT[r.id]).toBeDefined();
    const points = Object.values(ROOM_LAYOUT).map((c) => isoToScreen(c.col, c.row, 0, 0));
    expect(new Set(points.map((p) => `${p.x},${p.y}`)).size).toBe(points.length);
  });

  it("Scenario: Sprites follow the night's events", () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    duskAndNight(game, plan({ count: 'feed', wolfman: 'sleep', golem: 'repair' }));
    const night = Object.fromEntries(spriteStates(game, 'night').map((s) => [s.id, s]));
    expect(night['count']).toMatchObject({ room: 'out', pose: 'walk' });
    expect(night['wolfman']).toMatchObject({ room: 'attic', pose: 'asleep' });
    expect(night['golem']).toMatchObject({ room: 'workshop', pose: 'act' });
    dawn(game);
    day(game);
    for (const s of spriteStates(game, 'day')) {
      expect(s.pose).toBe('asleep');
      expect(s.room).toBe(findMonster(game, s.id).bedroom);
    }
  });

  it('Scenario: The HUD reads the state', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    const hud = hudModel(game);
    expect(hud).toMatchObject({ night: 0, nightsToSurvive: 7, suspicion: 30, mood: 'calm', coin: 20, nextFullMoonIn: 7 });
    for (const m of hud.monsters) expect(m.needs).toHaveLength(8);
  });

  it('Scenario: The moon', () => {
    expect(moonPhase(7)).toBe('full');
    expect(moonPhase(14)).toBe('full');
    expect(moonPhase(1)).toBe('new');
    expect(moonPhase(6)).toBe('nearly full');
  });

  it('Scenario: Risk hints warn before the plan is confirmed', () => {
    const game = aNewGame({ seed: 42, suspicion: 30 });
    itIsTheDuskOfNight(game, 7);
    expect(riskHints(game, findMonster(game, 'wolfman'), 'coverJob').join(' ')).toMatch(/disaster/);
    game.house.lightningRod = false;
    expect(riskHints(game, findMonster(game, 'golem'), 'sleep').join(' ')).toMatch(/lightning rod/);
    expect(riskHints(game, findMonster(game, 'count'), 'coverJob').join(' ')).toMatch(/fails 20%/);
    expect(riskHints(game, findMonster(game, 'count'), null)).toEqual([]);
  });

  it('Scenario: Accents are distinct per archetype', () => {
    const colours = PLAYABLE.map((a) => ACCENTS[a]);
    expect(colours.every(Boolean)).toBe(true);
    expect(new Set(colours).size).toBe(colours.length);
  });
});
