/**
 * Canvas renderer (MM-22): one manor floor in 2D isometric, drawn purely from
 * a Scene built out of sim state + events. Placeholder shapes stand in for
 * sprites until art direction (MM-31) lands; the silhouettes are deliberately
 * generic (see docs/ip-audit.md).
 */
import type { DefenceId, Furniture, RoomId } from '../sim/types.ts';
import { ROOM_LAYOUT, TILE_H, TILE_W, isoToScreen, type Sprite } from './viewmodel.ts';

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
  daylight: number;
  moon: string;
  rooms: SceneRoom[];
  furniture: Furniture[];
  sprites: Sprite[];
  lightningRod: boolean;
  defences: Record<DefenceId, boolean>;
  mobGathering: boolean;
  hunterPresent: boolean;
}

const ROOM_FILL: Record<RoomId, string> = {
  crypt: '#2a2a33',
  kitchen: '#5a4632',
  parlour: '#4a3350',
  workshop: '#4d4a3a',
  attic: '#3f3a44',
  roof: '#2f3540',
};

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w / 2, y + h / 2);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x - w / 2, y + h / 2);
  ctx.closePath();
}

function cube(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, height: number, colour: string, broken: boolean): void {
  const s = size;
  ctx.fillStyle = colour;
  diamond(ctx, x, y - height, s, s / 2);
  ctx.fill();
  ctx.fillStyle = shade(colour, -25);
  ctx.beginPath();
  ctx.moveTo(x - s / 2, y - height + s / 4);
  ctx.lineTo(x, y - height + s / 2);
  ctx.lineTo(x, y + s / 2);
  ctx.lineTo(x - s / 2, y + s / 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(colour, -45);
  ctx.beginPath();
  ctx.moveTo(x + s / 2, y - height + s / 4);
  ctx.lineTo(x, y - height + s / 2);
  ctx.lineTo(x, y + s / 2);
  ctx.lineTo(x + s / 2, y + s / 4);
  ctx.closePath();
  ctx.fill();
  if (broken) {
    ctx.strokeStyle = '#ff5c5c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - s / 3, y - height);
    ctx.lineTo(x + s / 3, y + s / 3);
    ctx.moveTo(x + s / 3, y - height);
    ctx.lineTo(x - s / 3, y + s / 3);
    ctx.stroke();
  }
}

function shade(hex: string, delta: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + delta));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + delta));
  const b = Math.max(0, Math.min(255, (n & 255) + delta));
  return `rgb(${r},${g},${b})`;
}

function roomCentre(id: RoomId, ox: number, oy: number): { x: number; y: number } {
  const c = ROOM_LAYOUT[id];
  const p = isoToScreen(c.col + c.w / 2, c.row + c.h / 2, ox, oy);
  return { x: p.x, y: p.y };
}

function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, frame: number, slot = 0): void {
  const bob = s.pose === 'idle' ? Math.sin(frame / 12) * 2 : 0;
  const walk = s.pose === 'walk' ? Math.sin(frame / 6) * 4 : 0;
  ctx.save();
  ctx.translate(x + walk, y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (s.pose === 'asleep') {
    ctx.fillStyle = s.accent;
    ctx.fillRect(-22, -10, 44, 14);
    ctx.fillStyle = '#f1e9d2';
    ctx.beginPath();
    ctx.arc(24, -4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText('z', 30 + Math.sin(frame / 20) * 2, -14 - (frame % 40) / 4);
  } else {
    ctx.fillStyle = s.accent;
    ctx.fillRect(-10, -34, 20, 32);
    ctx.fillStyle = '#f1e9d2';
    ctx.beginPath();
    ctx.arc(0, -42, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.initial, 0, -38);
    if (s.pose === 'act') {
      ctx.strokeStyle = s.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10, -28);
      ctx.lineTo(22, -34 + Math.sin(frame / 5) * 8);
      ctx.stroke();
    }
    if (s.pose === 'walk') {
      ctx.strokeStyle = shade(s.accent, -40);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.lineTo(-5 - Math.sin(frame / 6) * 6, 8);
      ctx.moveTo(5, -2);
      ctx.lineTo(5 + Math.sin(frame / 6) * 6, 8);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#fff';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(s.name, 0, 22 + (slot % 2) * 12);
  ctx.restore();
}

export const SCENE_SCALE = 1.6;

export function drawScene(ctx: CanvasRenderingContext2D, width: number, height: number, scene: Scene, frame: number): void {
  const day = scene.daylight;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, day > 0.5 ? '#b9d5e8' : '#0b0f1f');
  sky.addColorStop(1, day > 0.5 ? '#e9e2cf' : '#1a1a2c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  // moon / sun
  ctx.fillStyle = day > 0.5 ? '#ffe9a8' : '#e8e4d0';
  ctx.beginPath();
  ctx.arc(width - 90, 70, scene.moon === 'full' ? 30 : 22, 0, Math.PI * 2);
  ctx.fill();
  if (!(day > 0.5) && scene.moon !== 'full') {
    ctx.fillStyle = '#0b0f1f';
    ctx.beginPath();
    ctx.arc(width - 100, 64, scene.moon === 'new' ? 24 : 16, 0, Math.PI * 2);
    ctx.fill();
  }
  // ground
  ctx.fillStyle = day > 0.5 ? '#6f8a5a' : '#1e2a1e';
  ctx.fillRect(0, height * 0.5, width, height * 0.5);
  // everything from here is drawn in manor space, scaled up around the centre
  ctx.setTransform(SCENE_SCALE, 0, 0, SCENE_SCALE, 0, 0);
  const ox = width / 2 / SCENE_SCALE;
  const oy = height / 2 / SCENE_SCALE - 50;
  // rooms: draw back-to-front by row then col
  const order = scene.rooms.toSorted((a, b) => ROOM_LAYOUT[a.id].row - ROOM_LAYOUT[b.id].row || ROOM_LAYOUT[a.id].col - ROOM_LAYOUT[b.id].col);
  for (const room of order) {
    const c = ROOM_LAYOUT[room.id];
    for (let dc = 0; dc < c.w; dc++) {
      const p = isoToScreen(c.col + dc, c.row, ox, oy);
      ctx.fillStyle = ROOM_FILL[room.id];
      diamond(ctx, p.x, p.y, TILE_W, TILE_H);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.stroke();
    }
    // windows along the front edge
    const centre = roomCentre(room.id, ox, oy);
    for (let w = 0; w < room.windows; w++) {
      ctx.fillStyle = room.lit ? '#ffd66b' : '#2b2f45';
      ctx.fillRect(centre.x - 30 + w * 22, centre.y + 10, 10, 14);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${room.name}${room.secretPassage ? ' ·' : ''}`, centre.x, centre.y - 26);
  }
  // furniture
  const perRoom = new Map<RoomId, number>();
  for (const f of scene.furniture) {
    const n = perRoom.get(f.room) ?? 0;
    perRoom.set(f.room, n + 1);
    const centre = roomCentre(f.room, ox, oy);
    const x = centre.x - 34 + (n % 3) * 24;
    const y = centre.y - 14 + Math.floor(n / 3) * 10;
    cube(ctx, x, y, 18, f.artefact ? 10 : 14, f.artefact ? '#c9a227' : f.broken ? '#6b6b6b' : '#8d6e4d', f.broken);
  }
  // lightning rod and defences
  const roof = roomCentre('roof', ox, oy);
  if (scene.lightningRod) {
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(roof.x, roof.y);
    ctx.lineTo(roof.x, roof.y - 60);
    ctx.stroke();
    ctx.fillStyle = '#ffd66b';
    ctx.beginPath();
    ctx.arc(roof.x, roof.y - 62, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const gate = { x: ox - 230, y: oy + 150 };
  if (scene.defences.drawbridge) {
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(gate.x + 40, gate.y - 60, 14, 70);
  }
  if (scene.defences.fogMachine) {
    ctx.fillStyle = 'rgba(220,220,230,0.25)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(gate.x + 60 + i * 50, gate.y + 10 + Math.sin((frame + i * 20) / 30) * 4, 40, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (scene.defences.decoyCoffins) {
    const crypt = roomCentre('crypt', ox, oy);
    cube(ctx, crypt.x + 36, crypt.y + 10, 14, 8, '#3b3b3b', false);
    cube(ctx, crypt.x + 50, crypt.y + 16, 14, 8, '#3b3b3b', false);
  }
  if (scene.defences.organ) {
    const parlour = roomCentre('parlour', ox, oy);
    ctx.fillStyle = '#b08d57';
    for (let i = 0; i < 5; i++) ctx.fillRect(parlour.x + 20 + i * 6, parlour.y - 40 - (i % 2) * 8, 4, 30 + (i % 2) * 8);
  }
  // sprites
  const seen = new Map<string, number>();
  for (const s of scene.sprites) {
    const key = s.room;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    const base = s.room === 'out' ? gate : roomCentre(s.room, ox, oy);
    drawSprite(ctx, s, base.x + (n - 1) * 30, base.y + 22, frame, n);
  }
  // lane: hunter and mob
  if (scene.hunterPresent) {
    ctx.fillStyle = '#ddd';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('a man with a lantern watches from the lane', gate.x - 60, gate.y + 60);
  }
  if (scene.mobGathering) {
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = `rgba(255,${140 + Math.floor(Math.sin(frame / 4 + i) * 40)},40,0.9)`;
      ctx.beginPath();
      ctx.arc(gate.x - 40 + i * 18, gate.y + 80 + (i % 2) * 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('torches in the square', gate.x - 40, gate.y + 110);
  }
  // lighting pass (screen space for the tint, manor space for the glows)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(8,10,30,${(1 - day) * 0.55})`;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.setTransform(SCENE_SCALE, 0, 0, SCENE_SCALE, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  for (const room of scene.rooms) {
    if (!room.lit) continue;
    const c = roomCentre(room.id, ox, oy);
    const g = ctx.createRadialGradient(c.x, c.y, 5, c.x, c.y, 90);
    g.addColorStop(0, 'rgba(255,214,107,0.35)');
    g.addColorStop(1, 'rgba(255,214,107,0)');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - 90, c.y - 90, 180, 180);
  }
  ctx.restore();
}
