import type { House, Room, RoomId } from './types.ts';

export const ROOMS: readonly Room[] = [
  { id: 'crypt', name: 'the crypt' },
  { id: 'kitchen', name: 'the kitchen' },
  { id: 'parlour', name: 'the parlour' },
  { id: 'workshop', name: 'the workshop' },
  { id: 'roof', name: 'the roof' },
];

export function createHouse(): House {
  return {
    rooms: ROOMS.map((r) => ({ id: r.id, name: r.name })),
    furniture: [
      { id: 'coffin', name: 'coffin', room: 'crypt', broken: false },
      { id: 'table', name: 'kitchen table', room: 'kitchen', broken: false },
      { id: 'stove', name: 'stove', room: 'kitchen', broken: false },
      { id: 'armchair', name: 'armchair', room: 'parlour', broken: false },
      { id: 'piano', name: 'piano', room: 'parlour', broken: false },
      { id: 'bench', name: 'workbench', room: 'workshop', broken: false },
      { id: 'slab', name: 'stone slab', room: 'workshop', broken: false },
    ],
    lightningRod: true,
    householdAnger: 10,
  };
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
