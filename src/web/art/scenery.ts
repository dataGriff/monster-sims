/**
 * Everything behind and around the manor: sky, stars, moon, clouds, hills,
 * the village that watches, lightning and ground fog. Pure canvas drawing;
 * every random-looking detail comes from `hash01(seed, i)` so the scenery is
 * stable for a given run.
 */
import { BONE, INK, LAMP, hash01, mix, ramp, withAlpha } from './palette.ts';

type Ctx = CanvasRenderingContext2D;

export type MoonPhase = 'new' | 'waxing crescent' | 'first quarter' | 'waxing gibbous' | 'nearly full' | 'full' | 'waning';

/** Lit fraction and which side is lit, for drawing the moon on canvas and in the HUD. */
export function moonIllumination(phase: MoonPhase): { fraction: number; waxing: boolean } {
  switch (phase) {
    case 'new':
      return { fraction: 0.04, waxing: true };
    case 'waxing crescent':
      return { fraction: 0.25, waxing: true };
    case 'first quarter':
      return { fraction: 0.5, waxing: true };
    case 'waxing gibbous':
      return { fraction: 0.72, waxing: true };
    case 'nearly full':
      return { fraction: 0.9, waxing: true };
    case 'full':
      return { fraction: 1, waxing: true };
    case 'waning':
      return { fraction: 0.62, waxing: false };
  }
}

/**
 * SVG path data for the lit part of a moon of radius r centred at (r, r).
 * The same geometry the canvas uses, so the HUD icon matches the sky.
 */
export function moonPath(phase: MoonPhase, r: number): string {
  const { fraction, waxing } = moonIllumination(phase);
  const rx = Math.abs(1 - 2 * fraction) * r;
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = fraction > 0.5 ? outerSweep : 1 - outerSweep;
  return `M ${r} 0 A ${r} ${r} 0 0 ${outerSweep} ${r} ${2 * r} A ${rx.toFixed(2)} ${r} 0 0 ${innerSweep} ${r} 0 Z`;
}

const SKY_TOP: ReadonlyArray<readonly [number, string]> = [[0, '#06070b'], [0.12, '#090a11'], [0.35, '#1b1826'], [1, '#b8b4a9']];
const SKY_LOW: ReadonlyArray<readonly [number, string]> = [[0, '#121320'], [0.12, '#1a1b27'], [0.35, '#4b3f4e'], [1, '#e2dccd']];
const HILL_FAR: ReadonlyArray<readonly [number, string]> = [[0, '#11121a'], [0.35, '#2a2532'], [1, '#a9a597']];
const HILL_NEAR: ReadonlyArray<readonly [number, string]> = [[0, '#0b0c11'], [0.35, '#1d1a23'], [1, '#8b877a']];
export const GROUND: ReadonlyArray<readonly [number, string]> = [[0, '#101310'], [0.35, '#1c1d1d'], [1, '#77786b']];
export const SOIL: ReadonlyArray<readonly [number, string]> = [[0, '#141114'], [0.35, '#1d1819'], [1, '#4c4441']];
export const LANE: ReadonlyArray<readonly [number, string]> = [[0, '#25241f'], [0.35, '#3a3730'], [1, '#a39d8a']];

export function drawSky(c: Ctx, w: number, h: number, light: number): void {
  const g = c.createLinearGradient(0, 0, 0, h * 0.62);
  g.addColorStop(0, ramp(SKY_TOP, light));
  g.addColorStop(1, ramp(SKY_LOW, light));
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

export function drawStars(c: Ctx, w: number, h: number, light: number, seed: number, t: number, motion: boolean): void {
  const vis = Math.max(0, Math.min(1, (0.45 - light) * 3));
  if (vis <= 0) return;
  for (let i = 0; i < 110; i++) {
    const x = hash01(seed, i * 3) * w;
    const y = hash01(seed, i * 3 + 1) ** 1.6 * h * 0.55;
    const s = hash01(seed, i * 3 + 2);
    const tw = motion ? 0.65 + 0.35 * Math.sin(t / 37 + i * 1.3) : 0.85;
    c.fillStyle = withAlpha(BONE, vis * tw * (0.25 + s * 0.6));
    const r = s > 0.93 ? 1.4 : 0.7;
    c.fillRect(x, y, r, r);
    if (s > 0.97) {
      c.fillRect(x - 2.5, y + 0.3, 6, 0.5);
      c.fillRect(x + 0.4, y - 2.5, 0.5, 6);
    }
  }
}

export function drawMoon(c: Ctx, x: number, y: number, phase: MoonPhase, light: number): void {
  const full = phase === 'full';
  const r = full ? 30 : 23;
  const day = light > 0.6;
  if (!day) {
    const halo = c.createRadialGradient(x, y, r * 0.8, x, y, r * (full ? 4.2 : 2.8));
    halo.addColorStop(0, withAlpha(BONE, full ? 0.28 : 0.14));
    halo.addColorStop(1, withAlpha(BONE, 0));
    c.fillStyle = halo;
    c.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
  }
  const lit = day ? withAlpha(PAPER_SUN, 0.75) : full ? '#efe6cd' : BONE;
  const shade = day ? withAlpha('#c9c4b6', 0.5) : '#23222b';
  const { fraction, waxing } = moonIllumination(phase);
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = shade;
  c.fill();
  c.beginPath();
  c.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
  c.closePath();
  c.fillStyle = lit;
  c.fill();
  const rx = Math.abs(1 - 2 * fraction) * r;
  c.beginPath();
  c.ellipse(x, y, Math.max(0.01, rx), r, 0, 0, Math.PI * 2);
  c.fillStyle = fraction > 0.5 ? lit : shade;
  c.fill();
  if (!day && fraction > 0.4) {
    c.fillStyle = withAlpha(INK, 0.12);
    for (const [dx, dy, rr] of [[-8, -6, 5], [6, 8, 4], [9, -10, 3], [-3, 12, 3.5]] as const) {
      c.beginPath();
      c.arc(x + dx, y + dy, rr, 0, Math.PI * 2);
      c.fill();
    }
  }
}

const PAPER_SUN = '#f4ecd6';

export function drawClouds(c: Ctx, w: number, light: number, t: number, motion: boolean, seed: number): void {
  const colour = light > 0.6 ? withAlpha('#c6c0b1', 0.85) : withAlpha(mix('#1d1e29', '#3c3442', Math.min(1, light * 2.5)), 0.88);
  for (let i = 0; i < 5; i++) {
    const speed = 0.04 + hash01(seed, 900 + i) * 0.05;
    const span = w + 320;
    const base = hash01(seed, 800 + i) * span;
    const x = ((base + (motion ? t * speed : 0)) % span) - 160;
    const y = 40 + hash01(seed, 700 + i) * 150;
    const len = 120 + hash01(seed, 600 + i) * 160;
    const pts: number[] = [x, y + 10];
    for (let j = 0; j <= 8; j++) {
      const px = x + (len * j) / 8;
      pts.push(px, y - (j % 2 === 0 ? 6 + hash01(seed, i * 20 + j) * 10 : 0));
    }
    pts.push(x + len + 20, y + 6, x + len * 0.6, y + 13, x + 10, y + 14);
    c.beginPath();
    c.moveTo(pts[0]!, pts[1]!);
    for (let k = 2; k < pts.length; k += 2) c.lineTo(pts[k]!, pts[k + 1]!);
    c.closePath();
    c.fillStyle = colour;
    c.fill();
  }
}

function ridge(c: Ctx, w: number, h: number, base: number, amp: number, seed: number, salt: number, colour: string): void {
  c.beginPath();
  c.moveTo(0, h);
  c.lineTo(0, base);
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const x = (w * i) / steps;
    const y = base - hash01(seed, salt + i) * amp - (i % 3 === 0 ? amp * 0.4 : 0);
    c.lineTo(x, y);
  }
  c.lineTo(w, h);
  c.closePath();
  c.fillStyle = colour;
  c.fill();
}

export function drawHills(c: Ctx, w: number, h: number, horizon: number, light: number, seed: number): void {
  ridge(c, w, h, horizon - 18, 46, seed, 300, ramp(HILL_FAR, light));
  ridge(c, w, h, horizon + 6, 26, seed, 400, ramp(HILL_NEAR, light));
}

export interface VillageOptions {
  litWindows: number;
  valley: boolean;
  light: number;
  seed: number;
  t: number;
  motion: boolean;
}

/** The village on the far hill. Lit windows are the village watching; more Suspicion, more lights. */
export function drawVillage(c: Ctx, x0: number, y0: number, o: VillageOptions): void {
  const body = ramp([[0, '#0d0e14'], [0.35, '#1c1922'], [1, '#8f8a7e']], o.light);
  const houses: Array<{ x: number; w: number; h: number; roof: number; slant: number }> = [];
  let x = x0;
  for (let i = 0; i < 10; i++) {
    const w = 18 + hash01(o.seed, 50 + i) * 16;
    const hgt = 14 + hash01(o.seed, 60 + i) * 14;
    houses.push({ x, w, h: hgt, roof: 8 + hash01(o.seed, 70 + i) * 8, slant: (hash01(o.seed, 80 + i) - 0.5) * 8 });
    x += w + 3 + hash01(o.seed, 90 + i) * 6;
  }
  const spireAt = houses[3]!;
  c.fillStyle = body;
  if (o.valley) {
    c.fillRect(spireAt.x - 4, y0 - 44, 30, 44);
    c.beginPath();
    c.moveTo(spireAt.x - 7, y0 - 44);
    c.lineTo(spireAt.x + 11, y0 - 60);
    c.lineTo(spireAt.x + 29, y0 - 44);
    c.closePath();
    c.fill();
  } else {
    c.fillRect(spireAt.x, y0 - 46, 14, 46);
    c.beginPath();
    c.moveTo(spireAt.x - 2, y0 - 46);
    c.lineTo(spireAt.x + 8, y0 - 92);
    c.lineTo(spireAt.x + 16, y0 - 46);
    c.closePath();
    c.fill();
  }
  const windows: Array<[number, number]> = [];
  for (const hs of houses) {
    c.beginPath();
    c.moveTo(hs.x, y0);
    c.lineTo(hs.x, y0 - hs.h);
    c.lineTo(hs.x + hs.w / 2 + hs.slant, y0 - hs.h - hs.roof);
    c.lineTo(hs.x + hs.w, y0 - hs.h + 1);
    c.lineTo(hs.x + hs.w, y0);
    c.closePath();
    c.fill();
    windows.push([hs.x + hs.w * 0.28, y0 - hs.h * 0.55], [hs.x + hs.w * 0.66, y0 - hs.h * 0.6]);
  }
  windows.push([spireAt.x + (o.valley ? 9 : 5), y0 - 30]);
  if (o.light < 0.6) {
    const order = windows.map((wpos, i) => ({ wpos, k: hash01(o.seed, 200 + i) })).toSorted((a, b) => a.k - b.k);
    const n = Math.max(0, Math.min(order.length, o.litWindows));
    for (let i = 0; i < n; i++) {
      const [wx, wy] = order[i]!.wpos;
      const flick = o.motion ? 0.8 + 0.2 * Math.sin(o.t / 23 + i) : 1;
      c.fillStyle = withAlpha(LAMP, 0.9 * flick);
      c.fillRect(wx, wy, 3, 4);
      const g = c.createRadialGradient(wx + 1.5, wy + 2, 0, wx + 1.5, wy + 2, 9);
      g.addColorStop(0, withAlpha(LAMP, 0.25 * flick));
      g.addColorStop(1, withAlpha(LAMP, 0));
      c.fillStyle = g;
      c.fillRect(wx - 9, wy - 9, 21, 22);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const hs = houses[(i * 3 + 1) % houses.length]!;
      const sx = hs.x + hs.w * 0.7;
      const sy = y0 - hs.h - hs.roof * 0.5;
      const drift = o.motion ? (o.t / 4 + i * 30) % 60 : 20;
      c.fillStyle = withAlpha('#f4efe2', 0.35 * (1 - drift / 60));
      c.beginPath();
      c.ellipse(sx + drift * 0.4, sy - drift * 0.6, 3 + drift * 0.12, 2 + drift * 0.08, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
}

/** A jagged bolt from the top of the sky to a point, plus a full-frame flash. */
export function drawLightning(c: Ctx, w: number, h: number, to: { x: number; y: number }, strike: number, strength: number): void {
  c.save();
  c.fillStyle = withAlpha('#e8eaf4', 0.22 * strength);
  c.fillRect(0, 0, w, h);
  const pts: Array<[number, number]> = [[to.x + (hash01(strike, 1) - 0.5) * 160, -10]];
  const steps = 9;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const bx = pts[0]![0] + (to.x - pts[0]![0]) * t + (hash01(strike, i + 5) - 0.5) * 34;
    const by = -10 + (to.y + 10) * t;
    pts.push([bx, by]);
  }
  pts.push([to.x, to.y]);
  for (const [lw, colour] of [[6, withAlpha('#c9d2ff', 0.25 * strength)], [2, withAlpha('#f6f4ff', strength)]] as const) {
    c.beginPath();
    c.moveTo(pts[0]![0], pts[0]![1]);
    for (const [px, py] of pts) c.lineTo(px, py);
    c.strokeStyle = colour;
    c.lineWidth = lw;
    c.lineJoin = 'miter';
    c.stroke();
  }
  c.restore();
}

/** Low banks of fog rolling across the ground band between y0 and y1. */
export function drawFog(c: Ctx, w: number, y0: number, y1: number, t: number, alpha: number, motion: boolean, seed: number, colour = '#cfcbd6'): void {
  if (alpha <= 0) return;
  for (let i = 0; i < 9; i++) {
    const span = w + 400;
    const x = ((hash01(seed, 1000 + i) * span + (motion ? t * (0.15 + 0.1 * hash01(seed, 1100 + i)) : 0)) % span) - 200;
    const y = y0 + (y1 - y0) * hash01(seed, 1200 + i);
    const rx = 90 + hash01(seed, 1300 + i) * 120;
    const g = c.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, withAlpha(colour, alpha * 0.35));
    g.addColorStop(1, withAlpha(colour, 0));
    c.fillStyle = g;
    c.save();
    c.translate(x, y);
    c.scale(1, 0.28);
    c.translate(-x, -y);
    c.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    c.restore();
  }
}
