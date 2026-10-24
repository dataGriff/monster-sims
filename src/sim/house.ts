import type { Archetype, House, Room, RoomId } from './types.ts';

export const ROOMS: readonly Omit<Room, 'lit'>[] = [
  { id: 'crypt', name: 'the crypt', windows: 0, secretPassage: true },
  { id: 'kitchen', name: 'the kitchen', windows: 2, secretPassage: false },
  { id: 'parlour', name: 'the parlour', windows: 3, secretPassage: false },
  { id: 'workshop', name: 'the workshop', windows: 1, secretPassage: false },
  { id: 'attic', name: 'the attic', windows: 1, secretPassage: false },
  { id: 'roof', name: 'the roof', windows: 0, secretPassage: false },
];

export const STARTING_COIN = 20;
export const WINDOW_EXPOSURE = 10;
export const LIGHT_EXPOSURE = 15;
export const BROKEN_EXPOSURE = 5;

export function createHouse(household: readonly Archetype[] = []): House {
  const furniture: House['furniture'] = [
      { id: 'coffin', name: 'coffin', room: 'crypt', broken: false },
      { id: 'table', name: 'kitchen table', room: 'kitchen', broken: false },
      { id: 'stove', name: 'stove', room: 'kitchen', broken: false },
      { id: 'armchair', name: 'armchair', room: 'parlour', broken: false },
      { id: 'piano', name: 'piano', room: 'parlour', broken: false },
      { id: 'bench', name: 'workbench', room: 'workshop', broken: false },
      { id: 'slab', name: 'stone slab', room: 'workshop', broken: false },
      { id: 'cot', name: 'camp cot', room: 'attic', broken: false },
  ];
  if (household.includes('mummy')) furniture.push({ id: 'sarcophagus', name: 'sarcophagus', room: 'crypt', broken: false });
  if (household.includes('lakeling')) furniture.push({ id: 'tub', name: 'claw-foot tub', room: 'kitchen', broken: false });
  if (household.includes('phantom')) furniture.push({ id: 'daybed', name: 'daybed', room: 'parlour', broken: false });
  if (household.includes('bride')) furniture.push({ id: 'slab2', name: 'second slab', room: 'workshop', broken: false });
  if (household.includes('hunchback')) furniture.push({ id: 'belfry', name: 'belfry bunk', room: 'roof', broken: false });
  if (household.includes('gwyllgi')) furniture.push({ id: 'hearthrug', name: 'hearthrug', room: 'kitchen', broken: false });
  if (household.includes('cwnannwn')) furniture.push({ id: 'kennel', name: 'kennel', room: 'roof', broken: false });
  if (household.includes('gwrach')) furniture.push({ id: 'settle', name: 'oak settle', room: 'parlour', broken: false });
  return {
    rooms: ROOMS.map((r) => ({ id: r.id, name: r.name, windows: r.windows, lit: false, secretPassage: r.secretPassage })),
    furniture,
    lightningRod: true,
    householdAnger: 10,
    coin: STARTING_COIN,
    defences: { drawbridge: false, fogMachine: false, decoyCoffins: false, organ: false },
  };
}

export function getRoom(house: House, id: RoomId): Room {
  const room = house.rooms.find((r) => r.id === id);
  if (!room) throw new Error(`No room "${id}"`);
  return room;
}

/**
 * How visible a room is from the village tonight: windows, light behind them,
 * and wreckage that looks wrong from the lane. 0–100.
 */
export function roomExposure(house: House, id: RoomId): number {
  const room = getRoom(house, id);
  const broken = house.furniture.filter((f) => f.room === id && f.broken).length;
  const score = room.windows * WINDOW_EXPOSURE + (room.lit ? LIGHT_EXPOSURE : 0) + broken * BROKEN_EXPOSURE;
  return Math.max(0, Math.min(100, score));
}

/** The room the village is most likely to point at. Ties go to the first room listed. */
export function mostExposedRoom(house: House): Room {
  let best = house.rooms[0];
  if (!best) throw new Error('house has no rooms');
  for (const room of house.rooms) {
    if (roomExposure(house, room.id) > roomExposure(house, best.id)) best = room;
  }
  return best;
}

/** Rooms with a light on behind at least one window. */
export function litWindowedRooms(house: House): Room[] {
  return house.rooms.filter((r) => r.lit && r.windows > 0);
}

export function lightRoom(house: House, id: RoomId): void {
  getRoom(house, id).lit = true;
}

export function dousedLights(house: House): void {
  for (const r of house.rooms) r.lit = false;
}

export function breakFurniture(house: House, id: string): void {
  const f = house.furniture.find((x) => x.id === id);
  if (f) f.broken = true;
}

/** Break everything in a room. Hitting the roof also takes out the lightning rod. */
export function breakRoom(house: House, room: RoomId): string[] {
  const broken: string[] = [];
  for (const f of house.furniture) {
    if (f.room === room && !f.broken) {
      f.broken = true;
      broken.push(f.name);
    }
  }
  if (room === 'roof' && house.lightningRod) {
    house.lightningRod = false;
    broken.push('lightning rod');
  }
  return broken;
}

export function brokenFurniture(house: House) {
  return house.furniture.filter((f) => f.broken);
}

export function roomName(house: House, id: RoomId): string {
  return house.rooms.find((r) => r.id === id)?.name ?? id;
}
