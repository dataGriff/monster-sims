/**
 * The client's DOM shell: layout, persistence and mounting. Everything the
 * player sees is built by the pure views in views.ts from the kit
 * (MM-46); this file only owns the elements they are mounted into.
 */
import type { ActionKind, Archetype, Event, GameState, NightPlan } from '../sim/types.ts';
import { THEME_LABELS, type ThemeName } from './design/tokens.ts';
import { mount } from './kit/h.ts';
import { bestiaryView, diaryView, headerView, hudView, planView, type Draft, type HeaderCallbacks, type Keys, type PlanCallbacks, type Settings } from './views.ts';

export { ACTION_LABELS, previewStory } from './views.ts';
export type { Draft, Keys, PlanCallbacks, Settings } from './views.ts';

export function emptyDraft(state: GameState): Draft {
  const d: Draft = { night: {}, day: {}, build: [], choices: {} };
  for (const m of state.monsters) {
    d.night[m.id] = 'lieLow';
    d.day[m.id] = null;
  }
  return d;
}

export function draftToPlan(d: Draft): NightPlan {
  const plan: NightPlan = { night: {} };
  for (const [id, kind] of Object.entries(d.night)) if (kind) plan.night[id] = kind;
  const day: Record<string, ActionKind> = {};
  for (const [id, kind] of Object.entries(d.day)) if (kind) day[id] = kind;
  if (Object.keys(day).length > 0) plan.day = day;
  if (d.build.length > 0) plan.build = [...d.build];
  if (Object.keys(d.choices).length > 0) plan.choices = { ...d.choices };
  return plan;
}

/* ---------- layout ---------- */

export interface Layout {
  header: HTMLElement;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  caption: HTMLElement;
  tooltip: HTMLElement;
  hud: HTMLElement;
  plan: HTMLElement;
  ticker: HTMLElement;
  bestiary: HTMLElement;
}

function make<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string>): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export function buildLayout(root: HTMLElement): Layout {
  root.replaceChildren();
  const header = make('header', { class: 'masthead' });
  const stage = make('section', { class: 'stage', 'aria-label': 'The manor' });
  const canvas = make('canvas', { width: '960', height: '540', role: 'img', 'aria-label': 'Cutaway view of the manor, its residents and the village beyond' });
  const caption = make('div', { class: 'caption', 'aria-live': 'polite' });
  const tooltip = make('div', { class: 'tooltip', role: 'tooltip', hidden: '' });
  stage.append(canvas, caption, tooltip);
  const hud = make('aside', { class: 'hud', 'aria-label': 'Household status' });
  const plan = make('section', { class: 'plan', 'aria-label': 'Dusk plan' });
  const ticker = make('section', { class: 'diary', 'aria-label': 'Night diary', 'aria-live': 'polite' });
  const bestiary = make('section', { class: 'bestiary', 'aria-label': 'Bestiary' });
  root.append(header, stage, hud, plan, ticker, bestiary);
  return { header, stage, canvas, caption, tooltip, hud, plan, ticker, bestiary };
}

/* ---------- settings ---------- */

const DEFAULT_KEYS: Keys = { run: 'r', skip: ' ', focusPlan: 'p' };

export function loadSettings(prefersReducedMotion = false, defaultThemeName: ThemeName = 'night'): Settings {
  const base: Settings = { scale: 1, keys: { ...DEFAULT_KEYS }, grain: true, motion: !prefersReducedMotion, theme: defaultThemeName };
  try {
    const raw = localStorage.getItem('monster-manor.settings');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return {
        scale: parsed.scale ?? base.scale,
        keys: { ...DEFAULT_KEYS, ...parsed.keys },
        grain: parsed.grain ?? base.grain,
        motion: parsed.motion ?? base.motion,
        theme: parsed.theme && parsed.theme in THEME_LABELS ? parsed.theme : base.theme,
      };
    }
  } catch {
    /* storage unavailable: defaults */
  }
  return base;
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem('monster-manor.settings', JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/* ---------- bestiary unlocks ---------- */

const MET_KEY = 'monster-manor.bestiary';

export function loadMet(): Set<Archetype> {
  try {
    const raw = localStorage.getItem(MET_KEY);
    if (raw) return new Set(JSON.parse(raw) as Archetype[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveMet(met: ReadonlySet<Archetype>): void {
  try {
    localStorage.setItem(MET_KEY, JSON.stringify([...met]));
  } catch {
    /* ignore */
  }
}

/** Unlock a plate for everyone living in the manor now; remembered between runs. */
export function recordMet(state: GameState, met: Set<Archetype>): void {
  let changed = false;
  for (const m of state.monsters) {
    if (m.archetype !== 'fledgling' && !met.has(m.archetype)) {
      met.add(m.archetype);
      changed = true;
    }
  }
  if (changed) saveMet(met);
}

/* ---------- mounting ---------- */

export function renderHeader(target: HTMLElement, meta: string, settings: Settings, cb: HeaderCallbacks): void {
  mount(target, headerView(meta, settings, cb));
}

export function renderHud(target: HTMLElement, state: GameState): void {
  mount(target, hudView(state));
}

export function renderPlan(target: HTMLElement, state: GameState, draft: Draft, cb: PlanCallbacks): void {
  mount(target, planView(state, draft, cb));
}

export function renderTicker(target: HTMLElement, events: readonly Event[], reveal: number, accents: ReadonlyMap<string, string> = new Map()): void {
  mount(target, diaryView(events, reveal, accents));
  target.scrollTop = target.scrollHeight;
}

export function renderBestiary(target: HTMLElement, state: GameState, met: Set<Archetype>): void {
  recordMet(state, met);
  mount(target, bestiaryView(met));
}
