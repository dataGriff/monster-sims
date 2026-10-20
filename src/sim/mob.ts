/**
 * Mob behaviour (MM-19). The crowd goes for the most exposed room. Defences
 * bought in build mode change what happens when it gets there. At 100 the
 * manor either loses a resident or falls.
 */
import { adjustNeed, emit, type Ctx } from './context.ts';
import { breakRoom, getRoom, mostExposedRoom, roomExposure } from './house.ts';
import { chance } from './rng.ts';
import type { Monster } from './types.ts';
import { tuning } from './difficulty.ts';
import { THRESHOLDS } from './village.ts';
import { t } from './i18n.ts';

export const MOB_COMFORT = 15;
export const MOB_ANGER = 10;
export const ORGAN_FACTOR = 0.5;
export const FOG_LOST_CHANCE = 0.5;
export const DECOY_RELIEF = -10;
export const SUSPICION_AFTER_TAKEN = 75;
export const SUSPICION_AFTER_DECOY = 80;

/** Day: if the mob has gathered, it may march. */
export function mobByDay(ctx: Ctx): void {
  const { state } = ctx;
  const house = state.house;
  if (state.village.suspicion < THRESHOLDS.mob) return;
  const base = tuning(state).mobChance;
  const p = house.defences.organ ? base * ORGAN_FACTOR : base;
  if (!chance(state.rng, p)) {
    if (house.defences.organ) emit(ctx, 'organ', t('mob.organ.1'), {});
    return;
  }
  if (house.defences.drawbridge) {
    emit(ctx, 'mobRepelled', t('mob.mobRepelled.1'), {
      data: { defence: 'drawbridge' },
    });
    return;
  }
  if (house.defences.fogMachine && chance(state.rng, FOG_LOST_CHANCE)) {
    emit(ctx, 'mobRepelled', t('mob.mobRepelled.2'), {
      data: { defence: 'fogMachine' },
    });
    return;
  }
  const target = mostExposedRoom(house);
  if (house.defences.decoyCoffins) {
    house.defences.decoyCoffins = false;
    state.pendingSuspicion += DECOY_RELIEF;
    state.village.suspicion = Math.max(0, state.village.suspicion + DECOY_RELIEF);
    emit(ctx, 'mobRepelled', t('mob.mobRepelled.3', { DECOY_RELIEF }), {
      data: { defence: 'decoyCoffins', suspicion: DECOY_RELIEF },
    });
    return;
  }
  const broken = breakRoom(house, target.id);
  const escaped = target.secretPassage;
  if (!escaped) {
    for (const m of state.monsters) {
      adjustNeed(ctx, m, 'comfort', -MOB_COMFORT, 'mob');
      adjustNeed(ctx, m, 'anger', MOB_ANGER, 'mob');
    }
  }
  const damage = broken.length > 0 ? t('mob.text.1', { v: broken.join(t('common.listThe')) }) : '';
  const tail = escaped ? t('mob.text.2') : '';
  emit(ctx, 'mobAttack', t('mob.mobAttack.1', { target: target.name, damage, tail }), {
    data: { room: target.id, broken: broken.length, exposure: roomExposure(house, target.id), escaped },
  });
}

/** Who the mob would drag out: the resident whose lit room shows most from the lane. */
export function mostExposedResident(ctx: Ctx): Monster | undefined {
  const { state } = ctx;
  let best: Monster | undefined;
  let bestScore = -1;
  for (const m of state.monsters) {
    const room = getRoom(state.house, m.bedroom);
    if (!room.lit) continue;
    const score = roomExposure(state.house, room.id);
    if (score > bestScore) {
      best = m;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Suspicion has hit 100. Returns true if the run goes on (someone or something
 * was lost instead of the manor).
 */
export function mobAtTheDoor(ctx: Ctx): boolean {
  const { state } = ctx;
  if (state.house.defences.decoyCoffins) {
    state.house.defences.decoyCoffins = false;
    state.village.suspicion = SUSPICION_AFTER_DECOY;
    emit(ctx, 'mobAtDoor', t('mob.mobAtDoor.1', { SUSPICION_AFTER_DECOY }), {
      data: { outcome: 'decoy', suspicion: SUSPICION_AFTER_DECOY },
    });
    return true;
  }
  const victim = mostExposedResident(ctx);
  if (victim && state.monsters.length > 1) {
    state.monsters = state.monsters.filter((m) => m.id !== victim.id);
    state.taken.push(victim.id);
    state.village.suspicion = SUSPICION_AFTER_TAKEN;
    emit(ctx, 'mobAtDoor', t('mob.mobAtDoor.2', { victim: victim.name, SUSPICION_AFTER_TAKEN }), {
      monsterId: victim.id,
      data: { outcome: 'taken', suspicion: SUSPICION_AFTER_TAKEN },
    });
    return true;
  }
  return false;
}
