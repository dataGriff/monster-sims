import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../src/sim/build.ts';
import { createHouse } from '../src/sim/house.ts';
import { createGame, runNight } from '../src/sim/loop.ts';
import { DEFAULT_PLAN, planForNight } from '../src/sim/plan.ts';
import { PLAYABLE, VALLEY_HOUSEHOLD } from '../src/sim/monsters.ts';
import type { GameState } from '../src/sim/types.ts';
import { PLATES, romanNumeral } from '../src/web/art/bestiary.ts';
import { FIGURES, drawFigure, hasFigure, type Pose } from '../src/web/art/figures.ts';
import { FURNITURE, drawItemIcon } from '../src/web/art/furniture.ts';
import { INK, contrast, mix } from '../src/web/art/palette.ts';
import { drawCard } from '../src/web/art/post.ts';
import { moonIllumination, moonPath, type MoonPhase } from '../src/web/art/scenery.ts';
import { drawScene, hitTest, type RenderOptions, type Scene } from '../src/web/render.ts';
import { ACCENTS, daylight, moonPhase, spriteStates, type Sprite } from '../src/web/viewmodel.ts';
import { hasNaN, recorder } from './canvas.ts';

const POSES: Pose[] = ['idle', 'walk', 'act', 'asleep'];
const OFF: RenderOptions = { grain: false, motion: false };
const ON: RenderOptions = { grain: false, motion: true };

function sceneOf(state: GameState, phase: Scene['phase'], extra: Partial<Scene> = {}): Scene {
  return {
    phase,
    daylight: daylight(phase),
    moon: moonPhase(Math.max(1, state.night)),
    seed: state.options.seed,
    valley: state.options.setting === 'valley',
    rooms: state.house.rooms.map((r) => ({ id: r.id, name: r.name, lit: r.lit, exposure: 0, secretPassage: r.secretPassage, windows: r.windows })),
    furniture: state.house.furniture,
    sprites: spriteStates(state, phase),
    lightningRod: state.house.lightningRod,
    lightningLovers: true,
    defences: state.house.defences,
    suspicion: state.village.suspicion,
    mobGathering: false,
    hunterPresent: false,
    ...extra,
  };
}

function afterOneNight(household = ['count', 'wolfman', 'golem'] as GameState['monsters'][number]['archetype'][]): GameState {
  const game = createGame({ seed: 42, household });
  runNight(game, planForNight(DEFAULT_PLAN, 1));
  return game;
}

function draw(scene: Scene, frame: number, opts: RenderOptions = OFF) {
  const r = recorder();
  const hits = drawScene(r.ctx, scene, frame, opts);
  return { ...r, hits };
}

describe('Feature: Art direction', () => {
  it('Scenario: Every resident has their own figure', () => {
    const logs = new Set<string>();
    for (const a of [...PLAYABLE, 'fledgling']) {
      expect(hasFigure(a), a).toBe(true);
      for (const pose of POSES) {
        for (const style of ['stage', 'plate', 'shadow'] as const) {
          const r = recorder();
          drawFigure(r.ctx, a, { pose, t: 17, accent: ACCENTS[a]!, style });
          expect(r.calls.length, `${a} ${pose} ${style}`).toBeGreaterThan(5);
          expect(hasNaN(r.calls), `${a} ${pose} ${style}`).toBe(false);
        }
      }
      const idle = recorder();
      drawFigure(idle.ctx, a, { pose: 'idle', t: 0, accent: '#888888', style: 'stage' });
      logs.add(idle.calls.join('|'));
    }
    expect(logs.size).toBe(PLAYABLE.length + 1);
  });

  it('Scenario: Reduced motion holds every figure still', () => {
    for (const a of Object.keys(FIGURES)) {
      const a1 = recorder();
      const a2 = recorder();
      drawFigure(a1.ctx, a, { pose: 'walk', t: 3, accent: '#888888', motion: false });
      drawFigure(a2.ctx, a, { pose: 'walk', t: 40, accent: '#888888', motion: false });
      expect(a2.calls, a).toEqual(a1.calls);
      const b1 = recorder();
      const b2 = recorder();
      drawFigure(b1.ctx, a, { pose: 'walk', t: 3, accent: '#888888', motion: true });
      drawFigure(b2.ctx, a, { pose: 'walk', t: 40, accent: '#888888', motion: true });
      expect(b2.calls, a).not.toEqual(b1.calls);
    }
  });

  it('Scenario: Everything the house can hold has a drawing', () => {
    const ids = new Set<string>();
    for (const a of PLAYABLE) for (const f of createHouse([a]).furniture) ids.add(f.id);
    for (const id of ids) expect(FURNITURE[id], id).toBeDefined();
    for (const item of CATALOGUE) {
      const r = recorder();
      expect(drawItemIcon(r.ctx, item.id, 42), item.id).toBe(true);
      expect(r.calls.length, item.id).toBeGreaterThan(3);
      expect(hasNaN(r.calls), item.id).toBe(false);
    }
  });

  it('Scenario: The stage is deterministic', () => {
    const game = afterOneNight();
    const scene = sceneOf(game, 'night');
    const a = draw(scene, 120, ON);
    const b = draw(scene, 120, ON);
    expect(b.calls).toEqual(a.calls);
    expect(hasNaN(a.calls)).toBe(false);
    const still1 = draw(scene, 10, OFF);
    const still2 = draw(scene, 300, OFF);
    expect(still2.calls).toEqual(still1.calls);
    const moving = draw(scene, 300, ON);
    expect(moving.calls).not.toEqual(a.calls);
  });

  it('Scenario: Every kind of night draws', () => {
    const game = afterOneNight(['count', 'wolfman', 'golem', 'mummy', 'invisible', 'lakeling', 'phantom', 'bride', 'hunchback']);
    for (const phase of ['dusk', 'night', 'day'] as const) {
      const r = draw(sceneOf(game, phase), 50, ON);
      expect(hasNaN(r.calls), phase).toBe(false);
      expect(r.hits.length, phase).toBe(game.monsters.length);
    }
    const loaded = draw(
      sceneOf(game, 'night', {
        mobGathering: true,
        suspicion: 97,
        hunterPresent: true,
        defences: { drawbridge: true, fogMachine: true, decoyCoffins: true, organ: true },
        card: { title: 'Night 7', subtitle: 'the moon is full', alpha: 0.5 },
        moon: 'full',
      }),
      3,
      { grain: true, motion: true, noise: {} as CanvasImageSource, noiseSize: 128 },
    );
    expect(hasNaN(loaded.calls)).toBe(false);
    expect(loaded.calls.some((c) => c.startsWith('drawImage('))).toBe(true);

    const valley = createGame({ seed: 7, setting: 'valley', household: [...VALLEY_HOUSEHOLD] });
    runNight(valley, { night: { gwyllgi: 'feed', cwnannwn: 'sleep', gwrach: 'lieLow' } });
    const v = draw(sceneOf(valley, 'night'), 9, ON);
    expect(hasNaN(v.calls)).toBe(false);
    expect(v.hits.map((h) => h.id).toSorted()).toEqual(['cwnannwn', 'gwrach', 'gwyllgi']);

    const wrecked = afterOneNight();
    wrecked.house.lightningRod = false;
    for (const f of wrecked.house.furniture) f.broken = true;
    const w = draw(sceneOf(wrecked, 'day'), 0, OFF);
    expect(hasNaN(w.calls)).toBe(false);

    const out: Sprite[] = sceneOf(game, 'night').sprites.map((s, i) => Object.assign(s, { room: i % 2 === 0 ? 'out' : s.room, pose: POSES[i % 4]! }));
    const mixed = draw(sceneOf(game, 'night', { sprites: out }), 4, ON);
    expect(mixed.hits).toHaveLength(out.length);
    expect(hasNaN(mixed.calls)).toBe(false);
  });

  it('Scenario: Hover finds the resident under the pointer', () => {
    const game = afterOneNight();
    const { hits } = draw(sceneOf(game, 'dusk'), 0, OFF);
    for (const h of hits) expect(hitTest(hits, h.x + h.w / 2, h.y + h.h / 2)?.id).toBe(h.id);
    expect(hitTest(hits, 900, 20)).toBeUndefined();
  });

  it('Scenario: Accents stay legible on the dark stage', () => {
    const wall = mix('#4a4650', INK, 0.5);
    for (const a of PLAYABLE) {
      const accent = ACCENTS[a]!;
      expect(contrast(accent, INK), `${a} on ink`).toBeGreaterThanOrEqual(3);
      expect(contrast(accent, wall), `${a} on a dark wall`).toBeGreaterThanOrEqual(1.8);
    }
    const accents = PLAYABLE.map((a) => ACCENTS[a]);
    expect(new Set(accents).size).toBe(accents.length);
  });

  it('Scenario: The moon is drawn to its phase', () => {
    expect(moonIllumination('full').fraction).toBe(1);
    expect(moonIllumination('new').fraction).toBeLessThan(0.1);
    const waxing: MoonPhase[] = ['new', 'waxing crescent', 'first quarter', 'waxing gibbous', 'nearly full', 'full'];
    const fractions = waxing.map((p) => moonIllumination(p).fraction);
    expect(fractions).toEqual(fractions.toSorted((a, b) => a - b));
    for (const p of [...waxing, 'waning'] as MoonPhase[]) expect(moonPath(p, 12)).toMatch(/^M 12 0 A 12 12 0 0 [01] 12 24 A [\d.]+ 12 0 0 [01] 12 0 Z$/);
    expect(moonPath('waning', 12)).not.toBe(moonPath('waxing gibbous', 12));
  });

  it('Scenario: The field guide has a plate for every resident', () => {
    for (const a of PLAYABLE) {
      const plate = PLATES[a as keyof typeof PLATES];
      expect(plate?.binomial, a).toMatch(/^[A-Z][a-z]+ [A-Za-z]+/);
      expect(plate?.note.length, a).toBeGreaterThan(40);
    }
    expect([1, 4, 9, 12].map(romanNumeral)).toEqual(['I', 'IV', 'IX', 'XII']);
  });

  it('Scenario: Title cards letter any title', () => {
    for (const title of ['Night 3', 'Monster\nManor']) {
      const r = recorder();
      drawCard(r.ctx, 960, 540, { title, subtitle: 'a test', alpha: 1, region: { x: 600, y: 120, w: 340 } });
      expect(r.calls.filter((c) => c.startsWith('fillText(')).length).toBeGreaterThan(title.length);
      expect(hasNaN(r.calls)).toBe(false);
    }
  });
});
