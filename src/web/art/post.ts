/**
 * Post-processing: vignette, film grain and title cards. Grain and vignette
 * are a single player setting (docs/art-direction.md); with reduced motion
 * the grain holds still.
 */
import { BONE, INK, hash01, withAlpha } from './palette.ts';

type Ctx = CanvasRenderingContext2D;

export function drawVignette(c: Ctx, w: number, h: number, strength: number): void {
  const g = c.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, withAlpha(INK, 0));
  g.addColorStop(1, withAlpha(INK, strength));
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

/** Fill a canvas with monochrome noise. Called once by the browser client; the result is tiled. */
export function paintNoise(c: Ctx, size: number, seed: number): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = hash01(seed, y * size + x);
      const g = Math.round(v * 255);
      c.fillStyle = `rgba(${g},${g},${g},${(0.5 + v * 0.5).toFixed(2)})`;
      c.fillRect(x, y, 1, 1);
    }
  }
}

export function drawGrain(c: Ctx, w: number, h: number, noise: CanvasImageSource, size: number, t: number, motion: boolean, strength: number): void {
  c.save();
  c.globalAlpha = strength;
  c.globalCompositeOperation = 'overlay';
  const ox = motion ? Math.floor(hash01(Math.floor(t / 2), 7) * size) : 0;
  const oy = motion ? Math.floor(hash01(Math.floor(t / 2), 8) * size) : 0;
  for (let y = -oy; y < h; y += size) for (let x = -ox; x < w; x += size) c.drawImage(noise, x, y);
  c.restore();
}

export interface Card {
  /** Use a newline to stack the title on several lines. */
  title: string;
  subtitle?: string;
  /** 0..1 */
  alpha: number;
  /** Where the card sits, in stage pixels. Defaults to a full-width band across the middle. */
  region?: { x: number; y: number; w: number };
}

export const TITLE_FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';

/**
 * Expressionist lettering: each glyph leans and sits a little off the line,
 * as if cut from card. Deterministic per string.
 */
export function drawCard(c: Ctx, w: number, h: number, card: Card): void {
  if (card.alpha <= 0) return;
  const region = card.region ?? { x: 0, y: h * 0.42, w };
  const lines = card.title.toUpperCase().split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(72, (region.w * 0.82) / Math.max(6, longest * 0.62));
  const lineH = size * 1.02;
  const blockH = lineH * lines.length;
  const bandH = blockH + (card.subtitle ? size * 0.9 : size * 0.5) + 24;
  const cy = region.y;
  const top = cy - blockH / 2;
  c.save();
  c.globalAlpha = card.alpha;
  c.fillStyle = withAlpha(INK, 0.72);
  c.beginPath();
  c.moveTo(region.x, cy - bandH / 2 + 10);
  c.lineTo(region.x + region.w, cy - bandH / 2 - 8);
  c.lineTo(region.x + region.w, cy + bandH / 2 - 6);
  c.lineTo(region.x, cy + bandH / 2 + 8);
  c.closePath();
  c.fill();
  c.font = `700 ${size}px ${TITLE_FONT}`;
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  const seed = [...card.title].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) | 0;
  let widest = 0;
  lines.forEach((text, li) => {
    const letters = [...text];
    const widths = letters.map((ch) => c.measureText(ch).width + size * 0.06);
    const total = widths.reduce((a, b) => a + b, 0);
    widest = Math.max(widest, total);
    let x = region.x + (region.w - total) / 2;
    const base = top + lineH * (li + 0.82);
    letters.forEach((ch, i) => {
      const rot = (hash01(seed, li * 100 + i) - 0.5) * 0.16;
      const dy = (hash01(seed, li * 100 + i + 50) - 0.5) * size * 0.14;
      c.save();
      c.translate(x + widths[i]! / 2, base + dy);
      c.transform(1, 0, -0.16, 1, 0, 0);
      c.rotate(rot);
      c.fillStyle = INK;
      c.fillText(ch, -widths[i]! / 2 + 3, 3);
      c.fillStyle = BONE;
      c.fillText(ch, -widths[i]! / 2, 0);
      c.restore();
      x += widths[i]!;
    });
  });
  const left = region.x + (region.w - widest) / 2 - 30;
  const right = region.x + (region.w + widest) / 2 + 30;
  c.strokeStyle = withAlpha(BONE, 0.7);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(left, top - size * 0.12);
  c.lineTo(right, top - size * 0.2);
  c.moveTo(left, top + blockH + size * 0.1);
  c.lineTo(right, top + blockH + size * 0.04);
  c.stroke();
  if (card.subtitle) {
    c.font = `italic ${Math.round(Math.max(13, size * 0.3))}px ${TITLE_FONT}`;
    c.fillStyle = withAlpha(BONE, 0.85);
    c.textAlign = 'center';
    c.fillText(card.subtitle, region.x + region.w / 2, top + blockH + size * 0.5);
  }
  c.restore();
}
