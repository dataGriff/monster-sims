/**
 * Resident silhouettes. Every figure is drawn procedurally with its feet at
 * (0, 0) and up as negative y, about 46 px tall at scale 1. Shapes are
 * angular on purpose (jagged hems, leaning bodies) and deliberately generic:
 * docs/ip-audit.md lists the silhouettes we must not draw, and none of these
 * use them.
 *
 * Three paint styles share the same geometry:
 *  - stage: accent-tinted body with an accent rim, for the manor view;
 *  - plate: sepia ink and wash, for the bestiary's field-guide plates;
 *  - shadow: a flat silhouette, for plates not yet unlocked.
 */
import { BONE, INK, SEPIA, SEPIA_WASH, mix, withAlpha } from './palette.ts';

export type Pose = 'idle' | 'walk' | 'act' | 'asleep';
export type FigureStyle = 'stage' | 'plate' | 'shadow';

export interface FigureOptions {
  pose: Pose;
  t: number;
  accent: string;
  style?: FigureStyle;
  /** False freezes every animated offset (prefers-reduced-motion). */
  motion?: boolean;
  facing?: 1 | -1;
}

interface Paint {
  body: string;
  dark: string;
  rim: string;
  skin: string;
  detail: string;
  eye: string;
  lw: number;
  style: FigureStyle;
}

interface Rig {
  t: number;
  /** -1..1 leg swing while walking. */
  swing: number;
  /** 0..1 arm lift while acting. */
  lift: number;
  pose: Pose;
}

type Ctx = CanvasRenderingContext2D;
type Drawer = (c: Ctx, p: Paint, r: Rig) => void;

function paintFor(style: FigureStyle, accent: string): Paint {
  switch (style) {
    case 'stage':
      return { body: mix(accent, INK, 0.62), dark: mix(accent, INK, 0.8), rim: accent, skin: BONE, detail: accent, eye: INK, lw: 1.2, style };
    case 'plate':
      return { body: SEPIA_WASH, dark: '#4a3c2c', rim: SEPIA, skin: '#e3d7b8', detail: mix(accent, SEPIA, 0.45), eye: SEPIA, lw: 1.1, style };
    case 'shadow':
      return { body: '#1c1b22', dark: '#1c1b22', rim: '#2c2b35', skin: '#1c1b22', detail: '#2c2b35', eye: '#1c1b22', lw: 1, style };
  }
}

/* ---------- primitives ---------- */

function shape(c: Ctx, pts: readonly number[], fill: string | null, stroke?: string, lw = 1): void {
  c.beginPath();
  c.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i]!, pts[i + 1]!);
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lw;
    c.lineJoin = 'miter';
    c.stroke();
  }
}

function oval(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string | null, stroke?: string, lw = 1): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
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

function limb(c: Ctx, x1: number, y1: number, x2: number, y2: number, w: number, colour: string): void {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.strokeStyle = colour;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.stroke();
  c.lineCap = 'butt';
}

function line(c: Ctx, pts: readonly number[], colour: string, lw: number): void {
  c.beginPath();
  c.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i]!, pts[i + 1]!);
  c.strokeStyle = colour;
  c.lineWidth = lw;
  c.stroke();
}

function eyes(c: Ctx, x1: number, y1: number, x2: number, y2: number, r: number, colour: string): void {
  oval(c, x1, y1, r, r, colour);
  oval(c, x2, y2, r, r, colour);
}

/** A ragged ellipse: fur, weed, rough clay. Deterministic. */
function jagged(cx: number, cy: number, rx: number, ry: number, n: number, amp: number, phase = 0): number[] {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = i % 2 === 0 ? 1 : 1 - amp / Math.max(rx, ry);
    const wob = 1 + 0.06 * Math.sin(i * 2.3 + phase);
    pts.push(cx + Math.cos(a) * rx * k * wob, cy + Math.sin(a) * ry * k * wob);
  }
  return pts;
}

function legs(c: Ctx, p: Paint, r: Rig, hipY: number, spread: number, w: number): void {
  const s = r.swing * 3.2;
  limb(c, -spread, hipY, -spread - s, -0.5, w, p.dark);
  limb(c, spread, hipY, spread + s, -0.5, w, p.dark);
}

/* ---------- residents ---------- */

const drawCount: Drawer = (c, p, r) => {
  legs(c, p, r, -14, 3, 3.2);
  shape(c, [-7, -38, 7, -38, 11, -24, 14, -3, 9, -6, 5, -1, 0, -5, -5, -1, -10, -5, -14, -2, -11, -24], p.body, p.rim, p.lw);
  shape(c, [-2.2, -37.5, 2.2, -37.5, 0, -27], p.skin);
  if (r.lift > 0) {
    shape(c, [6, -36, 17, -44 - r.lift * 4, 15, -31, 19, -18, 11, -22], p.dark, p.rim, p.lw);
    limb(c, 6, -35, 16, -43 - r.lift * 4, 2.4, p.body);
  } else {
    limb(c, 6, -35, 8, -22, 2.4, p.body);
  }
  oval(c, 0, -43.5, 4.3, 5.4, p.skin, p.rim, p.lw * 0.6);
  shape(c, [-4.4, -45, -3.6, -48.3, 0, -49.6, 3.8, -48.2, 4.4, -45, 2, -46.6, -2, -46.6], p.dark);
  eyes(c, -1.6, -43.8, 1.6, -43.8, 0.7, p.style === 'stage' ? p.detail : p.eye);
};

const drawWolfMan: Drawer = (c, p, r) => {
  legs(c, p, r, -13, 3.5, 3.6);
  shape(c, [-6, -20, -13, -25, -17, -23, -11, -19, -7, -16], p.dark, p.rim, p.lw);
  shape(c, jagged(1, -24, 9, 11.5, 18, 1.5), p.body, p.rim, p.lw);
  if (r.lift > 0) {
    limb(c, 6, -31, 13, -42 - r.lift * 3, 3, p.body);
    line(c, [12, -44 - r.lift * 3, 14, -47 - r.lift * 3, 15, -44 - r.lift * 3, 17, -46 - r.lift * 3], p.skin, 0.9);
  } else {
    limb(c, 6, -30, 11, -18 + r.swing * 2, 3, p.body);
  }
  shape(c, jagged(7, -37, 5.2, 4.6, 14, 0.9, 1), p.body, p.rim, p.lw);
  shape(c, [10, -38.5, 16.5, -37, 16, -34.8, 10.5, -34.2], p.body, p.rim, p.lw);
  oval(c, 16.1, -36.2, 0.8, 0.8, p.eye === INK ? BONE : p.eye);
  shape(c, [3.5, -40, 4.6, -46.5, 7, -41], p.dark, p.rim, p.lw);
  shape(c, [7, -41.5, 9.5, -46, 10, -40.3], p.dark, p.rim, p.lw);
  oval(c, 9, -38.6, 0.9, 0.9, p.detail);
};

const drawGolem: Drawer = (c, p, r) => {
  legs(c, p, r, -12, 5, 6);
  shape(c, [-11, -35, 11, -35, 13.5, -27, 12, -11, -12, -11, -13.5, -27], p.body, p.rim, p.lw);
  line(c, [-6, -30, -3, -28], p.dark, 1);
  line(c, [4, -24, 7, -21], p.dark, 1);
  line(c, [-8, -18, -5, -19], p.dark, 1);
  limb(c, -12, -32, -15, -15 + r.swing * 2, 5.5, p.body);
  oval(c, -15, -14 + r.swing * 2, 3.2, 3.2, p.body, p.rim, p.lw);
  if (r.lift > 0) {
    limb(c, 12, -32, 17, -44 - r.lift * 3, 5.5, p.body);
    oval(c, 17.4, -45 - r.lift * 3, 3.2, 3.2, p.body, p.rim, p.lw);
  } else {
    limb(c, 12, -32, 15, -15 - r.swing * 2, 5.5, p.body);
    oval(c, 15, -14 - r.swing * 2, 3.2, 3.2, p.body, p.rim, p.lw);
  }
  oval(c, 0, -40.5, 5.6, 5.2, p.body, p.rim, p.lw);
  line(c, [-3.4, -40.6, -1.2, -40.2], p.eye === INK ? BONE : p.skin, 1);
  line(c, [1.2, -40.2, 3.4, -40.6], p.eye === INK ? BONE : p.skin, 1);
  for (const x of [-1.8, 0, 1.8]) line(c, [x, -44.6, x, -43], p.detail, 0.9);
};

const drawMummy: Drawer = (c, p, r) => {
  legs(c, p, r, -14, 3, 3.4);
  shape(c, [-6.5, -36, 6.5, -36, 7.5, -14, -7.5, -14], p.body, p.rim, p.lw);
  const reach = r.pose === 'walk' || r.lift > 0;
  if (reach) {
    limb(c, 5, -32, 15, -31 + r.swing, 3, p.body);
    limb(c, -4, -32, 12, -28 - r.swing, 3, p.body);
  } else {
    limb(c, 6, -33, 8, -18, 3, p.body);
    limb(c, -6, -33, -8, -18, 3, p.body);
  }
  oval(c, 0, -41, 4.6, 5.2, p.body, p.rim, p.lw);
  const wrap = withAlpha(p.style === 'plate' ? p.rim : p.skin, p.style === 'shadow' ? 0 : 0.45);
  for (let y = -45; y < -14; y += 2.6) {
    const half = y < -36 ? 4.2 : 7;
    line(c, [-half, y + 0.6, half, y - 0.6], wrap, 0.8);
  }
  shape(c, [-4.4, -42.6, 4.4, -42.9, 4.4, -40.8, -4.4, -40.5], p.dark);
  eyes(c, -1.6, -41.7, 1.6, -41.8, 0.6, p.detail);
  const sway = Math.sin(r.t / 20) * 1.5;
  shape(c, [5, -22, 6.5, -22, 12 + sway, -10, 10.5 + sway, -9.5], wrap === 'rgba(0,0,0,0.000)' ? p.body : p.body, p.rim, 0.6);
};

const drawInvisible: Drawer = (c, p, r) => {
  c.setLineDash([2, 2]);
  shape(c, [-6, -36, 6, -36, 8, -6, -8, -6], null, withAlpha(p.style === 'stage' ? p.rim : p.rim, 0.35), p.lw);
  c.setLineDash([]);
  oval(c, -3 - r.swing * 3, -1, 2.6, 1.2, p.dark);
  oval(c, 3 + r.swing * 3, -1, 2.6, 1.2, p.dark);
  oval(c, -9, -22 - r.swing, 1.9, 2.4, p.skin, p.rim, 0.6);
  if (r.lift > 0) oval(c, 12, -36 - r.lift * 4, 1.9, 2.4, p.skin, p.rim, 0.6);
  else oval(c, 9, -22 + r.swing, 1.9, 2.4, p.skin, p.rim, 0.6);
  shape(c, [-5, -37, 5, -37, 5, -34.5, -5, -34.5], p.detail);
  shape(c, [2, -35, 5, -35, 6.5, -24 + Math.sin(r.t / 18), 3.5, -25], p.detail);
  oval(c, 0, -41.5, 4.4, 5, p.skin, p.rim, p.lw * 0.6);
  line(c, [-4.2, -39.2, 4.2, -40], withAlpha(p.rim, 0.4), 0.6);
  oval(c, -1.9, -42, 1.8, 1.8, INK, p.rim, 0.8);
  oval(c, 1.9, -42, 1.8, 1.8, INK, p.rim, 0.8);
  oval(c, -2.3, -42.5, 0.5, 0.5, p.skin);
  oval(c, 0, -46.2, 7.2, 1.6, p.dark, p.rim, p.lw * 0.7);
  shape(c, [-4.2, -46.5, 4.2, -46.5, 3.8, -53, -3.8, -53], p.dark, p.rim, p.lw * 0.7);
};

const drawLakeling: Drawer = (c, p, r) => {
  limb(c, -4, -8, -7.5, -3, 3.4, p.dark);
  limb(c, -7.5, -3, -4 - r.swing * 2, 0, 3.2, p.dark);
  limb(c, 4, -8, 7.5, -3, 3.4, p.dark);
  limb(c, 7.5, -3, 4 + r.swing * 2, 0, 3.2, p.dark);
  oval(c, 0, -18, 10, 11.5, p.body, p.rim, p.lw);
  oval(c, 2, -17, 5, 7, withAlpha(p.skin, p.style === 'shadow' ? 0 : 0.16));
  oval(c, 0, -30, 8, 6, p.body, p.rim, p.lw);
  c.beginPath();
  c.moveTo(-5, -28.5);
  c.quadraticCurveTo(0, -25.5, 5, -28.5);
  c.strokeStyle = p.dark;
  c.lineWidth = 1;
  c.stroke();
  oval(c, -4, -35.5, 2.4, 2.4, p.skin, p.rim, 0.6);
  oval(c, 4, -35.5, 2.4, 2.4, p.skin, p.rim, 0.6);
  oval(c, -3.6, -35.4, 0.9, 1.2, INK);
  oval(c, 4.4, -35.4, 0.9, 1.2, INK);
  const weed = withAlpha(p.style === 'plate' ? p.rim : p.skin, p.style === 'shadow' ? 0 : 0.55);
  for (let i = 0; i < 6; i++) {
    const x = -6 + i * 2.4;
    const end = -22 + (i % 2) * 4;
    c.beginPath();
    c.moveTo(x, -34.5);
    c.quadraticCurveTo(x - 2 + Math.sin(r.t / 25 + i), (end - 34.5) / 2 - 17, x + Math.sin(i), end);
    c.strokeStyle = weed;
    c.lineWidth = 0.9;
    c.stroke();
  }
  const handY = r.lift > 0 ? -34 - r.lift * 3 : -14;
  limb(c, 8, -22, 12, handY, 2.6, p.body);
  shape(c, [12, handY, 15, handY - 2, 15.5, handY + 1, 13, handY + 2.5], p.body, p.rim, 0.6);
};

const drawPhantom: Drawer = (c, p, r) => {
  legs(c, p, r, -14, 3, 3);
  shape(c, [-6.5, -38, 6.5, -38, 9, -20, 12, -3, 2, -1, -9, -2, -10, -20], p.body, p.rim, p.lw);
  shape(c, [6.5, -38, 12, -3, 8, -6, 7, -24], p.detail);
  if (r.lift > 0) {
    limb(c, 6, -35, 15, -46 - r.lift * 2, 2.4, p.body);
    line(c, [15, -46 - r.lift * 2, 19, -52 - r.lift * 3], p.skin, 0.8);
  } else {
    limb(c, 6, -34, 9, -20, 2.4, p.body);
  }
  oval(c, 0, -43.5, 4.2, 5.2, p.dark);
  oval(c, 0.4, -43, 3.6, 4.6, p.skin, p.rim, 0.6);
  shape(c, [-2.4, -44.2, -0.6, -44.4, -0.8, -43.2, -2.2, -43.3], p.dark);
  shape(c, [1.4, -44.4, 3.2, -44.2, 3, -43.3, 1.6, -43.2], p.dark);
  shape(c, [-6.5, -47.2, 6.5, -47.6, 5, -46.4, -5, -46.2], p.dark, p.rim, 0.6);
  shape(c, [-3.6, -47.4, 3.8, -47.6, 3.2, -51.5, -3.2, -51.2], p.dark, p.rim, 0.6);
};

const drawBride: Drawer = (c, p, r) => {
  shape(c, [-2, -46, 2, -46, 9, -20, 5, -12, -5, -12, -9, -20], withAlpha(p.skin, p.style === 'shadow' ? 0 : 0.28));
  const gown = p.style === 'stage' ? mix(BONE, p.body, 0.35) : p.style === 'plate' ? '#c9b994' : p.body;
  shape(c, [-4.5, -36, 4.5, -36, 6, -26, 11, -1, 6, -3, 0, -1, -6, -3, -11, -1, -6, -26], gown, p.rim, p.lw);
  if (r.lift > 0) {
    limb(c, 4, -34, 10, -44 - r.lift * 2, 1.8, gown);
    limb(c, -4, -34, -10, -44 - r.lift * 2, 1.8, gown);
  } else {
    limb(c, 4, -34, 1, -26, 1.8, gown);
    limb(c, -4, -34, -1, -26, 1.8, gown);
    oval(c, 0, -26, 2, 1.6, p.skin);
  }
  oval(c, -3.6, -44.5, 2.4, 2.4, p.dark);
  oval(c, 0, -42, 4, 5, p.skin, p.rim, 0.6);
  shape(c, [-4, -43.5, -3, -46.4, 0, -47.4, 3.2, -46.2, 4, -43.5, 1, -45.5, -2, -45.2], p.dark);
  eyes(c, -1.4, -42.2, 1.4, -42.2, 0.6, p.eye === INK ? p.detail : p.eye);
  if (r.lift > 0) oval(c, 0, -39.3, 1, 1.4, p.dark);
};

const drawHunchback: Drawer = (c, p, r) => {
  limb(c, -3, -11, -5 - r.swing * 2, -0.5, 3.2, p.dark);
  limb(c, 3, -11, 5 + r.swing * 2, -0.5, 3.2, p.dark);
  oval(c, -4.5, -29, 6, 5.2, p.body, p.rim, p.lw);
  shape(c, [-9, -24, -7, -30, 0, -31, 6, -27, 8, -19, 7, -11, -7, -11, -10, -16], p.body, p.rim, p.lw);
  if (r.lift > 0) {
    limb(c, 5, -24, 9, -38 - r.lift * 2, 2.8, p.body);
    line(c, [9, -38 - r.lift * 2, 9.4, -80], withAlpha(p.style === 'plate' ? p.rim : p.skin, 0.8), 1.2);
  } else {
    limb(c, 4, -23, 9, -14 + r.swing, 2.8, p.body);
  }
  oval(c, 7, -27, 4, 4.2, p.skin, p.rim, 0.6);
  shape(c, [4, -29, 5, -31.6, 8, -31.8, 10.6, -29.6, 8, -30.2], p.dark);
  oval(c, 8.6, -27.4, 0.7, 0.7, p.eye === INK ? p.detail : p.eye);
};

interface HoundSpec {
  len: number;
  h: number;
  body: string;
  ear: string;
  glow: boolean;
}

function hound(c: Ctx, p: Paint, r: Rig, s: HoundSpec): void {
  const L = s.len;
  const H = s.h;
  const legTop = -H * 0.45;
  const sw = r.swing * 3;
  for (const [x, phase] of [[-L * 0.36, 1], [-L * 0.24, -1], [L * 0.24, -1], [L * 0.36, 1]] as const) {
    limb(c, x, legTop, x + sw * phase, -0.5, 2.6, mix(s.body, INK, 0.3));
  }
  shape(c, [-L * 0.47, -H * 0.62, -L * 0.62, -H * 0.82, -L * 0.66, -H * 0.76, -L * 0.52, -H * 0.56], s.body, p.rim, p.lw);
  shape(c, jagged(0, -H * 0.6, L * 0.46, H * 0.2, 16, 0.8, 2), s.body, p.rim, p.lw);
  oval(c, L * 0.3, -H * 0.66, L * 0.18, H * 0.2, s.body);
  const hx = L * 0.48;
  const hy = -H * 0.86 - (r.lift > 0 ? r.lift * 2 : 0);
  oval(c, hx, hy, 4.6, 3.6, s.body, p.rim, p.lw);
  shape(c, [hx + 3, hy - 1.6, hx + 8.5, hy + 0.2, hx + 8, hy + 2, hx + 3, hy + 2.6], s.body, p.rim, p.lw);
  shape(c, [hx - 2.6, hy - 2.2, hx - 1.8, hy - 7, hx + 0.6, hy - 2.8], s.ear, p.rim, 0.6);
  shape(c, [hx - 0.4, hy - 2.6, hx + 1.2, hy - 6.6, hx + 2.4, hy - 2.4], s.ear, p.rim, 0.6);
  if (s.glow && p.style === 'stage') {
    c.save();
    c.shadowColor = p.detail;
    c.shadowBlur = 6;
    oval(c, hx + 1.6, hy - 0.6, 1.1, 1.1, p.detail);
    c.restore();
  } else {
    oval(c, hx + 1.6, hy - 0.6, 0.8, 0.8, p.style === 'plate' ? p.rim : p.detail);
  }
}

const drawGwyllgi: Drawer = (c, p, r) => {
  hound(c, p, r, { len: 32, h: 30, body: p.style === 'stage' ? mix(INK, p.body, 0.25) : p.body, ear: p.dark, glow: true });
};

const drawCwnAnnwn: Drawer = (c, p, r) => {
  const white = p.style === 'stage' ? mix(BONE, p.body, 0.15) : p.style === 'plate' ? '#d9ccaa' : p.body;
  const red = p.style === 'stage' ? '#a3332f' : p.style === 'plate' ? '#8a4b38' : p.body;
  c.save();
  c.translate(-7, -4);
  c.scale(0.82, 0.82);
  c.globalAlpha *= 0.85;
  hound(c, p, { ...r, swing: -r.swing }, { len: 30, h: 26, body: white, ear: red, glow: false });
  c.restore();
  hound(c, p, r, { len: 30, h: 26, body: white, ear: red, glow: false });
};

const drawGwrach: Drawer = (c, p, r) => {
  if (r.lift > 0) {
    shape(c, [-2, -34, -22, -50 - r.lift * 3, -18, -40, -24, -36, -15, -31, -19, -24, -4, -26], p.dark, p.rim, p.lw);
    shape(c, [4, -34, 24, -50 - r.lift * 3, 20, -40, 26, -36, 17, -31, 21, -24, 6, -26], p.dark, p.rim, p.lw);
  } else {
    shape(c, [-3, -34, -14, -46, -12, -38, -16, -34, -10, -30, -13, -24, -4, -24], p.dark, p.rim, p.lw);
    line(c, [-3, -33, -12, -40], withAlpha(p.rim, 0.6), 0.6);
    line(c, [-3, -30, -13, -32], withAlpha(p.rim, 0.6), 0.6);
  }
  limb(c, -3, -10, -4 - r.swing * 2, -0.5, 2.4, p.dark);
  limb(c, 2, -10, 3 + r.swing * 2, -0.5, 2.4, p.dark);
  shape(c, [-5, -34, 4, -36, 9, -30, 10, -14, 12, -1, 6, -4, 1, -1, -4, -4, -9, -1, -7, -16], p.body, p.rim, p.lw);
  limb(c, 5, -30, 11, -24, 2, p.body);
  line(c, [11, -24, 13, -23, 12, -21.5], p.skin, 0.8);
  oval(c, 6, -37, 3.8, 4.4, p.skin, p.rim, 0.6);
  shape(c, [9, -38, 12.2, -35.8, 9, -35], p.skin, p.rim, 0.5);
  const hair = withAlpha(p.style === 'plate' ? p.rim : p.skin, p.style === 'shadow' ? 0 : 0.7);
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.moveTo(3 + i * 1.1, -41);
    c.quadraticCurveTo(-1 + i * 0.6 + Math.sin(r.t / 22 + i) * 0.8, -30, -2 + i * 1.2, -18 - (i % 3) * 3);
    c.strokeStyle = hair;
    c.lineWidth = 0.8;
    c.stroke();
  }
  oval(c, 7.6, -37.6, 0.6, 0.6, p.eye === INK ? p.detail : p.eye);
  if (r.lift > 0) {
    oval(c, 8.4, -34.8, 0.9, 1.3, p.dark);
    for (let i = 1; i <= 3; i++) {
      c.beginPath();
      c.arc(9, -35, 3 + i * 2.6, -0.5, 0.5);
      c.strokeStyle = withAlpha(p.detail, 0.8 - i * 0.2);
      c.lineWidth = 0.8;
      c.stroke();
    }
  }
};

const drawFledgling: Drawer = (c, p, r) => {
  c.save();
  c.scale(0.86, 0.86);
  drawCount(c, p, { ...r, lift: 0 });
  c.restore();
};

const drawHooded: Drawer = (c, p, r) => {
  legs(c, p, r, -14, 3, 3);
  shape(c, [-6, -36, 0, -48, 6, -36, 10, -2, -10, -2], p.body, p.rim, p.lw);
  oval(c, 0, -40, 2.6, 3.2, p.dark);
};

interface FigureSpec {
  height: number;
  quadruped?: boolean;
  draw: Drawer;
}

export const FIGURES: Record<string, FigureSpec> = {
  count: { height: 50, draw: drawCount },
  wolfman: { height: 47, draw: drawWolfMan },
  golem: { height: 46, draw: drawGolem },
  mummy: { height: 46, draw: drawMummy },
  invisible: { height: 53, draw: drawInvisible },
  lakeling: { height: 38, draw: drawLakeling },
  phantom: { height: 51, draw: drawPhantom },
  bride: { height: 47, draw: drawBride },
  hunchback: { height: 32, draw: drawHunchback },
  gwyllgi: { height: 32, quadruped: true, draw: drawGwyllgi },
  cwnannwn: { height: 30, quadruped: true, draw: drawCwnAnnwn },
  gwrach: { height: 44, draw: drawGwrach },
  fledgling: { height: 43, draw: drawFledgling },
};

export function hasFigure(archetype: string): boolean {
  return archetype in FIGURES;
}

export function figureHeight(archetype: string): number {
  return FIGURES[archetype]?.height ?? 48;
}

/** Draw one resident at the current origin (feet at 0, 0). */
export function drawFigure(c: Ctx, archetype: string, o: FigureOptions): void {
  const spec = FIGURES[archetype] ?? { height: 48, draw: drawHooded };
  const motion = o.motion !== false;
  const t = motion ? o.t : 0;
  const p = paintFor(o.style ?? 'stage', o.accent);
  const rig: Rig = {
    t,
    pose: o.pose,
    swing: o.pose === 'walk' ? Math.sin(t / 6) : 0,
    lift: o.pose === 'act' ? 0.6 + 0.4 * Math.sin(t / 5) : 0,
  };
  c.save();
  if (o.facing === -1) c.scale(-1, 1);
  if (o.pose === 'asleep') {
    if (spec.quadruped) {
      c.translate(0, 1);
      c.scale(1, 0.62);
    } else {
      c.translate(spec.height * 0.5, -3);
      c.rotate(-Math.PI / 2);
    }
  } else if (o.pose === 'walk') {
    c.translate(0, -Math.abs(Math.sin(t / 6)) * 1.2);
  } else if (o.pose === 'idle') {
    c.translate(0, Math.sin(t / 40) * 0.4);
  }
  spec.draw(c, p, rig);
  c.restore();
  if (o.pose === 'asleep' && (o.style ?? 'stage') === 'stage') {
    const rise = motion ? (t % 90) / 9 : 3;
    c.save();
    c.fillStyle = withAlpha(BONE, motion ? 1 - (t % 90) / 110 : 0.8);
    c.font = 'italic 9px Georgia, serif';
    c.fillText('z', 6, -14 - rise);
    c.font = 'italic 7px Georgia, serif';
    c.fillText('z', 11, -20 - rise);
    c.restore();
  }
}

/* ---------- people of the village ---------- */

/** The hunter: long coat, flat cap, lantern. Never a wide brim or a crossbow (docs/ip-audit.md). */
export function drawHunter(c: Ctx, t: number, motion: boolean, valley: boolean): void {
  const p = paintFor('stage', '#b8b0a0');
  const r: Rig = { t, pose: 'walk', swing: motion ? Math.sin(t / 9) * 0.6 : 0, lift: 0 };
  legs(c, p, r, -14, 2.6, 3);
  shape(c, [-6, -37, 6, -37, 8, -4, 2, -3, -2, -4, -8, -3], p.body, p.rim, p.lw);
  oval(c, 0, -41.5, 3.8, 4.6, p.skin, p.rim, 0.6);
  if (valley) shape(c, [-5, -40, 0, -50, 5, -40, 3, -44, -3, -44], p.dark, p.rim, 0.6);
  else shape(c, [-4.6, -44, 4.8, -44.4, 5.6, -43.2, -4, -42.6], p.dark, p.rim, 0.6);
  limb(c, 5, -34, 11, -25, 2.2, p.body);
  line(c, [11, -25, 11, -22], p.rim, 0.8);
  const flicker = motion ? 0.85 + 0.15 * Math.sin(t / 3.1) : 1;
  const g = c.createRadialGradient(11, -19, 0.5, 11, -19, 26);
  g.addColorStop(0, withAlpha('#f2c46b', 0.55 * flicker));
  g.addColorStop(1, withAlpha('#f2c46b', 0));
  c.fillStyle = g;
  c.fillRect(-15, -45, 52, 52);
  shape(c, [9.4, -22, 12.6, -22, 13.2, -16, 8.8, -16], '#f2c46b', INK, 0.7);
  if (valley) line(c, [-7, -40, -9, 0], p.rim, 1.2);
}

/** One of the mob: a hunched shape with a torch. `i` varies the build. */
export function drawTorchbearer(c: Ctx, i: number, t: number, motion: boolean): void {
  const h = 34 + (i % 3) * 4;
  const lean = (i % 2 === 0 ? 1 : -1) * 1.5;
  shape(c, [-5 + lean, -h * 0.72, 5 + lean, -h * 0.72, 7, 0, -7, 0], '#121116', '#2a2930', 0.8);
  oval(c, lean, -h * 0.8, 3.4, 3.8, '#121116', '#2a2930', 0.8);
  const arm = i % 2 === 0 ? 1 : -1;
  line(c, [4 * arm + lean, -h * 0.65, 8 * arm, -h * 1.02], '#3a3832', 1.6);
  const f = motion ? Math.sin(t / 2.3 + i * 1.7) : 0;
  const tx = 8 * arm;
  const ty = -h * 1.02;
  const g = c.createRadialGradient(tx, ty, 0.5, tx, ty, 22);
  g.addColorStop(0, withAlpha('#f2a13b', 0.5));
  g.addColorStop(1, withAlpha('#f2a13b', 0));
  c.fillStyle = g;
  c.fillRect(tx - 22, ty - 22, 44, 44);
  shape(c, [tx - 2.4, ty, tx + 2.4, ty, tx + 0.6 + f, ty - 7 - f * 1.5, tx - 0.6, ty - 4], '#f6c25a');
  shape(c, [tx - 1.2, ty, tx + 1.2, ty, tx + 0.2 + f * 0.5, ty - 3.8], '#fff1c4');
}
