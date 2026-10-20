/**
 * Basic build mode (MM-21). Purchases are listed on the dusk plan and bought in
 * order while the coin lasts. Coin comes from cover-job shifts.
 */
import { emit, type Ctx } from './context.ts';
import type { DefenceId, Furniture, House, RoomId } from './types.ts';
import { t } from './i18n.ts';

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
  { id: 'slab', name: t('build.slab.1'), cost: 10, kind: 'furniture', room: 'workshop', blurb: "The Golem's bed." },
  { id: 'cot', name: 'camp cot', cost: 5, kind: 'furniture', room: 'attic', blurb: "The Wolf Man's bed." },
  { id: 'sarcophagus', name: 'sarcophagus', cost: 15, kind: 'furniture', room: 'crypt', blurb: t('build.sarcophagus.1') },
  { id: 'tub', name: t('build.tub.1'), cost: 15, kind: 'furniture', room: 'kitchen', blurb: t('build.tub.2') },
  { id: 'armchair', name: 'armchair', cost: 8, kind: 'furniture', room: 'parlour', blurb: t('build.armchair.1') },
  { id: 'piano', name: 'piano', cost: 20, kind: 'furniture', room: 'parlour', blurb: t('build.piano.1') },
  { id: 'table', name: t('build.table.1'), cost: 6, kind: 'furniture', room: 'kitchen', blurb: t('build.table.2') },
  { id: 'stove', name: 'stove', cost: 12, kind: 'furniture', room: 'kitchen', blurb: t('build.stove.1') },
  { id: 'bench', name: 'workbench', cost: 8, kind: 'furniture', room: 'workshop', blurb: t('build.bench.1') },
  { id: 'lightningRod', name: t('build.lightningRod.1'), cost: 20, kind: 'lightningRod', blurb: t('build.lightningRod.2') },
  { id: 'drawbridge', name: 'drawbridge', cost: 30, kind: 'defence', defence: 'drawbridge', blurb: t('build.drawbridge.1') },
  { id: 'fogMachine', name: t('build.fogMachine.1'), cost: 25, kind: 'defence', defence: 'fogMachine', blurb: t('build.fogMachine.2') },
  { id: 'decoyCoffins', name: t('build.decoyCoffins.1'), cost: 15, kind: 'defence', defence: 'decoyCoffins', blurb: t('build.decoyCoffins.2') },
  { id: 'organ', name: t('build.organ.1'), cost: 20, kind: 'defence', defence: 'organ', blurb: t('build.organ.2') },
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
  if (!item) return { ok: false, text: t('build.organ.3', { id }) };
  if (house.coin < item.cost) {
    return { ok: false, text: t('build.organ.4', { item: item.name, cost: item.cost, coin: house.coin }) };
  }
  switch (item.kind) {
    case 'furniture': {
      const existing = furnitureById(house, item.id);
      if (existing && !existing.broken) return { ok: false, text: t('build.furniture.1', { item: item.name, room: item.room }) };
      if (existing) existing.broken = false;
      else house.furniture.push({ id: item.id, name: item.name, room: item.room ?? 'parlour', broken: false });
      house.coin -= item.cost;
      return { ok: true, text: t('build.furniture.2', { item: item.name, room: item.room, cost: item.cost }) };
    }
    case 'lightningRod':
      if (house.lightningRod) return { ok: false, text: t('build.lightningRod.3') };
      house.lightningRod = true;
      house.coin -= item.cost;
      return { ok: true, text: t('build.lightningRod.4', { cost: item.cost }) };
    case 'defence': {
      const d = item.defence!;
      if (house.defences[d]) return { ok: false, text: t('build.defence.1', { item: item.name }) };
      house.defences[d] = true;
      house.coin -= item.cost;
      return { ok: true, text: t('build.defence.2', { item: item.name, cost: item.cost }) };
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
