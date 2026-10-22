/**
 * Visual regression (MM-49). Every drawing is rendered onto the recording
 * canvas and fingerprinted; the fingerprints live in
 * tests/__snapshots__/visual.spec.ts.snap. An intended visual change is
 * accepted with `pnpm test -u` and reviewed in the diff; an unintended one
 * fails here.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../src/sim/build.ts';
import { createGame, runNight } from '../src/sim/loop.ts';
import { PLAYABLE, VALLEY_HOUSEHOLD } from '../src/sim/monsters.ts';
import { DEFAULT_PLAN, planForNight } from '../src/sim/plan.ts';
import type { GameState } from '../src/sim/types.ts';
import { drawFigure, type FigureStyle, type Pose } from '../src/web/art/figures.ts';
import { FIXTURES, FURNITURE, drawItemIcon } from '../src/web/art/furniture.ts';
import { drawCard } from '../src/web/art/post.ts';
import { ICONS, icon, type IconName } from '../src/web/kit/icons.ts';
import { drawScene, type Scene } from '../src/web/render.ts';
import { ACCENTS, daylight, moonPhase, spriteStates } from '../src/web/viewmodel.ts';
import { recorder } from './canvas.ts';

function fingerprint(draw: (c: CanvasRenderingContext2D) => void): string {
  const r = recorder();
  draw(r.ctx);
  return `${createHash('sha256').update(r.calls.join('\n')).digest('hex').slice(0, 16)} (${r.calls.length} calls)`;
}

function sceneOf(state: GameState, phase: Scene['phase'], extra: Partial<Scene> = {}): Scene {
  return {
    phase,
    daylight: daylight(phase),
    moon: moonPhase(Math.max(1, state.night)),
    seed: state.options.seed,
    valley: state.options.setting === 'valley',
    rooms: state.house.rooms.map((r) => ({ id: r.id, name: r.name, lit: phase === 'night' && r.lit, exposure: 0, secretPassage: r.secretPassage, windows: r.windows })),
    furniture: state.house.furniture,
    sprites: spriteStates(state, phase),
    lightningRod: state.house.lightningRod,
    lightningLovers: false,
    defences: state.house.defences,
    suspicion: state.village.suspicion,
    mobGathering: false,
    hunterPresent: false,
    ...extra,
  };
}

const POSES: Pose[] = ['idle', 'walk', 'act', 'asleep'];
const STYLES: FigureStyle[] = ['stage', 'plate', 'shadow'];

describe('Feature: Visual regression', () => {
  it('Scenario: Resident figures look as approved', () => {
    const prints: Record<string, string> = {};
    for (const a of [...PLAYABLE, 'fledgling']) {
      for (const style of STYLES) {
        for (const pose of POSES) {
          prints[`${a} ${pose} ${style}`] = fingerprint((c) => drawFigure(c, a, { pose, t: 12, accent: ACCENTS[a] ?? '#999999', style, motion: false }));
        }
      }
    }
    expect(prints).toMatchSnapshot();
  });

  it('Scenario: Furniture, fixtures and catalogue icons look as approved', () => {
    const ids = new Set([...Object.keys(FURNITURE), ...Object.keys(FIXTURES), ...CATALOGUE.map((i) => i.id)]);
    const prints: Record<string, string> = {};
    for (const id of [...ids].toSorted()) prints[id] = fingerprint((c) => drawItemIcon(c, id, 64));
    expect(prints).toMatchSnapshot();
  });

  it('Scenario: Line icons look as approved', () => {
    const prints: Record<string, string> = {};
    for (const name of Object.keys(ICONS) as IconName[]) prints[name] = createHash('sha256').update(JSON.stringify(icon(name))).digest('hex').slice(0, 16);
    expect(prints).toMatchSnapshot();
  });

  it('Scenario: The stage looks as approved', () => {
    const manor = createGame({ seed: 42, household: ['count', 'wolfman', 'golem', 'mummy', 'invisible'] });
    runNight(manor, planForNight(DEFAULT_PLAN, 1));
    const valley = createGame({ seed: 7, setting: 'valley', household: [...VALLEY_HOUSEHOLD] });
    runNight(valley, { night: { gwyllgi: 'feed', cwnannwn: 'sleep', gwrach: 'lieLow' } });
    const off = { grain: false, motion: false };
    const scenes: Record<string, Scene> = {
      dusk: sceneOf(manor, 'dusk'),
      night: sceneOf(manor, 'night'),
      day: sceneOf(manor, 'day'),
      siege: sceneOf(manor, 'night', { mobGathering: true, hunterPresent: true, suspicion: 94, moon: 'full', defences: { drawbridge: true, fogMachine: true, decoyCoffins: true, organ: true } }),
      valley: sceneOf(valley, 'night'),
    };
    const prints: Record<string, string> = {};
    for (const [name, scene] of Object.entries(scenes)) prints[name] = fingerprint((c) => drawScene(c, scene, 0, off));
    prints['title card'] = fingerprint((c) => drawCard(c, 960, 540, { title: 'Monster\nManor', subtitle: 'a household of monsters', alpha: 1, region: { x: 600, y: 120, w: 340 } }));
    expect(prints).toMatchSnapshot();
  });
});
