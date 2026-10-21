/**
 * The stage: an oblique cutaway of the manor, like a theatre set with the
 * fourth wall removed. World units: x runs left to right, y runs away from
 * the viewer, z runs up. Depth recedes up and to the right, so every floor
 * stays visible above the one below it.
 *
 * The house leans: higher points shift right a little more than lower ones,
 * which bends every vertical into a slight curve.
 */
import type { RoomId } from '../../sim/types.ts';

/** Pixels per world unit at the stage's design size (960 × 540). */
export const K = 11;
/** How far back every room goes. */
export const DEPTH = 8;
/** Screen shift per unit of depth, as a fraction of K. */
export const RECEDE_X = 0.42;
export const RECEDE_Y = 0.26;
/** Lean: x shift per z², as a fraction of K. */
export const LEAN = 0.0032;

export interface Point {
  x: number;
  y: number;
}

export type Projector = ((x: number, y: number, z: number) => Point) & { k: number };

export function makeProjector(ox: number, oy: number, k = K, lean = LEAN): Projector {
  const p = ((x: number, y: number, z: number): Point => ({
    x: ox + (x + y * RECEDE_X + lean * z * Math.abs(z)) * k,
    y: oy - (z + y * RECEDE_Y) * k,
  })) as Projector;
  p.k = k;
  return p;
}

export interface RoomBox {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** -1 cellar, 0 ground, 1 upper, 2 roof. */
  level: number;
}

/** Where each room sits in the house. Rooms on one level share walls and never overlap. */
export const ROOM_BOXES: Record<RoomId, RoomBox> = {
  crypt: { x0: 0, x1: 24, z0: -7, z1: 0, level: -1 },
  kitchen: { x0: 0, x1: 12, z0: 0, z1: 8, level: 0 },
  parlour: { x0: 12, x1: 24, z0: 0, z1: 8, level: 0 },
  workshop: { x0: 0, x1: 12, z0: 8, z1: 16, level: 1 },
  attic: { x0: 12, x1: 24, z0: 8, z1: 16, level: 1 },
  roof: { x0: 0, x1: 24, z0: 16, z1: 23, level: 2 },
};

export const HOUSE_WIDTH = 24;
export const WALL = 0.7;

/**
 * Furniture slots per room, in room-local units (x from the room's left wall,
 * y from the front). Big rooms get more slots; the roof keeps clear of the
 * bell turret and chimney.
 */
export const SLOTS: Record<RoomId, ReadonlyArray<readonly [number, number]>> = {
  crypt: [[1.2, 5], [5.4, 5.4], [9.6, 5], [14.2, 5.2], [18.4, 5], [2, 1.6], [20, 1.6]],
  kitchen: [[0.9, 5.2], [4.7, 5.6], [8.3, 5.2], [1, 1.4], [8.4, 1.4], [5, 3.2]],
  parlour: [[0.9, 5.2], [4.7, 5.6], [8.3, 5.2], [1, 1.4], [8.4, 1.4], [5, 3.2]],
  workshop: [[0.9, 5.2], [4.7, 5.6], [8.3, 5.2], [1, 1.4], [8.4, 1.4], [5, 3.2]],
  attic: [[0.9, 5.2], [4.7, 5.6], [8.3, 5.2], [1, 1.4], [8.4, 1.4], [5, 3.2]],
  roof: [[6.4, 3.4], [10.8, 3.6], [14.6, 3.4], [6.4, 0.8], [12, 0.8]],
};

/** Outdoor marks, in world units. */
export const GATE_X = 26.6;
export const LANE_START = { x: 27.5, y: 1 } as const;
