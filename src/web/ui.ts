/** DOM for the planning screen (MM-23), HUD (MM-24) and accessibility settings (MM-34). */
import { CATALOGUE } from '../sim/build.ts';
import { getQuirk } from '../sim/quirks.ts';
import { pendingStory, type Story } from '../sim/stories.ts';
import { ACTION_KINDS, type ActionKind, type Event, type GameState, type NightPlan } from '../sim/types.ts';
import { hudModel, riskHints, type Hud } from './viewmodel.ts';

export interface Draft {
  night: Record<string, ActionKind | null>;
  day: Record<string, ActionKind | null>;
  build: string[];
  choices: Record<string, string>;
}

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

/** What story would fire if this draft were confirmed: a clone at dusk with the assignments applied. */
export function previewStory(state: GameState, d: Draft): Story | undefined {
  const clone = structuredClone(state);
  clone.night += 1;
  for (const m of clone.monsters) m.assignedAction = d.night[m.id] ?? null;
  return pendingStory(clone);
}

export const ACTION_LABELS: Record<ActionKind, string> = {
  feed: 'Feed',
  sleep: 'Sleep',
  socialise: 'Socialise',
  coverJob: 'Cover job',
  repair: 'Repair',
  lieLow: 'Lie low',
  gameNight: 'Game night',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...children: Array<Node | string>): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) e.append(c);
  return e;
}

export interface Layout {
  header: HTMLElement;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  caption: HTMLElement;
  hud: HTMLElement;
  plan: HTMLElement;
  ticker: HTMLElement;
  bestiary: HTMLElement;
}

export function buildLayout(root: HTMLElement): Layout {
  root.replaceChildren();
  const header = el('header');
  const stage = el('section', { class: 'stage', 'aria-label': 'The manor' });
  const canvas = el('canvas', { width: '960', height: '540', role: 'img', 'aria-label': 'Isometric view of the manor' });
  const caption = el('div', { class: 'caption', 'aria-live': 'polite' });
  stage.append(canvas, caption);
  const hud = el('aside', { 'aria-label': 'Household status' });
  const plan = el('section', { class: 'plan', 'aria-label': 'Dusk plan' });
  const ticker = el('section', { class: 'ticker', 'aria-label': 'Night log', 'aria-live': 'polite' });
  const bestiary = el('details', { class: 'bestiary' });
  root.append(header, stage, hud, plan, ticker, bestiary);
  return { header, stage, canvas, caption, hud, plan, ticker, bestiary };
}

/**
 * Bestiary (MM-25, text half): one page per resident met so far, built from
 * the quirk descriptions so it doubles as the tutorial. Illustrations wait on
 * art direction.
 */
export function renderBestiary(target: HTMLElement, state: GameState, met: Set<string>): void {
  for (const m of state.monsters) met.add(m.id);
  const open = target.hasAttribute('open');
  target.replaceChildren();
  if (open) target.setAttribute('open', '');
  target.append(el('summary', { text: `Bestiary (${met.size} met)` }));
  for (const m of state.monsters) {
    const entry = el('div', { class: 'entry' });
    entry.append(el('h3', { text: `${m.name} — ${m.coverJob.title} by cover` }));
    const list = el('ul');
    for (const q of m.quirks) list.append(el('li', { text: getQuirk(q).description }));
    entry.append(list);
    target.append(entry);
  }
}

function gauge(label: string, value: number, max: number, ticks: number[] = [], tone: 'good' | 'warn' | 'bad' = 'good'): HTMLElement {
  const wrap = el('div', { class: 'gauge' });
  wrap.append(el('label', {}, el('span', { text: label }), el('span', { text: String(value) })));
  const bar = el('div', { class: 'bar', role: 'meter', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(value) });
  const fill = el('div', { class: `fill ${tone}` });
  fill.style.width = `${(value / max) * 100}%`;
  bar.append(fill);
  for (const t of ticks) {
    const tick = el('div', { class: 'tick', title: String(t) });
    tick.style.left = `${(t / max) * 100}%`;
    bar.append(tick);
  }
  wrap.append(bar);
  return wrap;
}

export function renderHud(target: HTMLElement, state: GameState): Hud {
  const hud = hudModel(state);
  target.replaceChildren();
  target.append(el('h2', { text: `Night ${hud.night} of ${hud.nightsToSurvive}` }));
  target.append(el('p', { class: 'settings', text: `Moon: ${hud.moon} (full in ${hud.nextFullMoonIn}). Coin ${hud.coin}. Lightning rod ${hud.lightningRod ? 'up' : 'down'}.` }));
  const susTone = hud.suspicion >= 90 ? 'bad' : hud.suspicion >= 70 ? 'warn' : 'good';
  target.append(gauge(`Suspicion (${hud.mood})`, hud.suspicion, 100, [40, 70, 90], susTone));
  const angerTone = hud.householdAnger >= 80 ? 'bad' : hud.householdAnger >= 60 ? 'warn' : 'good';
  target.append(gauge('Household anger', hud.householdAnger, 100, [25, 60, 80], angerTone));
  if (hud.hunterPresent) target.append(el('p', { class: 'settings', text: 'A monster hunter is in the village.' }));
  if (hud.allies.length > 0) target.append(el('p', { class: 'settings', text: `Allies: ${hud.allies.join(', ')}` }));
  for (const m of hud.monsters) {
    const card = el('div', { class: 'card' });
    const sw = el('span', { class: 'swatch', 'aria-hidden': 'true' });
    sw.style.background = m.accent;
    card.append(el('h3', {}, sw, m.name, el('span', { class: 'job', text: m.job })));
    const needs = el('div', { class: 'needs' });
    for (const n of m.needs) {
      const item = el('div', { class: n.critical ? 'critical' : '' });
      item.append(el('span', { text: `${n.key} ${n.value}` }));
      const p = el('progress', { max: '100', value: String(n.value), 'aria-label': `${m.name} ${n.key}` });
      item.append(p);
      needs.append(item);
    }
    card.append(needs);
    target.append(card);
  }
  return hud;
}

export interface PlanCallbacks {
  onChange: () => void;
  onRun: () => void;
  onNewRun: (seed: number) => void;
}

export function renderPlan(target: HTMLElement, state: GameState, draft: Draft, cb: PlanCallbacks): void {
  target.replaceChildren();
  const left = el('div');
  const right = el('div');
  const ended = state.status !== 'running';
  left.append(el('h2', { text: ended ? (state.status === 'won' ? 'The household survived.' : 'The manor has fallen.') : `Plan for night ${state.night + 1}` }));
  if (!ended) {
    for (const m of state.monsters) {
      const row = el('div', { class: 'assign' });
      row.append(el('label', { for: `night-${m.id}`, text: m.name }));
      const select = el('select', { id: `night-${m.id}`, 'aria-label': `${m.name} tonight` });
      select.append(el('option', { value: '', text: 'Idle' }));
      for (const k of ACTION_KINDS) select.append(el('option', { value: k, text: ACTION_LABELS[k] }));
      select.value = draft.night[m.id] ?? '';
      select.addEventListener('change', () => {
        draft.night[m.id] = (select.value || null) as ActionKind | null;
        cb.onChange();
      });
      row.append(select);
      if (m.daylightActive) {
        const daySel = el('select', { id: `day-${m.id}`, 'aria-label': `${m.name} by day` });
        daySel.append(el('option', { value: '', text: 'Sleep by day' }));
        for (const k of ['coverJob', 'socialise', 'repair'] as const) daySel.append(el('option', { value: k, text: `Day: ${ACTION_LABELS[k]}` }));
        daySel.value = draft.day[m.id] ?? '';
        daySel.addEventListener('change', () => {
          draft.day[m.id] = (daySel.value || null) as ActionKind | null;
          cb.onChange();
        });
        row.append(daySel);
      } else row.append(el('span', { class: 'settings', text: 'sleeps by day' }));
      const hints = riskHints(state, m, draft.night[m.id] ?? null);
      row.append(el('div', { class: 'hints', text: hints.join(' ') }));
      left.append(row);
    }
    const story = previewStory(state, draft);
    if (story) {
      const box = el('div', { class: 'story' });
      box.append(el('strong', { text: `Tonight: ${story.title}` }));
      for (const c of story.choices) {
        const id = `choice-${story.id}-${c.id}`;
        const radio = el('input', { type: 'radio', name: `choice-${story.id}`, id, value: c.id });
        radio.checked = (draft.choices[story.id] ?? story.choices[0]!.id) === c.id;
        radio.addEventListener('change', () => {
          draft.choices[story.id] = c.id;
          cb.onChange();
        });
        box.append(el('div', {}, radio, el('label', { for: id, text: ` ${c.label}` })));
      }
      left.append(box);
    }
  }
  const controls = el('div', { class: 'row' });
  const run = el('button', { class: 'primary', type: 'button', text: ended ? 'Run over' : 'Run the night (R)' });
  run.disabled = ended;
  run.addEventListener('click', cb.onRun);
  controls.append(run);
  const seedInput = el('input', { type: 'number', value: String(state.options.seed), 'aria-label': 'Seed for a new run' });
  const newRun = el('button', { type: 'button', text: 'New run with seed' });
  newRun.addEventListener('click', () => cb.onNewRun(Number(seedInput.value) || 1));
  controls.append(seedInput, newRun);
  left.append(controls);

  right.append(el('h2', { text: `Build (${state.house.coin} coin)` }));
  for (const item of CATALOGUE) {
    const id = `buy-${item.id}`;
    const box = el('input', { type: 'checkbox', id });
    box.checked = draft.build.includes(item.id);
    box.disabled = ended;
    box.addEventListener('change', () => {
      draft.build = box.checked ? [...draft.build, item.id] : draft.build.filter((x) => x !== item.id);
      cb.onChange();
    });
    const owned = item.kind === 'defence' ? state.house.defences[item.defence!] : item.kind === 'lightningRod' ? state.house.lightningRod : state.house.furniture.some((f) => f.id === item.id && !f.broken);
    const label = el('label', { for: id, title: item.blurb, text: ` ${item.name} (${item.cost})${owned ? ' ✓' : ''}` });
    if (item.cost > state.house.coin) label.style.color = 'var(--muted)';
    right.append(el('div', {}, box, label));
  }
  target.append(left, right);
}

export function renderTicker(target: HTMLElement, events: readonly Event[], reveal: number): void {
  target.replaceChildren();
  let phase = '';
  events.slice(0, reveal).forEach((e) => {
    if (e.phase !== phase) {
      phase = e.phase;
      target.append(el('p', { class: 'phase', text: `${phase} · night ${e.night}` }));
    }
    target.append(el('p', { class: `kind-${e.kind}`, text: e.text }));
  });
  target.scrollTop = target.scrollHeight;
}

/* ---------- accessibility settings (MM-34) ---------- */

export interface Keys {
  run: string;
  skip: string;
  focusPlan: string;
}

const DEFAULT_KEYS: Keys = { run: 'r', skip: ' ', focusPlan: 'p' };

export function loadSettings(): { scale: number; keys: Keys } {
  try {
    const raw = localStorage.getItem('monster-manor.settings');
    if (raw) {
      const parsed = JSON.parse(raw) as { scale?: number; keys?: Partial<Keys> };
      return { scale: parsed.scale ?? 1, keys: { ...DEFAULT_KEYS, ...parsed.keys } };
    }
  } catch {
    /* storage unavailable: fall through to defaults */
  }
  return { scale: 1, keys: { ...DEFAULT_KEYS } };
}

export function saveSettings(s: { scale: number; keys: Keys }): void {
  try {
    localStorage.setItem('monster-manor.settings', JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function renderSettings(target: HTMLElement, settings: { scale: number; keys: Keys }, onChange: () => void): void {
  const box = el('div', { class: 'settings row' });
  const smaller = el('button', { type: 'button', text: 'A−', 'aria-label': 'Smaller text' });
  const larger = el('button', { type: 'button', text: 'A+', 'aria-label': 'Larger text' });
  smaller.addEventListener('click', () => {
    settings.scale = Math.max(0.8, settings.scale - 0.1);
    onChange();
  });
  larger.addEventListener('click', () => {
    settings.scale = Math.min(1.8, settings.scale + 0.1);
    onChange();
  });
  box.append('Text size ', smaller, larger);
  for (const [name, label] of [['run', 'run night'], ['skip', 'skip animation'], ['focusPlan', 'focus plan']] as const) {
    const kbd = el('kbd', { text: settings.keys[name] === ' ' ? 'space' : settings.keys[name] });
    const btn = el('button', { type: 'button', text: `remap ${label}`, 'aria-label': `Remap key for ${label}, currently ${kbd.textContent}` });
    btn.addEventListener('click', () => {
      btn.textContent = 'press a key…';
      const handler = (ev: KeyboardEvent) => {
        ev.preventDefault();
        settings.keys[name] = ev.key.toLowerCase();
        window.removeEventListener('keydown', handler, true);
        onChange();
      };
      window.addEventListener('keydown', handler, true);
    });
    box.append(' · ', `${label}: `, kbd, ' ', btn);
  }
  target.append(box);
}
