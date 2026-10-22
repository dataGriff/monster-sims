/**
 * Design tokens for the art direction (docs/art-direction.md).
 *
 * The world is monochrome: ink to bone, with a faint violet cast at night and
 * a paper cast by day. Colour is rationed: each resident owns one accent, and
 * the only warm light in the world is lamplight, because lamplight is what the
 * village sees.
 */

import { PRIMITIVES } from '../design/tokens.ts';

export const INK = PRIMITIVES.ink;
export const SOOT = PRIMITIVES.soot;
export const CHARCOAL = PRIMITIVES.charcoal;
export const SLATE = PRIMITIVES.slate;
export const ASH = PRIMITIVES.ash;
export const PEWTER = PRIMITIVES.pewter;
export const BONE = PRIMITIVES.bone;
export const PAPER = PRIMITIVES.paper;

/** Field-guide plates: sepia ink on paper. */
export const SEPIA = PRIMITIVES.sepia;
export const SEPIA_WASH = PRIMITIVES.sepiaWash;
export const PLATE_PAPER = PRIMITIVES.platePaper;

/** The one warm light. */
export const LAMP = PRIMITIVES.lamp;
/** Interface alarms: Suspicion at the mob, critical needs. */
export const ALARM = PRIMITIVES.alarm;
export const WARN = PRIMITIVES.warn;

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

/** Blend from `a` (t = 0) to `b` (t = 1). */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

function lin(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Deterministic hash to [0, 1) so scenery is stable per seed without touching the sim's RNG. */
export function hash01(seed: number, i: number): number {
  let h = (seed * 374761393 + i * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Interpolate between keyed colours by a 0–1 light value. */
export function ramp(stops: ReadonlyArray<readonly [number, string]>, light: number): string {
  const first = stops[0]!;
  if (light <= first[0]) return first[1];
  for (let i = 1; i < stops.length; i++) {
    const [b, cb] = stops[i]!;
    const [a, ca] = stops[i - 1]!;
    if (light <= b) return mix(ca, cb, (light - a) / (b - a));
  }
  return stops[stops.length - 1]![1];
}

/**
 * Text colour for a label sitting on an accent fill: ink or white, whichever
 * contrasts more. Every resident accent clears 4.5:1 one way or the other.
 */
export function onAccent(accent: string): string {
  return contrast(accent, INK) >= contrast(accent, '#ffffff') ? INK : '#ffffff';
}
