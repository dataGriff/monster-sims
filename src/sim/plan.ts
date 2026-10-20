import { ACTION_KINDS, type ActionKind, type MonsterId, type NightPlan, type Plan } from './types.ts';

const SLUG = /^[a-z][a-z0-9-]*$/;

/** A sensible 7-night rotation used by `pnpm play` when no plan is given. */
export const DEFAULT_PLAN: Plan = {
  nights: [
    { night: { count: 'feed', wolfman: 'coverJob', golem: 'sleep' } },
    { night: { count: 'socialise', wolfman: 'sleep', golem: 'repair' }, day: { wolfman: 'coverJob' } },
    { night: { count: 'coverJob', wolfman: 'feed', golem: 'socialise' } },
    { night: { count: 'gameNight', wolfman: 'gameNight', golem: 'gameNight' } },
    { night: { count: 'feed', wolfman: 'coverJob', golem: 'sleep' }, day: { wolfman: 'coverJob' } },
    { night: { count: 'coverJob', wolfman: 'repair', golem: 'feed' } },
    { night: { count: 'lieLow', wolfman: 'lieLow', golem: 'lieLow' } },
  ],
};

/** The dusk schedule for night `n` (1-based). Past the end, the last entry repeats. */
export function planForNight(plan: Plan, n: number): NightPlan {
  const entry = plan.nights[n - 1] ?? plan.nights[plan.nights.length - 1];
  return entry ?? { night: {} };
}

function isActionKind(v: unknown): v is ActionKind {
  return typeof v === 'string' && (ACTION_KINDS as readonly string[]).includes(v);
}

function parseAssignments(raw: unknown, where: string): Partial<Record<MonsterId, ActionKind>> {
  if (raw === undefined) return {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${where} must be an object mapping monster ids to actions`);
  }
  const out: Partial<Record<MonsterId, ActionKind>> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!SLUG.test(key)) {
      throw new Error(`${where}: "${key}" is not a monster id (lowercase slug such as count, wolfman, golem)`);
    }
    if (!isActionKind(value)) {
      throw new Error(`${where}.${key}: unknown action "${String(value)}" (expected ${ACTION_KINDS.join(', ')})`);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Validate plan JSON. Accepts either `{ "nights": [...] }` or a bare array of
 * nights, where each night is `{ "night": {...}, "day": {...} }` or, as a
 * shorthand, a bare assignments object.
 */
export function parsePlan(raw: unknown): Plan {
  const nights = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && raw !== null && Array.isArray((raw as { nights?: unknown }).nights)
      ? ((raw as { nights: unknown[] }).nights)
      : undefined;
  if (!nights) throw new Error('plan must be { "nights": [...] } or an array of nights');

  return {
    nights: nights.map((entry, i): NightPlan => {
      const where = `nights[${i}]`;
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        throw new Error(`${where} must be an object`);
      }
      const rec = entry as Record<string, unknown>;
      if ('night' in rec || 'day' in rec) {
        const night = parseAssignments(rec['night'], `${where}.night`);
        const day = parseAssignments(rec['day'], `${where}.day`);
        return Object.keys(day).length > 0 ? { night, day } : { night };
      }
      return { night: parseAssignments(rec, where) };
    }),
  };
}
