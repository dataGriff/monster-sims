/**
 * Basic build mode (MM-21). Purchases are listed on the dusk plan and bought in
 * order while the coin lasts. Coin comes from cover-job shifts.
 */
import { emit, type Ctx } from './context.ts';
import type { DefenceId, Furniture, House, RoomId } from './types.ts';

export interface BuildItem {
  id: string;
  name: string;
  cost: number;
  /** Furniture goes in a room; a defence flips a flag; the rod is its own thing. */
  kind: 'furniture' | 'defence' | 'lightningRod';
  room?: RoomId;
  defence?: DefenceId;
  blurb: string;
}

export const CATALOGUE: readonly BuildItem[] = [
  { id: 'coffin', name: 'coffin', cost: 10, kind: 'furniture', room: 'crypt', blurb: "The Count's bed." },
  { id: 'slab', name: 'stone slab', cost: 10, kind: 'furniture', room: 'workshop', blurb: "The Golem's bed." },
  { id: 'cot', name: 'camp cot', cost: 5, kind: 'furniture', room: 'attic', blurb: "The Wolf Man's bed." },
  { id: 'sarcophagus', name: 'sarcophagus', cost: 15, kind: 'furniture', room: 'crypt', blurb: 'A bed for anyone wrapped in bandages.' },
  { id: 'tub', name: 'claw-foot tub', cost: 15, kind: 'furniture', room: 'kitchen', blurb: 'Always full. For residents who must stay wet.' },
  { id: 'armchair', name: 'armchair', cost: 8, kind: 'furniture', room: 'parlour', blurb: 'Comfort for the parlour.' },
  { id: 'piano', name: 'piano', cost: 20, kind: 'furniture', room: 'parlour', blurb: 'Fun, until the Golem sits on it.' },
  { id: 'table', name: 'kitchen table', cost: 6, kind: 'furniture', room: 'kitchen', blurb: 'Where everyone eats.' },
  { id: 'stove', name: 'stove', cost: 12, kind: 'furniture', room: 'kitchen', blurb: 'Cooks, when the kitchen is not wrecked.' },
  { id: 'bench', name: 'workbench', cost: 8, kind: 'furniture', room: 'workshop', blurb: 'Repairs go faster in spirit.' },
  { id: 'lightningRod', name: 'lightning rod', cost: 20, kind: 'lightningRod', blurb: 'The Golem\'s only source of energy.' },
  { id: 'drawbridge', name: 'drawbridge', cost: 30, kind: 'defence', defence: 'drawbridge', blurb: 'Raised by day: the mob cannot get in.' },
  { id: 'fogMachine', name: 'fog machine', cost: 25, kind: 'defence', defence: 'fogMachine', blurb: 'Half the time the mob loses its way.' },
  { id: 'decoyCoffins', name: 'decoy coffins', cost: 15, kind: 'defence', defence: 'decoyCoffins', blurb: 'One use. The mob burns them and goes home satisfied.' },
  { id: 'organ', name: 'pipe organ', cost: 20, kind: 'defence', defence: 'organ', blurb: 'A dirge at dawn halves the chance the mob works up the nerve.' },
];

export const JOB_PAY = 6;

export function catalogueItem(id: string): BuildItem | undefined {
  return CATALOGUE.find((i) => i.id === id);
}

function furnitureById(house: House, id: string): Furniture | undefined {
  return house.furniture.find((f) => f.id === id);
}

/** Try to buy one item. Returns a sentence describing what happened. */
export function buy(ctx: Ctx, id: string): { ok: boolean; text: string } {
  const house = ctx.state.house;
  const item = catalogueItem(id);
  if (!item) return { ok: false, text: `Nobody sells a "${id}".` };
  if (house.coin < item.cost) {
    return { ok: false, text: `Could not afford the ${item.name} (${item.cost} coin, had ${house.coin}).` };
  }
  switch (item.kind) {
    case 'furniture': {
      const existing = furnitureById(house, item.id);
      if (existing && !existing.broken) return { ok: false, text: `The ${item.name} is already in the ${item.room} and in one piece.` };
      if (existing) existing.broken = false;
      else house.furniture.push({ id: item.id, name: item.name, room: item.room ?? 'parlour', broken: false });
      house.coin -= item.cost;
      return { ok: true, text: `Bought a ${item.name} for ${item.room} (${item.cost} coin).` };
    }
    case 'lightningRod':
      if (house.lightningRod) return { ok: false, text: 'The lightning rod is already up.' };
      house.lightningRod = true;
      house.coin -= item.cost;
      return { ok: true, text: `Raised a new lightning rod (${item.cost} coin).` };
    case 'defence': {
      const d = item.defence!;
      if (house.defences[d]) return { ok: false, text: `The ${item.name} is already installed.` };
      house.defences[d] = true;
      house.coin -= item.cost;
      return { ok: true, text: `Installed the ${item.name} (${item.cost} coin).` };
    }
  }
}

/** Dusk: work through the plan's shopping list. */
export function applyBuild(ctx: Ctx, ids: readonly string[] | undefined): void {
  if (!ids || ids.length === 0) return;
  for (const id of ids) {
    const result = buy(ctx, id);
    emit(ctx, result.ok ? 'built' : 'buildFailed', result.text, { data: { item: id, coin: ctx.state.house.coin } });
  }
}
