/**
 * The manor stage (MM-22, redrawn for the art direction pass MM-31).
 *
 * An oblique cutaway: cellar, two floors and the roof stacked like a theatre
 * set with the front wall removed, leaning slightly as it rises. Everything is
 * drawn from a Scene built out of sim state and the night's events; nothing
 * here reads the sim directly. Returns hit boxes so the client can caption
 * whoever the pointer is over.
 */
import type { DefenceId, Furniture, RoomId } from '../sim/types.ts';
import { FIXTURES, FURNITURE, box, quad, tone, type DrawOpts } from './art/furniture.ts';
import { drawFigure, drawHunter, drawTorchbearer, figureHeight } from './art/figures.ts';
import { ALARM, BONE, INK, LAMP, hash01, mix, ramp, withAlpha } from './art/palette.ts';
import { TITLE_FONT, drawCard, drawGrain, drawVignette, type Card } from './art/post.ts';
import { GROUND, LANE, SOIL, drawClouds, drawFog, drawHills, drawLightning, drawMoon, drawSky, drawStars, drawVillage, type MoonPhase } from './art/scenery.ts';
import { DEPTH, HOUSE_WIDTH, K, ROOM_BOXES, SLOTS, WALL, makeProjector, type Point, type Projector, type RoomBox } from './art/stage.ts';
import type { Sprite } from './viewmodel.ts';

export const STAGE_W = 960;
export const STAGE_H = 540;
export const HOUSE_ORIGIN = { x: 232, y: 372 } as const;

export interface SceneRoom {
  id: RoomId;
  name: string;
  lit: boolean;
  exposure: number;
  secretPassage: boolean;
  windows: number;
}

export interface Scene {
  phase: 'dusk' | 'night' | 'day';
  /** 0 deep night … 1 noon; the client eases this between phases. */
  daylight: number;
  moon: MoonPhase;
  seed: number;
  valley: boolean;
  rooms: SceneRoom[];
  furniture: Furniture[];
  sprites: Sprite[];
  lightningRod: boolean;
  /** Someone in the house runs on lightning, so storms come to the rod. */
  lightningLovers: boolean;
  defences: Record<DefenceId, boolean>;
  suspicion: number;
  mobGathering: boolean;
  hunterPresent: boolean;
  card?: Card;
}

export interface RenderOptions {
  /** Grain and vignette (one setting, docs/art-direction.md). */
  grain: boolean;
  /** False honours prefers-reduced-motion: no bobbing, flicker, drift or lightning. */
  motion: boolean;
  noise?: CanvasImageSource;
  noiseSize?: number;
}

export interface HitBox {
  id: string;
  name: string;
  caption: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

type Ctx = CanvasRenderingContext2D;

const WALLS: Record<RoomId, string> = {
  crypt: '#3a3840',
  kitchen: '#4a4650',
  parlour: '#463f4e',
  workshop: '#4b4744',
  attic: '#4a4751',
  roof: '#3a3b42',
};
const FLOORS: Record<RoomId, string> = {
  crypt: '#2c2b31',
  kitchen: '#3b383b',
  parlour: '#3c343f',
  workshop: '#3d3936',
  attic: '#413d41',
  roof: '#34353c',
};

const SPRITE_SCALE = 0.95;

function seg(c: Ctx, a: Point, b: Point, colour: string, lw: number): void {
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.strokeStyle = colour;
  c.lineWidth = lw;
  c.stroke();
}

function clipQuad(c: Ctx, pts: readonly Point[]): void {
  c.beginPath();
  c.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]!.x, pts[i]!.y);
  c.closePath();
  c.clip();
}

function radial(c: Ctx, at: Point, r: number, colour: string, alpha: number): void {
  const g = c.createRadialGradient(at.x, at.y, 0, at.x, at.y, r);
  g.addColorStop(0, withAlpha(colour, alpha));
  g.addColorStop(1, withAlpha(colour, 0));
  c.fillStyle = g;
  c.fillRect(at.x - r, at.y - r, r * 2, r * 2);
}

/** Architectural poche: the cut face of a wall or slab, solid ink with a light hatch. */
function poche(c: Ctx, pts: readonly Point[]): void {
  quad(c, pts, INK);
  c.save();
  clipQuad(c, pts);
  c.strokeStyle = withAlpha(BONE, 0.1);
  c.lineWidth = 0.8;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  for (let x = minX - (maxY - minY); x < maxX; x += 5) {
    c.beginPath();
    c.moveTo(x, maxY);
    c.lineTo(x + (maxY - minY), minY);
    c.stroke();
  }
  c.restore();
}

/* ---------- walls ---------- */

function wallPattern(c: Ctx, P: Projector, id: RoomId, b: RoomBox, light: number): void {
  const D = DEPTH;
  const ink = withAlpha(INK, 0.28);
  const pale = withAlpha(BONE, 0.07 + light * 0.05);
  switch (id) {
    case 'crypt': {
      let row = 0;
      for (let z = b.z0 + 0.9; z < b.z1; z += 1.1, row++) {
        seg(c, P(b.x0, D, z), P(b.x1, D, z), ink, 0.8);
        for (let x = b.x0 + (row % 2) * 1.1; x < b.x1; x += 2.2) seg(c, P(x, D, z), P(x, D, z - 1.1), ink, 0.8);
      }
      for (const nx of [3.4, 9.4, 15.4]) {
        quad(c, [P(nx, D, b.z0 + 1.2), P(nx + 1.8, D, b.z0 + 1.3), P(nx + 1.8, D, b.z0 + 3.2), P(nx + 0.8, D, b.z0 + 4.1), P(nx - 0.1, D, b.z0 + 3.1)], withAlpha(INK, 0.6));
        const sk = P(nx + 0.9, D, b.z0 + 1.8);
        c.fillStyle = withAlpha(BONE, 0.22);
        c.beginPath();
        c.ellipse(sk.x, sk.y, 4, 3.2, 0, 0, Math.PI * 2);
        c.fill();
      }
      break;
    }
    case 'kitchen': {
      for (let z = b.z0 + 0.8; z <= b.z0 + 2.6; z += 0.6) seg(c, P(b.x0, D, z), P(b.x1, D, z), ink, 0.6);
      for (let x = b.x0 + 0.6; x < b.x1; x += 0.6) seg(c, P(x, D, b.z0), P(x, D, b.z0 + 2.6), ink, 0.6);
      seg(c, P(b.x0, D, b.z0 + 2.6), P(b.x1, D, b.z0 + 2.6), withAlpha(INK, 0.5), 1.2);
      box(c, P, b.x0 + 4.2, D - 0.6, b.z0 + 4.6, 4.2, 0.6, 0.18, tone('#4d4650'));
      for (const px of [4.6, 5.8, 7.1]) box(c, P, b.x0 + px, D - 0.5, b.z0 + 4.78, 0.7, 0.4, 0.6 + (px % 2) * 0.3, tone('#3b3d45'));
      break;
    }
    case 'parlour': {
      quad(c, [P(b.x0, D, b.z0), P(b.x1, D, b.z0), P(b.x1, D, b.z0 + 2.2), P(b.x0, D, b.z0 + 2.2)], withAlpha(INK, 0.22));
      seg(c, P(b.x0, D, b.z0 + 2.2), P(b.x1, D, b.z0 + 2.2), withAlpha(BONE, 0.14), 1.2);
      for (let x = b.x0 - 8; x < b.x1 + 8; x += 1.4) {
        seg(c, P(x, D, b.z0 + 2.3), P(x + 5.6, D, b.z1), pale, 0.6);
        seg(c, P(x + 5.6, D, b.z0 + 2.3), P(x, D, b.z1), pale, 0.6);
      }
      break;
    }
    case 'workshop': {
      let row = 0;
      for (let z = b.z0 + 0.6; z < b.z1; z += 0.6, row++) {
        seg(c, P(b.x0, D, z), P(b.x1, D, z), ink, 0.5);
        for (let x = b.x0 + (row % 2) * 0.6; x < b.x1; x += 1.2) seg(c, P(x, D, z), P(x, D, z - 0.6), ink, 0.5);
      }
      quad(c, [P(b.x0 + 1.2, D, b.z0 + 2.6), P(b.x0 + 3.6, D, b.z0 + 2.7), P(b.x0 + 3.5, D, b.z0 + 4.8), P(b.x0 + 1.1, D, b.z0 + 4.7)], mix('#d8d0bc', INK, 0.45));
      seg(c, P(b.x0 + 1.5, D, b.z0 + 3.2), P(b.x0 + 3.2, D, b.z0 + 4.3), withAlpha(INK, 0.7), 0.8);
      seg(c, P(b.x0 + 2.3, D, b.z0 + 2.9), P(b.x0 + 2.3, D, b.z0 + 4.5), withAlpha(INK, 0.7), 0.8);
      break;
    }
    case 'attic': {
      const beam = tone('#3a3236');
      quad(c, [P(b.x0, D, b.z1 - 0.5), P(b.x0 + 6.5, D, b.z1 - 3.7), P(b.x0 + 7.1, D, b.z1 - 3.2), P(b.x0 + 0.6, D, b.z1)], beam.front, beam.line);
      quad(c, [P(b.x1 - 0.6, D, b.z1), P(b.x1 - 5.8, D, b.z1 - 3.1), P(b.x1 - 5.2, D, b.z1 - 3.6), P(b.x1, D, b.z1 - 0.5)], beam.front, beam.line);
      break;
    }
    case 'roof':
      break;
  }
}

function windowShape(P: Projector, wx: number, z0: number): Point[] {
  const D = DEPTH;
  return [P(wx - 0.75, D, z0 + 1.7), P(wx + 0.8, D, z0 + 1.85), P(wx + 0.7, D, z0 + 4.4), P(wx + 0.05, D, z0 + 5.3), P(wx - 0.85, D, z0 + 4.2)];
}

function windowXs(b: RoomBox, n: number, hiddenRight: boolean): number[] {
  const lo = b.x0 + 1.6;
  const hi = b.x1 - (hiddenRight ? 4.4 : 1.8);
  if (n <= 0) return [];
  if (n === 1) return [(lo + hi) / 2];
  return Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
}

function drawWindows(c: Ctx, P: Projector, b: RoomBox, room: SceneRoom, light: number, hiddenRight: boolean, night: boolean): void {
  for (const wx of windowXs(b, room.windows, hiddenRight)) {
    const pts = windowShape(P, wx, b.z0);
    let fill: string | CanvasGradient;
    if (room.lit && night) {
      const top = pts[3]!;
      const bottom = pts[0]!;
      const g = c.createLinearGradient(top.x, top.y, bottom.x, bottom.y);
      g.addColorStop(0, mix(LAMP, '#ffffff', 0.25));
      g.addColorStop(1, mix(LAMP, '#b9692c', 0.35));
      fill = g;
    } else {
      fill = ramp([[0, '#0d1220'], [0.35, '#3a3346'], [1, '#d9d4c6']], light);
    }
    c.beginPath();
    c.moveTo(pts[0]!.x, pts[0]!.y);
    for (const p of pts.slice(1)) c.lineTo(p.x, p.y);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 2.2;
    c.stroke();
    const mid = P(wx, DEPTH, b.z0 + 3.2);
    seg(c, P(wx - 0.8, DEPTH, b.z0 + 3.1), P(wx + 0.75, DEPTH, b.z0 + 3.3), INK, 1.2);
    seg(c, P(wx + 0.02, DEPTH, b.z0 + 1.78), P(wx + 0.05, DEPTH, b.z0 + 5.2), INK, 1.2);
    if (!(room.lit && night) && light < 0.5) seg(c, { x: mid.x - 4, y: mid.y - 10 }, { x: mid.x + 1, y: mid.y - 15 }, withAlpha(BONE, 0.35), 1);
  }
}

/** Painted light, Caligari-style: hard-edged shafts rather than soft falloff. */
function paintedLight(c: Ctx, P: Projector, b: RoomBox, room: SceneRoom, hiddenRight: boolean, night: boolean, light: number): void {
  if (room.id === 'roof') return;
  c.save();
  clipQuad(c, [P(b.x0, 0, b.z0), P(b.x1, 0, b.z0), P(b.x1, DEPTH, b.z0), P(b.x1, DEPTH, b.z1), P(b.x0, DEPTH, b.z1)]);
  quad(c, [P(b.x0, DEPTH, b.z1), P(b.x0 + (b.x1 - b.x0) * 0.42, DEPTH, b.z1), P(b.x0 + (b.x1 - b.x0) * 0.12, DEPTH, b.z0), P(b.x0, DEPTH, b.z0)], withAlpha(INK, 0.16));
  if (night && !room.lit && light < 0.5) {
    for (const wx of windowXs(b, room.windows, hiddenRight)) {
      quad(c, [P(wx - 0.75, DEPTH, b.z0 + 1.7), P(wx + 0.8, DEPTH, b.z0 + 1.85), P(wx + 3.4, DEPTH - 6, b.z0), P(wx + 1.2, DEPTH - 6.4, b.z0)], withAlpha(BONE, 0.08));
    }
  }
  if (night && room.lit) {
    const cx = (b.x0 + b.x1) / 2;
    quad(c, [P(cx - 0.3, DEPTH * 0.5, b.z1 - 1), P(cx + 0.3, DEPTH * 0.5, b.z1 - 1), P(cx + 4.2, 0.6, b.z0), P(cx - 3.8, 0.4, b.z0)], withAlpha(LAMP, 0.1));
    radial(c, P(cx, DEPTH * 0.5, b.z0), 6 * K, LAMP, 0.22);
  }
  c.restore();
}

/* ---------- rooms ---------- */

interface Placed {
  item: Furniture;
  x: number;
  y: number;
  z: number;
}

function placeFurniture(id: RoomId, b: RoomBox, items: readonly Furniture[]): Placed[] {
  const slots = SLOTS[id];
  const out: Placed[] = [];
  let slot = 0;
  let relic = 0;
  for (const item of items) {
    if (item.artefact) {
      out.push({ item, x: b.x1 - 1.4 - relic * 1.05, y: DEPTH - 1.1, z: b.z0 });
      relic += 1;
      continue;
    }
    const s = slots[slot % slots.length]!;
    const lap = Math.floor(slot / slots.length);
    out.push({ item, x: b.x0 + s[0] + lap * 0.6, y: s[1] - lap * 0.4, z: b.z0 });
    slot += 1;
  }
  return out;
}

function drawItem(c: Ctx, P: Projector, p: Placed, o: DrawOpts): void {
  const spec = p.item.artefact ? FURNITURE['artefact']! : FURNITURE[p.item.id];
  const draw = spec?.draw;
  const opts = { ...o, dim: p.item.broken ? 0.75 : o.dim, name: p.item.name };
  if (!draw) {
    box(c, P, p.x, p.y, p.z, 2, 1.4, 1.2, tone('#55535c', opts.dim));
    return;
  }
  if (!p.item.broken) {
    draw(c, P, p.x, p.y, p.z, opts);
    return;
  }
  const anchor = P(p.x + (spec?.w ?? 2) / 2, p.y, p.z);
  c.save();
  c.translate(anchor.x, anchor.y);
  c.rotate(0.09);
  c.translate(-anchor.x, -anchor.y);
  draw(c, P, p.x, p.y, p.z, opts);
  c.restore();
  const a = P(p.x + 0.4, p.y, p.z + (spec?.h ?? 1) * 0.8);
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(a.x + 6, a.y + 5);
  c.lineTo(a.x + 3, a.y + 9);
  c.lineTo(a.x + 10, a.y + 14);
  c.strokeStyle = withAlpha(ALARM, 0.8);
  c.lineWidth = 1.2;
  c.stroke();
  for (let i = 0; i < 3; i++) {
    const s = P(p.x + 0.6 + i * 0.9, p.y - 0.4 - (i % 2) * 0.3, p.z);
    quad(c, [s, { x: s.x + 5, y: s.y - 1 }, { x: s.x + 4, y: s.y + 1.5 }], mix('#58505a', INK, 0.4));
  }
}

interface Ctx2 {
  c: Ctx;
  P: Projector;
  scene: Scene;
  frame: number;
  motion: boolean;
  light: number;
  night: boolean;
  hits: HitBox[];
}

function drawSpriteAt(x: Ctx2, s: Sprite, at: Point, scale: number, facing: 1 | -1 = 1): void {
  const { c } = x;
  c.save();
  c.translate(at.x, at.y);
  c.scale(scale, scale);
  if (s.pose !== 'asleep') {
    c.fillStyle = withAlpha(INK, 0.35);
    c.beginPath();
    c.ellipse(0, 1, 13, 3.2, 0, 0, Math.PI * 2);
    c.fill();
  }
  drawFigure(c, s.archetype, { pose: s.pose, t: x.frame + hash01(s.id.length, 3) * 100, accent: s.accent, style: 'stage', motion: x.motion, facing });
  c.restore();
  const h = (s.pose === 'asleep' ? 18 : figureHeight(s.archetype)) * scale;
  const w = (s.pose === 'asleep' ? figureHeight(s.archetype) : 30) * scale;
  x.hits.push({ id: s.id, name: s.name, caption: s.caption, x: at.x - w / 2, y: at.y - h, w, h: h + 4 });
}

function drawRoom(x: Ctx2, room: SceneRoom, items: readonly Furniture[], sprites: readonly Sprite[], hiddenRight: boolean, leftmost: boolean): void {
  const { c, P, light, night } = x;
  const b = ROOM_BOXES[room.id];
  const D = DEPTH;
  const wall = WALLS[room.id];
  const floor = FLOORS[room.id];
  const back = [P(b.x0, D, b.z0), P(b.x1, D, b.z0), P(b.x1, D, b.z1), P(b.x0, D, b.z1)];
  quad(c, back, wall);
  c.save();
  clipQuad(c, back);
  wallPattern(c, P, room.id, b, light);
  c.restore();
  drawWindows(c, P, b, room, light, hiddenRight, night);
  const floorPts = [P(b.x0, 0, b.z0), P(b.x1, 0, b.z0), P(b.x1, D, b.z0), P(b.x0, D, b.z0)];
  quad(c, floorPts, floor);
  c.save();
  clipQuad(c, floorPts);
  if (room.id === 'crypt' || room.id === 'kitchen') {
    for (let y = 1.3; y < D; y += 1.3) seg(c, P(b.x0, y, b.z0), P(b.x1, y, b.z0), withAlpha(INK, 0.3), 0.7);
    for (let xx = b.x0 + 1.4; xx < b.x1; xx += 1.4) seg(c, P(xx, 0, b.z0), P(xx, D, b.z0), withAlpha(INK, 0.3), 0.7);
  } else {
    for (let xx = b.x0 + 0.9; xx < b.x1; xx += 0.9) seg(c, P(xx, 0, b.z0), P(xx, D, b.z0), withAlpha(INK, 0.28), 0.7);
  }
  c.restore();
  const side = [P(b.x0, 0, b.z0), P(b.x0, D, b.z0), P(b.x0, D, b.z1), P(b.x0, 0, b.z1)];
  quad(c, side, mix(wall, INK, leftmost ? 0.3 : 0.2), withAlpha(INK, 0.6), 0.8);
  if (room.secretPassage) {
    c.save();
    c.setLineDash([3, 3]);
    quad(c, [P(b.x0, 2.4, b.z0), P(b.x0, 5, b.z0), P(b.x0, 5, b.z0 + 3.8), P(b.x0, 3.7, b.z0 + 4.8), P(b.x0, 2.4, b.z0 + 3.8)], withAlpha(INK, 0.45), withAlpha(BONE, 0.45), 1);
    c.restore();
  }
  paintedLight(c, P, b, room, hiddenRight, night, light);

  const o: DrawOpts = { t: x.frame, night, dim: 0, motion: x.motion };
  const placed = placeFurniture(room.id, b, items);
  if (room.id === 'parlour' && x.scene.defences.organ) {
    FIXTURES['organ']!.draw(c, P, b.x0 + 7.2, DEPTH - 1.6, b.z0, o);
  }
  if (room.id === 'crypt' && x.scene.defences.decoyCoffins) {
    FIXTURES['decoyCoffins']!.draw(c, P, b.x0 + 20, 4.2, b.z0, o);
  }
  for (const p of placed.toSorted((a, z) => z.y - a.y || a.x - z.x)) drawItem(c, P, p, o);

  // night: unlit rooms sink into the dark; lit ones glow and are what the village sees
  const dark = room.lit && night ? 0.1 : Math.max(0, Math.min(0.52, (0.72 - light) * 0.8));
  if (dark > 0) {
    const region = [P(b.x0, 0, b.z0), P(b.x1, 0, b.z0), P(b.x1, D, b.z0), P(b.x1, D, b.z1), P(b.x0, D, b.z1), P(b.x0, 0, b.z1)];
    quad(c, region, withAlpha(INK, dark));
  }
  if (room.lit && night) {
    const cx = (b.x0 + b.x1) / 2;
    const lamp = P(cx, D * 0.5, b.z1 - 1);
    seg(c, P(cx, D * 0.5, b.z1), lamp, withAlpha(INK, 0.9), 1);
    const flick = x.motion ? 0.9 + 0.1 * Math.sin(x.frame / 4.3 + b.x0) : 1;
    radial(c, lamp, 7 * K, LAMP, 0.28 * flick);
    c.fillStyle = mix(LAMP, '#ffffff', 0.3);
    c.beginPath();
    c.ellipse(lamp.x, lamp.y + 3, 3, 4, 0, 0, Math.PI * 2);
    c.fill();
  }

  // residents: actors at the front of the stage, sleepers on their beds
  const awake = sprites.filter((s) => s.pose !== 'asleep');
  awake.forEach((s, i) => {
    const sx = b.x0 + ((b.x1 - b.x0) * (i + 1)) / (awake.length + 1);
    drawSpriteAt(x, s, P(sx, 1.1, b.z0), SPRITE_SCALE, i % 2 === 0 ? 1 : -1);
  });
  const used = new Map<string, number>();
  sprites
    .filter((s) => s.pose === 'asleep')
    .forEach((s, i) => {
      const bed = placed.find((p) => p.item.id === s.bed && !p.item.broken);
      const spec = bed ? FURNITURE[bed.item.id] : undefined;
      const n = used.get(s.bed) ?? 0;
      used.set(s.bed, n + 1);
      const at = bed && spec
        ? P(bed.x + spec.w / 2 + n * 0.8, bed.y + spec.d / 2, bed.z + (spec.top ?? 0.9) + n * 0.6)
        : P(b.x0 + 2.5 + i * 4.5, 1.6, b.z0);
      drawSpriteAt(x, s, at, SPRITE_SCALE * 0.9);
    });

}

/** Section labels: room names lettered on the cut floor slab beneath each room, like an architect's section. */
function drawLabels(c: Ctx, P: Projector, rooms: readonly SceneRoom[], night: boolean): void {
  c.save();
  c.font = `600 8px ${TITLE_FONT}`;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  for (const room of rooms) {
    const b = ROOM_BOXES[room.id];
    const at = P(b.x0 + 0.5, 0, b.z0 - 0.3);
    const text = room.name.replace(/^the /, '').toUpperCase().split('').join(' ');
    c.fillStyle = room.lit && night ? LAMP : withAlpha(BONE, 0.7);
    c.fillText(text, at.x, at.y + 0.5);
    if (room.lit && night) {
      const wdt = c.measureText(text).width;
      c.beginPath();
      c.arc(at.x + wdt + 6, at.y + 0.5, 2, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

function drawRoof(x: Ctx2, room: SceneRoom | undefined, items: readonly Furniture[], sprites: readonly Sprite[]): void {
  const { c, P, scene, frame, motion, night } = x;
  const z = 16;
  const D = DEPTH;
  const deck = [P(0, 0, z), P(HOUSE_WIDTH, 0, z), P(HOUSE_WIDTH, D, z), P(0, D, z)];
  quad(c, deck, FLOORS.roof);
  c.save();
  clipQuad(c, deck);
  for (let xx = 2; xx < HOUSE_WIDTH; xx += 2) seg(c, P(xx, 0, z), P(xx, D, z), withAlpha(INK, 0.4), 0.8);
  c.restore();
  const stone = tone('#4a4851');
  box(c, P, -WALL, D - 0.5, z, HOUSE_WIDTH + WALL * 2, 0.5, 1.2, stone);
  for (let xx = -WALL; xx < HOUSE_WIDTH; xx += 2.4) box(c, P, xx, D - 0.5, z + 1.2, 1.2, 0.5, 0.8, stone);
  box(c, P, -WALL, 0, z, WALL, D - 0.5, 1, stone);
  // bell turret
  const tower = tone('#504d57');
  box(c, P, 0.6, 4.2, z, 4.4, 3.8, 6.5, tower);
  quad(c, [P(1.8, 4.2, z + 2.6), P(3.8, 4.2, z + 2.6), P(3.8, 4.2, z + 5), P(2.8, 4.2, z + 6), P(1.8, 4.2, z + 5)], INK);
  const swing = motion ? Math.sin(frame / 40) * 0.08 : 0;
  const bt = P(2.8, 4.3, z + 5.4);
  c.save();
  c.translate(bt.x, bt.y);
  c.rotate(swing);
  c.fillStyle = '#7d6b48';
  c.beginPath();
  c.moveTo(-3, 1);
  c.quadraticCurveTo(-4, 9, -8, 12);
  c.lineTo(8, 12);
  c.quadraticCurveTo(4, 9, 3, 1);
  c.closePath();
  c.fill();
  c.restore();
  const apex = P(2.8, 6.1, z + 11.2);
  quad(c, [P(0.3, 3.9, z + 6.5), P(5.3, 3.9, z + 6.5), apex], mix('#3a3640', INK, 0.1), INK, 0.8);
  quad(c, [P(5.3, 3.9, z + 6.5), P(5.3, 8.3, z + 6.5), apex], mix('#3a3640', INK, 0.4), INK, 0.8);
  // chimney and smoke
  box(c, P, 19, 6.2, z, 1.6, 1.4, 5, tone('#4d4340'));
  const stoveLit = scene.furniture.some((f) => f.id === 'stove' && !f.broken);
  if (stoveLit) {
    for (let i = 0; i < 4; i++) {
      const phase = motion ? ((frame / 3 + i * 25) % 100) / 100 : i / 4;
      const s = P(19.8 + phase * 4, 6.9, z + 5.4 + phase * 6);
      c.fillStyle = withAlpha(night ? '#5b5966' : '#d8d0bc', 0.35 * (1 - phase));
      c.beginPath();
      c.ellipse(s.x, s.y, 3 + phase * 9, 2 + phase * 5, -0.3, 0, Math.PI * 2);
      c.fill();
    }
  }
  // lightning rod
  if (scene.lightningRod) {
    FIXTURES['lightningRod']!.draw(c, P, 22.6, 4.8, z, { t: frame, night, dim: 0, motion });
  } else {
    seg(c, P(22.7, 4.9, z), P(22.7, 4.9, z + 2.2), '#6d6a72', 1.6);
    seg(c, P(22.7, 4.9, z + 2.2), P(24.4, 4.9, z + 1.4), '#6d6a72', 1.6);
  }
  if (room) {
    const placed = placeFurniture('roof', ROOM_BOXES.roof, items);
    const o: DrawOpts = { t: frame, night, dim: 0, motion };
    for (const p of placed.toSorted((a, b) => b.y - a.y || a.x - b.x)) drawItem(c, P, p, o);
    if (room.lit && night) radial(c, P(12, 4, z + 1), 6 * K, LAMP, 0.2);
    const awake = sprites.filter((s) => s.pose !== 'asleep');
    awake.forEach((s, i) => drawSpriteAt(x, s, P(8 + i * 4, 1.2, z), SPRITE_SCALE));
    sprites
      .filter((s) => s.pose === 'asleep')
      .forEach((s, i) => {
        const bed = placed.find((p) => p.item.id === s.bed && !p.item.broken);
        const spec = bed ? FURNITURE[bed.item.id] : undefined;
        const at = bed && spec ? P(bed.x + spec.w / 2, bed.y + spec.d / 2, z + (spec.top ?? 0.9)) : P(9 + i * 4, 1.4, z);
        drawSpriteAt(x, s, at, SPRITE_SCALE * 0.9);
      });
  }
}

function drawExteriorWall(c: Ctx, P: Projector, light: number): void {
  const X = HOUSE_WIDTH + WALL;
  const face = [P(X, 0, -7), P(X, DEPTH, -7), P(X, DEPTH, 17.2), P(X, 0, 17.2)];
  quad(c, [P(X, 0, 0), P(X, DEPTH, 0), P(X, DEPTH, 17.2), P(X, 0, 17.2)], ramp([[0, '#24232b'], [0.35, '#34313b'], [1, '#77737b']], light));
  c.save();
  clipQuad(c, face);
  for (let z = 1; z < 17; z += 1.2) seg(c, P(X, 0, z), P(X, DEPTH, z), withAlpha(INK, 0.35), 0.7);
  for (const [wy, wz] of [[3.2, 2.6], [3.2, 10.6]] as const) {
    quad(c, [P(X, wy, wz), P(X, wy + 1.6, wz), P(X, wy + 1.6, wz + 2.8), P(X, wy + 0.8, wz + 3.6), P(X, wy, wz + 2.8)], '#0d1018', INK, 1.4);
  }
  seg(c, P(X, DEPTH - 0.6, 17), P(X, DEPTH - 0.6, 0), withAlpha(INK, 0.8), 1.6);
  c.restore();
}

/* ---------- ground, soil and the lane ---------- */

function drawGround(x: Ctx2, w: number, h: number): void {
  const { c, P, light, scene } = x;
  quad(c, [P(-40, 0, 0), P(90, 0, 0), P(90, 26, 0), P(-40, 26, 0)], ramp(GROUND, light));
  const laneCol = ramp(LANE, light);
  quad(c, [P(27, 0.6, 0), P(46, 8.6, 0), { x: 700, y: 297 }, { x: 694, y: 297 }, P(44, 12.4, 0), P(27, 4.8, 0)], laneCol);
  for (let i = 0; i < 26; i++) {
    const gx = hash01(scene.seed, 1500 + i) * 60 - 20;
    const gy = hash01(scene.seed, 1600 + i) * 24;
    if (gx > -1 && gx < HOUSE_WIDTH + 1.5 && gy < DEPTH + 0.5) continue;
    const g = P(gx, gy, 0);
    seg(c, g, { x: g.x + 2, y: g.y - 4 }, withAlpha(INK, 0.5), 0.8);
    seg(c, g, { x: g.x - 2, y: g.y - 3 }, withAlpha(INK, 0.5), 0.8);
  }
  // soil cross-section under the front edge
  const top = P(0, 0, 0).y;
  quad(c, [{ x: 0, y: top }, { x: w, y: top }, { x: w, y: h }, { x: 0, y: h }], ramp(SOIL, light));
  for (let i = 0; i < 4; i++) {
    const sy = top + 18 + i * 34;
    c.beginPath();
    c.moveTo(0, sy);
    for (let sx = 0; sx <= w; sx += 40) c.lineTo(sx, sy + Math.sin(sx / 70 + i) * 4);
    c.strokeStyle = withAlpha(INK, 0.35);
    c.lineWidth = 1;
    c.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const sx = hash01(scene.seed, 1700 + i) * w;
    const sy = top + 8 + hash01(scene.seed, 1800 + i) * (h - top - 8);
    c.fillStyle = withAlpha(mix('#4a4448', BONE, 0.1), 0.5);
    c.beginPath();
    c.ellipse(sx, sy, 2 + hash01(scene.seed, 1900 + i) * 4, 1.5 + hash01(scene.seed, 2000 + i) * 2, 0.3, 0, Math.PI * 2);
    c.fill();
  }
  for (let i = 0; i < 12; i++) {
    const rx = hash01(scene.seed, 2100 + i) * w;
    c.beginPath();
    c.moveTo(rx, top);
    c.quadraticCurveTo(rx + 6, top + 10, rx + 2 + hash01(scene.seed, 2200 + i) * 10, top + 18 + hash01(scene.seed, 2300 + i) * 16);
    c.strokeStyle = withAlpha(INK, 0.6);
    c.lineWidth = 0.8;
    c.stroke();
  }
  // the moat, in section and on the ground
  const water = ramp([[0, '#0b1018'], [0.35, '#1d2230'], [1, '#6d7680']], light);
  quad(c, [P(24.9, 0, 0), P(26.5, 0, 0), P(26.3, 0, -2.6), P(25.1, 0, -2.6)], water, INK, 1);
  quad(c, [P(24.9, 0, 0), P(26.5, 0, 0), P(26.5, 22, 0), P(24.9, 22, 0)], water);
  const glint = P(25.7, 10, 0);
  seg(c, { x: glint.x - 4, y: glint.y }, { x: glint.x + 5, y: glint.y - 1 }, withAlpha(BONE, light < 0.5 ? 0.35 : 0.5), 1);
}

function drawTunnel(c: Ctx, P: Projector): void {
  const pts = [P(-9, 0, -6), P(-WALL, 0, -6), P(-WALL, 0, -2.6), P(-2.2, 0, -1.6), P(-9, 0, -1.8)];
  quad(c, pts, withAlpha(INK, 0.85));
  c.save();
  c.setLineDash([4, 3]);
  quad(c, pts, null, withAlpha(BONE, 0.4), 1);
  c.restore();
  for (let i = 0; i < 4; i++) seg(c, P(-8.6 + i * 0.5, 0, -6 + i * 1.1), P(-7.2 + i * 0.5, 0, -6 + i * 1.1), withAlpha(BONE, 0.3), 1);
  quad(c, [P(-9.4, 0, 0), P(-7.6, 0, 0), P(-7.6, 1.6, 0), P(-9.4, 1.6, 0)], '#2a2620', INK, 1);
}

/* ---------- the scene ---------- */

export function drawScene(c: Ctx, scene: Scene, frame: number, opts: RenderOptions): HitBox[] {
  const w = STAGE_W;
  const h = STAGE_H;
  const light = Math.max(0, Math.min(1, scene.daylight));
  const night = light < 0.5;
  const motion = opts.motion;
  const P = makeProjector(HOUSE_ORIGIN.x, HOUSE_ORIGIN.y);
  const x: Ctx2 = { c, P, scene, frame, motion, light, night, hits: [] };
  const horizon = 300;

  c.save();
  drawSky(c, w, h, light);
  drawStars(c, w, h, light, scene.seed, frame, motion);
  drawMoon(c, 118, 92, scene.moon, light);
  drawClouds(c, w, light, frame, motion, scene.seed);
  drawHills(c, w, h, horizon, light, scene.seed);
  drawGround(x, w, h);
  drawFog(c, w, horizon - 6, horizon + 30, frame, night ? 0.3 : 0.18, motion, scene.seed);
  drawVillage(c, 640, 297, {
    litWindows: Math.round(scene.suspicion / 7),
    valley: scene.valley,
    light,
    seed: scene.seed,
    t: frame,
    motion,
  });

  // the house, cellar up
  const byRoom = new Map<RoomId, Furniture[]>();
  for (const f of scene.furniture) byRoom.set(f.room, [...(byRoom.get(f.room) ?? []), f]);
  const spritesIn = (id: RoomId) => scene.sprites.filter((s) => s.room === id);
  const roomOf = (id: RoomId) => scene.rooms.find((r) => r.id === id);
  const crypt = roomOf('crypt');
  if (crypt?.secretPassage) drawTunnel(c, P);
  for (const level of [-1, 0, 1]) {
    const onLevel = scene.rooms.filter((r) => ROOM_BOXES[r.id].level === level).toSorted((a, b) => ROOM_BOXES[a.id].x0 - ROOM_BOXES[b.id].x0);
    onLevel.forEach((r, i) => drawRoom(x, r, byRoom.get(r.id) ?? [], spritesIn(r.id), i < onLevel.length - 1, i === 0));
  }
  drawExteriorWall(c, P, light);
  drawRoof(x, roomOf('roof'), byRoom.get('roof') ?? [], spritesIn('roof'));
  // cut faces: slabs between levels and the outer walls
  for (const z of [-7, 0, 8, 16]) poche(c, [P(-WALL, 0, z - 0.75), P(HOUSE_WIDTH + WALL, 0, z - 0.75), P(HOUSE_WIDTH + WALL, 0, z), P(-WALL, 0, z)]);
  poche(c, [P(-WALL, 0, -7.6), P(0, 0, -7.6), P(0, 0, 17), P(-WALL, 0, 17)]);
  poche(c, [P(HOUSE_WIDTH, 0, -7.6), P(HOUSE_WIDTH + WALL, 0, -7.6), P(HOUSE_WIDTH + WALL, 0, 17.2), P(HOUSE_WIDTH, 0, 17.2)]);
  drawLabels(c, P, scene.rooms, night);

  // outside: gate, defences, people on the lane
  const o: DrawOpts = { t: frame, night, dim: 0, motion, active: scene.defences.drawbridge };
  FIXTURES['drawbridge']!.draw(c, P, 24.6, 1.1, 0, o);
  if (scene.defences.fogMachine) FIXTURES['fogMachine']!.draw(c, P, 29, 8, 0, o);
  const out = scene.sprites.filter((s) => s.room === 'out');
  out.forEach((s, i) => drawSpriteAt(x, s, P(29.5 + i * 2.6, 1.2 + (i % 2) * 1.8, 0), SPRITE_SCALE * 0.92));
  if (scene.hunterPresent) {
    const at = P(34, 6.6, 0);
    c.save();
    c.translate(at.x, at.y);
    c.scale(0.86, 0.86);
    drawHunter(c, frame, motion, scene.valley);
    c.restore();
  }
  if (scene.mobGathering) {
    const n = 6 + Math.max(0, Math.floor((scene.suspicion - 90) / 2));
    for (let i = 0; i < n; i++) {
      const at = P(37 + (i % 6) * 2.2 + Math.floor(i / 6) * 1.1, 9 + Math.floor(i / 6) * 1.6 + (i % 2) * 0.6, 0);
      c.save();
      c.translate(at.x, at.y);
      c.scale(0.7, 0.7);
      drawTorchbearer(c, i, frame, motion);
      c.restore();
    }
  }
  if (scene.defences.fogMachine) drawFog(c, w, HOUSE_ORIGIN.y - 22, HOUSE_ORIGIN.y + 4, frame, night ? 0.45 : 0.6, motion, scene.seed + 1, '#8f8b9b');

  // storms find the rod when someone in the house lives on lightning
  if (night && motion && scene.lightningRod && scene.lightningLovers) {
    const cycle = 420;
    const k = frame % cycle;
    if (k < 9) drawLightning(c, w, h, P(22.7, 4.9, 25.7), Math.floor(frame / cycle), 1 - k / 9);
  }
  c.restore();

  if (opts.grain) {
    drawVignette(c, w, h, night ? 0.62 : 0.4);
    if (opts.noise) drawGrain(c, w, h, opts.noise, opts.noiseSize ?? 128, frame, motion, night ? 0.09 : 0.06);
  }
  if (scene.card) drawCard(c, w, h, scene.card);
  return x.hits;
}

/** The hit box under a point, topmost first. */
export function hitTest(hits: readonly HitBox[], px: number, py: number): HitBox | undefined {
  for (let i = hits.length - 1; i >= 0; i--) {
    const b = hits[i]!;
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b;
  }
  return undefined;
}
