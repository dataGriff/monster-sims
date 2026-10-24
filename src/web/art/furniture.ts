/**
 * Furniture and fixtures, drawn as small oblique boxes in world units on the
 * stage projection. The same drawers render the build catalogue's icons, so
 * what you buy looks like what appears in the house.
 */
import { BONE, INK, LAMP, mix, withAlpha } from './palette.ts';
import { RECEDE_X, makeProjector, type Point, type Projector } from './stage.ts';

type Ctx = CanvasRenderingContext2D;

export interface DrawOpts {
  t: number;
  night: boolean;
  /** 0 normal, up to 1 for broken or unlit. */
  dim: number;
  motion: boolean;
  /** Item name (artefacts pick their shape from it). */
  name?: string;
  /** Drawbridge raised, fog machine running. */
  active?: boolean;
}

export interface Tone {
  front: string;
  top: string;
  side: string;
  line: string;
}

export function tone(base: string, dim = 0): Tone {
  const b = mix(base, INK, dim * 0.55);
  return { front: b, top: mix(b, BONE, 0.16), side: mix(b, INK, 0.32), line: mix(b, INK, 0.7) };
}

export const WOOD = '#58505a';
export const DARK_WOOD = '#3f3941';
export const STONE = '#6a6872';
export const METAL = '#45474f';
export const CLOTH = '#6e6677';
export const PORCELAIN = '#a9a5ae';
export const GILT = '#a88c4a';
export const BRONZE = '#7d6b48';

export function quad(c: Ctx, pts: readonly Point[], fill: string | null, stroke?: string, lw = 0.7): void {
  c.beginPath();
  c.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]!.x, pts[i]!.y);
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lw;
    c.stroke();
  }
}

/** A box with its front-left-bottom corner at (x, y, z). Draws the visible faces: right side, top, front. */
export function box(c: Ctx, P: Projector, x: number, y: number, z: number, w: number, d: number, h: number, tn: Tone): void {
  const f0 = P(x, y, z);
  const f1 = P(x + w, y, z);
  const f2 = P(x + w, y, z + h);
  const f3 = P(x, y, z + h);
  const b1 = P(x + w, y + d, z);
  const b2 = P(x + w, y + d, z + h);
  const b3 = P(x, y + d, z + h);
  quad(c, [f1, b1, b2, f2], tn.side, tn.line);
  quad(c, [f3, f2, b2, b3], tn.top, tn.line);
  quad(c, [f0, f1, f2, f3], tn.front, tn.line);
}

function seg(c: Ctx, a: Point, b: Point, colour: string, lw: number): void {
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.strokeStyle = colour;
  c.lineWidth = lw;
  c.stroke();
}

function glow(c: Ctx, at: Point, r: number, colour: string, alpha: number): void {
  const g = c.createRadialGradient(at.x, at.y, 0, at.x, at.y, r);
  g.addColorStop(0, withAlpha(colour, alpha));
  g.addColorStop(1, withAlpha(colour, 0));
  c.fillStyle = g;
  c.fillRect(at.x - r, at.y - r, r * 2, r * 2);
}

function legs4(c: Ctx, P: Projector, x: number, y: number, z: number, w: number, d: number, h: number, tn: Tone): void {
  const s = 0.22;
  for (const [lx, ly] of [[x + w - s, y + d - s], [x, y + d - s], [x + w - s, y], [x, y]] as const) box(c, P, lx, ly, z, s, s, h, tn);
}

export type Drawer = (c: Ctx, P: Projector, x: number, y: number, z: number, o: DrawOpts) => void;

export interface ItemSpec {
  w: number;
  d: number;
  h: number;
  /** Height a sleeper lies at, if it is a bed. */
  top?: number;
  draw: Drawer;
}

const coffin: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(DARK_WOOD, o.dim);
  box(c, P, x, y, z, 3.4, 1.5, 0.9, tn);
  quad(c, [P(x + 0.2, y + 0.2, z + 0.92), P(x + 3.2, y + 0.2, z + 0.92), P(x + 3.2, y + 1.3, z + 0.92), P(x + 0.2, y + 1.3, z + 0.92)], mix(tn.top, INK, 0.1), tn.line);
  seg(c, P(x + 0.6, y + 0.75, z + 0.95), P(x + 1.9, y + 0.75, z + 0.95), withAlpha(BONE, 0.55 - o.dim * 0.3), 1);
  seg(c, P(x + 1.0, y + 0.35, z + 0.95), P(x + 1.0, y + 1.15, z + 0.95), withAlpha(BONE, 0.55 - o.dim * 0.3), 1);
};

const sarcophagus: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(STONE, o.dim);
  box(c, P, x, y, z, 3.6, 1.8, 1.3, tn);
  const head = P(x + 0.7, y + 0.9, z + 1.3);
  c.beginPath();
  c.ellipse(head.x, head.y, 0.5 * P.k, 0.36 * P.k, 0, 0, Math.PI * 2);
  c.fillStyle = mix(tn.top, BONE, 0.2);
  c.fill();
  c.strokeStyle = tn.line;
  c.stroke();
  seg(c, P(x + 1.4, y, z + 0.9), P(x + 1.4, y + 1.8, z + 1.3), withAlpha(GILT, 0.8 - o.dim * 0.5), 1.4);
  seg(c, P(x + 2.6, y, z + 0.9), P(x + 2.6, y + 1.8, z + 1.3), withAlpha(GILT, 0.8 - o.dim * 0.5), 1.4);
};

const table: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(WOOD, o.dim);
  legs4(c, P, x + 0.15, y + 0.15, z, 2.7, 1.7, 1.6, tn);
  box(c, P, x, y, z + 1.6, 3, 2, 0.3, tn);
  const wick = P(x + 2.2, y + 1.2, z + 2.6);
  box(c, P, x + 2.1, y + 1.1, z + 1.9, 0.22, 0.22, 0.7, tone(BONE, o.dim));
  if (o.night && o.dim < 0.5) {
    glow(c, wick, 2.2 * P.k, LAMP, 0.35);
    c.fillStyle = LAMP;
    c.beginPath();
    c.ellipse(wick.x, wick.y - 2, 1.4, 2.6, 0, 0, Math.PI * 2);
    c.fill();
  }
};

const stove: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(METAL, o.dim);
  box(c, P, x + 0.8, y + 0.6, z + 2.2, 0.5, 0.5, 4.6, tn);
  box(c, P, x, y, z, 2.2, 1.6, 2.2, tn);
  const g = [P(x + 0.5, y, z + 0.5), P(x + 1.7, y, z + 0.5), P(x + 1.7, y, z + 1.3), P(x + 0.5, y, z + 1.3)];
  const lit = o.night && o.dim < 0.5;
  quad(c, g, lit ? mix(LAMP, '#c0502c', 0.4) : mix(tn.front, INK, 0.5), tn.line);
  for (let i = 1; i < 4; i++) seg(c, P(x + 0.5 + i * 0.3, y, z + 0.5), P(x + 0.5 + i * 0.3, y, z + 1.3), tn.line, 0.8);
  if (lit) glow(c, P(x + 1.1, y, z + 0.9), 3 * P.k, '#e08a3c', 0.35);
};

const armchair: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(CLOTH, o.dim);
  box(c, P, x, y + 1.5, z, 2.4, 0.5, 2.6, tn);
  box(c, P, x, y, z, 2.4, 1.6, 1, tn);
  box(c, P, x, y, z + 1, 0.4, 2, 0.6, tn);
  box(c, P, x + 2, y, z + 1, 0.4, 2, 0.6, tn);
};

const piano: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(DARK_WOOD, o.dim);
  box(c, P, x, y + 0.5, z, 3.2, 1, 2.9, tn);
  box(c, P, x, y, z + 1.5, 3.2, 0.5, 0.25, tn);
  quad(c, [P(x + 0.1, y + 0.05, z + 1.76), P(x + 3.1, y + 0.05, z + 1.76), P(x + 3.1, y + 0.45, z + 1.76), P(x + 0.1, y + 0.45, z + 1.76)], mix(BONE, INK, o.dim * 0.5));
  for (let i = 0; i < 9; i++) seg(c, P(x + 0.35 + i * 0.32, y + 0.25, z + 1.77), P(x + 0.35 + i * 0.32, y + 0.45, z + 1.77), INK, 0.9);
  legs4(c, P, x + 0.1, y + 0.6, z, 3, 0.7, 0.1, tn);
};

const bench: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(WOOD, o.dim);
  legs4(c, P, x + 0.1, y + 0.1, z, 3.2, 1.4, 1.7, tn);
  box(c, P, x, y, z + 1.7, 3.4, 1.6, 0.3, tn);
  box(c, P, x + 0.3, y + 0.3, z + 2, 0.7, 0.5, 0.4, tone(METAL, o.dim));
  seg(c, P(x + 1.8, y + 0.8, z + 2.05), P(x + 2.9, y + 0.6, z + 2.05), tone(METAL, o.dim).top, 1.6);
  box(c, P, x + 2.7, y + 0.5, z + 2, 0.5, 0.3, 0.25, tone(METAL, o.dim));
};

const slab: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(STONE, o.dim);
  box(c, P, x + 0.4, y + 0.3, z, 2.8, 1.2, 0.9, tone(STONE, o.dim + 0.2));
  box(c, P, x, y, z + 0.9, 3.6, 1.8, 0.5, tn);
  for (const sx of [0.9, 2.6]) seg(c, P(x + sx, y, z + 1.4), P(x + sx, y + 1.8, z + 1.4), tone(METAL, o.dim).side, 1.4);
};

const cot: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(WOOD, o.dim);
  legs4(c, P, x, y, z, 3.2, 1.4, 0.6, tn);
  box(c, P, x, y, z + 0.6, 3.2, 1.4, 0.3, tone(CLOTH, o.dim));
  box(c, P, x + 0.1, y + 0.2, z + 0.9, 0.8, 1, 0.25, tone(BONE, o.dim + 0.3));
};

const tub: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(PORCELAIN, o.dim);
  for (const [fx, fy] of [[0.2, 0.2], [3, 0.2], [0.2, 1.2], [3, 1.2]] as const) box(c, P, x + fx, y + fy, z, 0.2, 0.2, 0.4, tone(METAL, o.dim));
  box(c, P, x, y, z + 0.4, 3.4, 1.6, 1.2, tn);
  const water = [P(x + 0.2, y + 0.2, z + 1.5), P(x + 3.2, y + 0.2, z + 1.5), P(x + 3.2, y + 1.4, z + 1.5), P(x + 0.2, y + 1.4, z + 1.5)];
  quad(c, water, mix('#2c3a48', INK, o.dim * 0.5), tn.line);
  const ripple = o.motion ? Math.sin(o.t / 15) * 0.2 : 0;
  seg(c, P(x + 0.8 + ripple, y + 0.7, z + 1.51), P(x + 2.2 + ripple, y + 0.7, z + 1.51), withAlpha(BONE, 0.4), 1);
};

const daybed: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(CLOTH, o.dim);
  legs4(c, P, x, y, z, 3.4, 1.4, 0.3, tone(WOOD, o.dim));
  box(c, P, x, y, z + 0.3, 3.4, 1.4, 0.5, tn);
  box(c, P, x, y, z + 0.8, 0.5, 1.4, 1, tn);
};

const belfry: Drawer = (c, P, x, y, z, o) => {
  cot(c, P, x, y, z, o);
  const post = tone(DARK_WOOD, o.dim);
  box(c, P, x - 0.2, y + 1.3, z, 0.25, 0.25, 4.6, post);
  box(c, P, x + 3.2, y + 1.3, z, 0.25, 0.25, 4.6, post);
  box(c, P, x - 0.2, y + 1.3, z + 4.4, 3.65, 0.25, 0.25, post);
  const sway = o.motion ? Math.sin(o.t / 30) * 0.12 : 0;
  const top = P(x + 1.6, y + 1.4, z + 4.4);
  const bell = tone(BRONZE, o.dim);
  c.save();
  c.translate(top.x, top.y);
  c.rotate(sway);
  const k = P.k;
  c.beginPath();
  c.moveTo(-0.35 * k, 0.15 * k);
  c.quadraticCurveTo(-0.5 * k, 1.1 * k, -0.95 * k, 1.5 * k);
  c.lineTo(0.95 * k, 1.5 * k);
  c.quadraticCurveTo(0.5 * k, 1.1 * k, 0.35 * k, 0.15 * k);
  c.closePath();
  c.fillStyle = bell.front;
  c.fill();
  c.strokeStyle = bell.line;
  c.lineWidth = 0.8;
  c.stroke();
  c.restore();
};

const hearthrug: Drawer = (c, P, x, y, z, o) => {
  const tn = tone('#5a4c55', o.dim);
  quad(c, [P(x, y, z + 0.02), P(x + 3, y, z + 0.02), P(x + 3, y + 2, z + 0.02), P(x, y + 2, z + 0.02)], tn.front, tn.line);
  quad(c, [P(x + 0.35, y + 0.3, z + 0.03), P(x + 2.65, y + 0.3, z + 0.03), P(x + 2.65, y + 1.7, z + 0.03), P(x + 0.35, y + 1.7, z + 0.03)], null, withAlpha(BONE, 0.3), 0.8);
  for (let i = 0; i < 8; i++) seg(c, P(x + 0.2 + i * 0.37, y, z), P(x + 0.2 + i * 0.37, y - 0.25, z), tn.line, 0.6);
};

const kennel: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(WOOD, o.dim);
  box(c, P, x, y, z, 2.2, 2, 1.4, tn);
  quad(c, [P(x - 0.15, y, z + 1.4), P(x + 1.1, y, z + 2.3), P(x + 2.35, y, z + 1.4)], tn.front, tn.line);
  quad(c, [P(x + 1.1, y, z + 2.3), P(x + 2.35, y, z + 1.4), P(x + 2.35, y + 2, z + 1.4), P(x + 1.1, y + 2, z + 2.3)], tn.top, tn.line);
  quad(c, [P(x + 0.7, y, z), P(x + 1.5, y, z), P(x + 1.5, y, z + 0.9), P(x + 1.1, y, z + 1.15), P(x + 0.7, y, z + 0.9)], INK);
};

const settle: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(DARK_WOOD, o.dim);
  box(c, P, x, y + 0.9, z, 3.2, 0.3, 3.2, tn);
  box(c, P, x, y, z, 3.2, 1.2, 0.9, tn);
  box(c, P, x, y, z, 0.25, 1.2, 1.7, tn);
  box(c, P, x + 2.95, y, z, 0.25, 1.2, 1.7, tn);
};

const artefact: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(GILT, o.dim);
  const name = o.name ?? '';
  if (name.includes('jar')) {
    box(c, P, x + 0.15, y + 0.15, z, 0.5, 0.5, 0.8, tn);
    const h = P(x + 0.4, y + 0.4, z + 0.95);
    c.beginPath();
    c.ellipse(h.x, h.y, 0.3 * P.k, 0.26 * P.k, 0, 0, Math.PI * 2);
    c.fillStyle = tn.top;
    c.fill();
  } else if (name.includes('mask')) {
    box(c, P, x + 0.2, y + 0.5, z, 0.5, 0.15, 0.9, tn);
    const e = P(x + 0.45, y + 0.5, z + 0.6);
    c.fillStyle = INK;
    c.fillRect(e.x - 2, e.y, 1.4, 1);
    c.fillRect(e.x + 1, e.y, 1.4, 1);
  } else if (name.includes('cat')) {
    box(c, P, x + 0.2, y + 0.2, z, 0.5, 0.4, 0.6, tone('#2f2e36', o.dim));
    box(c, P, x + 0.3, y + 0.25, z + 0.6, 0.3, 0.3, 0.35, tone('#2f2e36', o.dim));
  } else if (name.includes('figure')) {
    box(c, P, x + 0.3, y + 0.3, z, 0.25, 0.2, 0.75, tn);
  } else {
    const s = P(x + 0.4, y + 0.4, z + 0.12);
    c.beginPath();
    c.ellipse(s.x, s.y, 0.4 * P.k, 0.25 * P.k, 0, 0, Math.PI * 2);
    c.fillStyle = tn.front;
    c.fill();
    c.strokeStyle = tn.line;
    c.stroke();
  }
};

/* ---------- fixtures: defences and the rod ---------- */

const organ: Drawer = (c, P, x, y, z, o) => {
  const pipe = tone('#77705e', o.dim);
  for (let i = 0; i < 9; i++) {
    const h = 3.4 + (4 - Math.abs(i - 4)) * 0.55;
    box(c, P, x + i * 0.44, y + 0.9, z + 1, 0.32, 0.3, h, pipe);
  }
  box(c, P, x + 0.4, y, z, 3.2, 1, 1.3, tone(DARK_WOOD, o.dim));
  quad(c, [P(x + 0.5, y + 0.05, z + 1.31), P(x + 3.5, y + 0.05, z + 1.31), P(x + 3.5, y + 0.4, z + 1.31), P(x + 0.5, y + 0.4, z + 1.31)], mix(BONE, INK, o.dim * 0.5));
};

const decoyCoffins: Drawer = (c, P, x, y, z, o) => {
  coffin(c, P, x, y, z, { ...o, dim: Math.min(1, o.dim + 0.15) });
  coffin(c, P, x + 0.2, y + 0.05, z + 0.9, o);
};

const drawbridge: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(DARK_WOOD, o.dim);
  box(c, P, x + 2.4, y, z, 0.6, 0.6, 4.2, tone(STONE, o.dim));
  box(c, P, x + 2.4, y + 3, z, 0.6, 0.6, 4.2, tone(STONE, o.dim));
  if (o.active) {
    box(c, P, x + 2.1, y + 0.5, z, 0.3, 2.6, 3.8, tn);
    seg(c, P(x + 2.1, y + 0.6, z + 3.7), P(x + 2.6, y + 0.4, z + 4.2), PORCELAIN, 0.8);
    seg(c, P(x + 2.1, y + 3, z + 3.7), P(x + 2.6, y + 3.3, z + 4.2), PORCELAIN, 0.8);
  } else {
    box(c, P, x, y + 0.5, z - 0.1, 2.4, 2.6, 0.25, tn);
  }
};

const fogMachine: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(METAL, o.dim);
  box(c, P, x, y, z, 2, 1.6, 1.6, tn);
  box(c, P, x + 0.6, y + 0.5, z + 1.6, 0.5, 0.5, 1, tn);
  const vent = P(x + 0.85, y + 0.75, z + 2.7);
  const puff = o.motion ? (o.t % 80) / 80 : 0.5;
  c.fillStyle = withAlpha(BONE, 0.25 * (1 - puff));
  c.beginPath();
  c.ellipse(vent.x + puff * 10, vent.y - puff * 14, 3 + puff * 8, 2 + puff * 5, 0, 0, Math.PI * 2);
  c.fill();
};

const lightningRod: Drawer = (c, P, x, y, z, o) => {
  const tn = tone(METAL, o.dim);
  box(c, P, x - 0.2, y - 0.2, z, 0.6, 0.6, 0.5, tn);
  seg(c, P(x + 0.1, y + 0.1, z + 0.5), P(x + 0.1, y + 0.1, z + 9.5), mix(PORCELAIN, INK, o.dim * 0.5), 1.6);
  seg(c, P(x - 0.6, y + 0.1, z + 7.8), P(x + 0.8, y + 0.1, z + 7.8), mix(PORCELAIN, INK, o.dim * 0.5), 1);
  const tip = P(x + 0.1, y + 0.1, z + 9.7);
  c.fillStyle = mix(LAMP, BONE, 0.4);
  c.beginPath();
  c.arc(tip.x, tip.y, 2.2, 0, Math.PI * 2);
  c.fill();
};

export const FURNITURE: Record<string, ItemSpec> = {
  coffin: { w: 3.4, d: 1.5, h: 0.9, top: 0.9, draw: coffin },
  sarcophagus: { w: 3.6, d: 1.8, h: 1.3, top: 1.3, draw: sarcophagus },
  table: { w: 3, d: 2, h: 2.6, draw: table },
  stove: { w: 2.2, d: 1.6, h: 6.8, draw: stove },
  armchair: { w: 2.4, d: 2, h: 2.6, draw: armchair },
  piano: { w: 3.2, d: 1.5, h: 2.9, draw: piano },
  bench: { w: 3.4, d: 1.6, h: 2.4, draw: bench },
  slab: { w: 3.6, d: 1.8, h: 1.4, top: 1.4, draw: slab },
  slab2: { w: 3.6, d: 1.8, h: 1.4, top: 1.4, draw: slab },
  cot: { w: 3.2, d: 1.4, h: 1.2, top: 0.9, draw: cot },
  tub: { w: 3.4, d: 1.6, h: 1.6, top: 1.5, draw: tub },
  daybed: { w: 3.4, d: 1.4, h: 1.8, top: 0.8, draw: daybed },
  belfry: { w: 3.4, d: 1.6, h: 6, top: 0.9, draw: belfry },
  hearthrug: { w: 3, d: 2, h: 0.1, top: 0.05, draw: hearthrug },
  kennel: { w: 2.4, d: 2, h: 2.3, top: 1.4, draw: kennel },
  settle: { w: 3.2, d: 1.2, h: 3.2, top: 0.9, draw: settle },
  artefact: { w: 0.8, d: 0.8, h: 1, draw: artefact },
};

export const FIXTURES: Record<string, ItemSpec> = {
  organ: { w: 4.2, d: 1.2, h: 6.6, draw: organ },
  decoyCoffins: { w: 3.6, d: 1.6, h: 1.8, draw: decoyCoffins },
  drawbridge: { w: 3, d: 3.6, h: 4.2, draw: drawbridge },
  fogMachine: { w: 2, d: 1.6, h: 2.7, draw: fogMachine },
  lightningRod: { w: 1, d: 1, h: 9.7, draw: lightningRod },
};

/** The furniture spec for a house item, falling back to the artefact shape. */
export function furnitureSpec(id: string, artefactFlag = false): ItemSpec | undefined {
  if (artefactFlag) return FURNITURE['artefact'];
  return FURNITURE[id];
}

export function itemSpec(id: string): ItemSpec | undefined {
  return FURNITURE[id] ?? FIXTURES[id];
}

/** Draw a catalogue item centred in a `size` square, for the build list. */
export function drawItemIcon(c: Ctx, id: string, size: number, opts: { night?: boolean; active?: boolean } = {}): boolean {
  const spec = itemSpec(id);
  if (!spec) return false;
  const extentX = spec.w + spec.d * RECEDE_X;
  const extentY = spec.h + spec.d * 0.26;
  const k = (size * 0.8) / Math.max(extentX, extentY, 2.4);
  const ox = (size - extentX * k) / 2;
  const oy = size - (size - extentY * k) / 2;
  const P = makeProjector(ox, oy, k, 0);
  spec.draw(c, P, 0, 0, 0, { t: 0, night: opts.night ?? false, dim: 0, motion: false, active: opts.active ?? true, name: id });
  return true;
}
