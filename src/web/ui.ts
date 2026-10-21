/**
 * DOM for the planning screen (MM-23), HUD (MM-24), settings (MM-34) and the
 * field-guide bestiary (MM-25). Visual language: docs/art-direction.md.
 */
import { CATALOGUE } from '../sim/build.ts';
import { createArchetype, PLAYABLE } from '../sim/monsters.ts';
import { getQuirk } from '../sim/quirks.ts';
import { pendingStory, type Story } from '../sim/stories.ts';
import { ACTION_KINDS, type ActionKind, type Archetype, type Event, type GameState, type NightPlan } from '../sim/types.ts';
import { THRESHOLDS } from '../sim/village.ts';
import { PLATES, romanNumeral } from './art/bestiary.ts';
import { drawFigure, figureHeight, type FigureStyle } from './art/figures.ts';
import { drawItemIcon } from './art/furniture.ts';
import { BONE, INK, PLATE_PAPER, withAlpha } from './art/palette.ts';
import { moonPath } from './art/scenery.ts';
import { ACCENTS, hudModel, riskHints, type Hud } from './viewmodel.ts';

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

function svg(tag: string, attrs: Record<string, string>): SVGElement {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

/* ---------- small drawings ---------- */

/** A resident's portrait: their stage figure on a roundel, or a sepia plate figure for the bestiary. */
export function portrait(archetype: string, accent: string, size: number, style: FigureStyle = 'stage', label = ''): HTMLCanvasElement {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const canvas = el('canvas', { class: `portrait portrait-${style}`, width: String(size * dpr), height: String(size * dpr), role: 'img', 'aria-label': label });
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const c = canvas.getContext('2d');
  if (!c) return canvas;
  c.scale(dpr, dpr);
  if (style === 'stage') {
    const g = c.createRadialGradient(size / 2, size * 0.45, 2, size / 2, size / 2, size * 0.7);
    g.addColorStop(0, withAlpha(accent, 0.3));
    g.addColorStop(1, withAlpha(INK, 0));
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
  }
  const h = figureHeight(archetype);
  const scale = (size * 0.82) / Math.max(h, 40);
  c.translate(size / 2 - (archetype === 'gwyllgi' || archetype === 'cwnannwn' ? 4 * scale : 0), size * 0.94);
  c.scale(scale, scale);
  drawFigure(c, archetype, { pose: 'idle', t: 0, accent, style, motion: false });
  return canvas;
}

function itemIcon(id: string, size: number): HTMLCanvasElement {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const canvas = el('canvas', { class: 'icon', width: String(size * dpr), height: String(size * dpr), 'aria-hidden': 'true' });
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const c = canvas.getContext('2d');
  if (c) {
    c.scale(dpr, dpr);
    drawItemIcon(c, id, size);
  }
  return canvas;
}

function moonIcon(phase: Hud['moon'], size: number): SVGElement {
  const r = 12;
  const s = svg('svg', { viewBox: `0 0 ${r * 2} ${r * 2}`, width: String(size), height: String(size), class: 'moon', 'aria-hidden': 'true' });
  s.append(svg('circle', { cx: String(r), cy: String(r), r: String(r), fill: '#2a2933' }));
  s.append(svg('path', { d: moonPath(phase, r), fill: phase === 'full' ? '#efe6cd' : BONE }));
  return s;
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

export function buildLayout(root: HTMLElement): Layout {
  root.replaceChildren();
  const header = el('header', { class: 'masthead' });
  const stage = el('section', { class: 'stage', 'aria-label': 'The manor' });
  const canvas = el('canvas', { width: '960', height: '540', role: 'img', 'aria-label': 'Cutaway view of the manor, its residents and the village beyond' });
  const caption = el('div', { class: 'caption', 'aria-live': 'polite' });
  const tooltip = el('div', { class: 'tooltip', role: 'tooltip', hidden: '' });
  stage.append(canvas, caption, tooltip);
  const hud = el('aside', { class: 'hud', 'aria-label': 'Household status' });
  const plan = el('section', { class: 'plan', 'aria-label': 'Dusk plan' });
  const ticker = el('section', { class: 'diary', 'aria-label': 'Night diary', 'aria-live': 'polite' });
  const bestiary = el('section', { class: 'bestiary', 'aria-label': 'Bestiary' });
  root.append(header, stage, hud, plan, ticker, bestiary);
  return { header, stage, canvas, caption, tooltip, hud, plan, ticker, bestiary };
}

/* ---------- header and settings (MM-34) ---------- */

export interface Keys {
  run: string;
  skip: string;
  focusPlan: string;
}

export interface Settings {
  scale: number;
  keys: Keys;
  /** Grain and vignette. */
  grain: boolean;
  /** Animation; defaults off when the OS asks for reduced motion. */
  motion: boolean;
}

const DEFAULT_KEYS: Keys = { run: 'r', skip: ' ', focusPlan: 'p' };

export function loadSettings(prefersReducedMotion = false): Settings {
  const base: Settings = { scale: 1, keys: { ...DEFAULT_KEYS }, grain: true, motion: !prefersReducedMotion };
  try {
    const raw = localStorage.getItem('monster-manor.settings');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return {
        scale: parsed.scale ?? base.scale,
        keys: { ...DEFAULT_KEYS, ...parsed.keys },
        grain: parsed.grain ?? base.grain,
        motion: parsed.motion ?? base.motion,
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

export function renderHeader(target: HTMLElement, meta: string, settings: Settings, onChange: () => void): void {
  target.replaceChildren();
  const mark = el('div', { class: 'wordmark' }, el('span', { class: 'wm-1', text: 'Monster' }), el('span', { class: 'wm-2', text: 'Manor' }));
  const sub = el('p', { class: 'meta', text: meta });
  const box = el('details', { class: 'settings' });
  box.append(el('summary', { text: 'Settings' }));
  const panel = el('div', { class: 'settings-panel' });
  const smaller = el('button', { type: 'button', text: 'A−', 'aria-label': 'Smaller text' });
  const larger = el('button', { type: 'button', text: 'A+', 'aria-label': 'Larger text' });
  smaller.addEventListener('click', () => {
    settings.scale = Math.max(0.8, Math.round((settings.scale - 0.1) * 10) / 10);
    onChange();
  });
  larger.addEventListener('click', () => {
    settings.scale = Math.min(1.8, Math.round((settings.scale + 0.1) * 10) / 10);
    onChange();
  });
  panel.append(el('div', { class: 'setting' }, el('span', { text: 'Text size' }), smaller, larger));
  for (const [key, label] of [['grain', 'Film grain and vignette'], ['motion', 'Animation']] as const) {
    const id = `setting-${key}`;
    const input = el('input', { type: 'checkbox', id });
    input.checked = settings[key];
    input.addEventListener('change', () => {
      settings[key] = input.checked;
      onChange();
    });
    panel.append(el('div', { class: 'setting' }, input, el('label', { for: id, text: label })));
  }
  for (const [name, label] of [['run', 'Run night'], ['skip', 'Skip animation'], ['focusPlan', 'Focus plan']] as const) {
    const current = settings.keys[name] === ' ' ? 'space' : settings.keys[name];
    const btn = el('button', { type: 'button', text: 'remap', 'aria-label': `Remap key for ${label}, currently ${current}` });
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
    panel.append(el('div', { class: 'setting' }, el('span', { text: label }), el('kbd', { text: current }), btn));
  }
  box.append(panel);
  target.append(mark, sub, box);
}

/* ---------- HUD (MM-24) ---------- */

function bar(label: string, value: number, cls: string, critical: boolean, inverted = false): HTMLElement {
  const wrap = el('div', { class: `need${critical ? ' critical' : ''}` });
  wrap.append(el('span', { class: 'need-label', text: label }));
  const track = el('div', { class: 'track', role: 'meter', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(value) });
  const fill = el('div', { class: `fill ${cls}${inverted ? ' inverted' : ''}` });
  fill.style.width = `${value}%`;
  track.append(fill);
  wrap.append(track, el('span', { class: 'need-value', text: String(value) }));
  return wrap;
}

function suspicionGauge(hud: Hud): HTMLElement {
  const v = hud.suspicion;
  const wrap = el('div', { class: 'gauge suspicion' });
  const tone = v >= THRESHOLDS.mob ? 'alarm' : v >= THRESHOLDS.snooping ? 'warn' : 'calm';
  const moodWords: Record<Hud['mood'], string> = { calm: 'The village sleeps', gossip: 'Gossip', snooping: 'A hunter in town', mob: 'The mob gathers', mobAtDoor: 'At the door' };
  wrap.append(el('div', { class: 'gauge-head' }, el('span', { class: 'gauge-title', text: 'Suspicion' }), el('span', { class: `gauge-value ${tone}`, text: String(v) })));
  const track = el('div', { class: 'gauge-track', role: 'meter', 'aria-label': `Suspicion ${v} of 100, ${moodWords[hud.mood]}`, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(v) });
  for (const [from, to, cls] of [[0, 40, 'z-calm'], [40, 70, 'z-gossip'], [70, 90, 'z-hunter'], [90, 100, 'z-mob']] as const) {
    const z = el('div', { class: `zone ${cls}` });
    z.style.left = `${from}%`;
    z.style.width = `${to - from}%`;
    track.append(z);
  }
  const fill = el('div', { class: `gauge-fill ${tone}` });
  fill.style.width = `${v}%`;
  track.append(fill);
  wrap.append(track);
  const marks = el('div', { class: 'gauge-marks', 'aria-hidden': 'true' });
  for (const [at, word] of [[40, 'gossip'], [70, 'hunter'], [90, 'mob']] as const) {
    const m = el('span', { text: word });
    m.style.left = `${at}%`;
    marks.append(m);
  }
  wrap.append(marks, el('p', { class: `mood ${tone}`, text: moodWords[hud.mood] }));
  return wrap;
}

export function renderHud(target: HTMLElement, state: GameState): Hud {
  const hud = hudModel(state);
  target.replaceChildren();
  const nights = el('div', { class: 'nights', 'aria-label': `Night ${hud.night} of ${hud.nightsToSurvive}` });
  for (let n = 1; n <= hud.nightsToSurvive; n++) {
    const pip = el('span', { class: `pip${n <= hud.night ? ' done' : ''}${n % 7 === 0 ? ' fullmoon' : ''}`, title: n % 7 === 0 ? `Night ${n}: full moon` : `Night ${n}` });
    nights.append(pip);
  }
  const head = el('div', { class: 'hud-head' });
  head.append(
    el('div', {}, el('p', { class: 'eyebrow', text: hud.status === 'running' ? 'Tonight' : 'The run is over' }), el('h2', { text: `Night ${Math.min(hud.night + (hud.status === 'running' ? 1 : 0), hud.nightsToSurvive)} of ${hud.nightsToSurvive}` })),
    el('div', { class: 'moon-box', title: `Moon: ${hud.moon}` }, moonIcon(hud.moon, 34), el('span', { text: hud.moon === 'full' ? 'full moon' : `full in ${hud.nextFullMoonIn}` })),
  );
  target.append(head, nights, suspicionGauge(hud));
  const angerTone = hud.householdAnger >= 80 ? 'alarm' : hud.householdAnger >= 60 ? 'warn' : 'calm';
  target.append(el('div', { class: 'gauge anger' }, bar('Household anger', hud.householdAnger, angerTone, hud.householdAnger >= 60, true)));
  const chips = el('ul', { class: 'chips' });
  chips.append(el('li', { text: `${hud.coin} coin` }));
  chips.append(el('li', { class: hud.lightningRod ? '' : 'bad', text: hud.lightningRod ? 'Rod standing' : 'Rod down' }));
  if (hud.hunterPresent) chips.append(el('li', { class: 'warn', text: 'Hunter in town' }));
  if (hud.allies.length > 0) chips.append(el('li', { class: 'good', text: `${hud.allies.length} ${hud.allies.length === 1 ? 'ally' : 'allies'}` }));
  target.append(chips);
  for (const m of hud.monsters) {
    const card = el('article', { class: 'resident' });
    card.style.setProperty('--accent', m.accent);
    const monster = state.monsters.find((x) => x.id === m.id);
    const head2 = el('header', {});
    head2.append(portrait(monster?.archetype ?? 'fledgling', m.accent, 44, 'stage', m.name), el('div', {}, el('h3', { text: m.name }), el('p', { class: 'job', text: m.job })));
    card.append(head2);
    const needs = el('div', { class: 'needs' });
    for (const n of m.needs) {
      const cls = n.key === 'anger' ? (n.value >= 60 ? 'alarm' : n.value >= 30 ? 'warn' : 'calm') : n.value < 20 ? 'alarm' : n.value < 40 ? 'warn' : 'calm';
      needs.append(bar(n.key, n.value, cls, n.critical, n.key === 'anger'));
    }
    card.append(needs);
    target.append(card);
  }
  return hud;
}

/* ---------- the dusk plan (MM-23) ---------- */

export interface PlanCallbacks {
  onChange: () => void;
  onRun: () => void;
  onNewRun: (seed: number) => void;
}

export function renderPlan(target: HTMLElement, state: GameState, draft: Draft, cb: PlanCallbacks): void {
  target.replaceChildren();
  const left = el('div', { class: 'plan-main' });
  const right = el('div', { class: 'plan-build' });
  const ended = state.status !== 'running';
  left.append(el('p', { class: 'eyebrow', text: ended ? 'Curtain' : 'At dusk' }), el('h2', { text: ended ? (state.status === 'won' ? 'The household survived.' : 'The manor has fallen.') : `The plan for night ${state.night + 1}` }));
  if (!ended) {
    for (const m of state.monsters) {
      const accent = ACCENTS[m.archetype] ?? BONE;
      const row = el('fieldset', { class: 'assign' });
      row.style.setProperty('--accent', accent);
      const legend = el('legend', {}, portrait(m.archetype, accent, 40, 'stage', ''), el('span', { text: m.name }));
      row.append(legend);
      const tiles = el('div', { class: 'tiles', role: 'radiogroup', 'aria-label': `${m.name} tonight` });
      const current = draft.night[m.id] ?? null;
      for (const kind of [null, ...ACTION_KINDS] as const) {
        const id = `act-${m.id}-${kind ?? 'idle'}`;
        const input = el('input', { type: 'radio', name: `act-${m.id}`, id, value: kind ?? '' });
        input.checked = current === kind;
        input.addEventListener('change', () => {
          draft.night[m.id] = kind;
          cb.onChange();
        });
        tiles.append(el('span', { class: 'tile' }, input, el('label', { for: id, text: kind ? ACTION_LABELS[kind] : 'Idle' })));
      }
      row.append(tiles);
      if (m.daylightActive) {
        const daySel = el('select', { id: `day-${m.id}`, 'aria-label': `${m.name} by day` });
        daySel.append(el('option', { value: '', text: 'Sleeps by day' }));
        for (const k of ['coverJob', 'socialise', 'repair'] as const) daySel.append(el('option', { value: k, text: `By day: ${ACTION_LABELS[k]}` }));
        daySel.value = draft.day[m.id] ?? '';
        daySel.addEventListener('change', () => {
          draft.day[m.id] = (daySel.value || null) as ActionKind | null;
          cb.onChange();
        });
        row.append(el('div', { class: 'dayslot' }, daySel));
      }
      const hints = riskHints(state, m, current);
      const hintBox = el('ul', { class: 'hints' });
      for (const h of hints) hintBox.append(el('li', { text: h }));
      row.append(hintBox);
      left.append(row);
    }
    const story = previewStory(state, draft);
    if (story) {
      const box = el('fieldset', { class: 'story' });
      box.append(el('legend', { text: story.title }));
      for (const c of story.choices) {
        const id = `choice-${story.id}-${c.id}`;
        const radio = el('input', { type: 'radio', name: `choice-${story.id}`, id, value: c.id });
        radio.checked = (draft.choices[story.id] ?? story.choices[0]!.id) === c.id;
        radio.addEventListener('change', () => {
          draft.choices[story.id] = c.id;
          cb.onChange();
        });
        box.append(el('div', { class: 'choice' }, radio, el('label', { for: id, text: c.label })));
      }
      left.append(box);
    }
  }
  const controls = el('div', { class: 'controls' });
  const run = el('button', { class: 'primary', type: 'button', text: ended ? 'Run over' : 'Run the night' });
  run.disabled = ended;
  run.addEventListener('click', cb.onRun);
  const seedInput = el('input', { type: 'number', value: String(state.options.seed), 'aria-label': 'Seed for a new run' });
  const newRun = el('button', { type: 'button', text: 'New run' });
  newRun.addEventListener('click', () => cb.onNewRun(Number(seedInput.value) || 1));
  controls.append(run, el('span', { class: 'spacer' }), el('label', { class: 'seed' }, 'Seed ', seedInput), newRun);
  left.append(controls);

  right.append(el('p', { class: 'eyebrow', text: 'Build' }), el('h2', { text: `${state.house.coin} coin to spend` }));
  const grid = el('div', { class: 'catalogue' });
  for (const item of CATALOGUE) {
    const id = `buy-${item.id}`;
    const owned = item.kind === 'defence' ? state.house.defences[item.defence!] : item.kind === 'lightningRod' ? state.house.lightningRod : state.house.furniture.some((f) => f.id === item.id && !f.broken);
    const input = el('input', { type: 'checkbox', id });
    input.checked = draft.build.includes(item.id);
    input.disabled = ended;
    input.addEventListener('change', () => {
      draft.build = input.checked ? [...draft.build, item.id] : draft.build.filter((x) => x !== item.id);
      cb.onChange();
    });
    const cls = ['item', owned ? 'owned' : '', item.cost > state.house.coin ? 'dear' : ''].filter(Boolean).join(' ');
    const label = el('label', { for: id, class: cls, title: item.blurb }, itemIcon(item.id, 42), el('span', { class: 'item-name', text: item.name }), el('span', { class: 'item-cost', text: owned ? 'owned' : `${item.cost}` }));
    grid.append(el('div', { class: 'item-wrap' }, input, label));
  }
  right.append(grid);
  target.append(left, right);
}

/* ---------- the night diary ---------- */

export function renderTicker(target: HTMLElement, events: readonly Event[], reveal: number, accents: ReadonlyMap<string, string> = new Map()): void {
  target.replaceChildren();
  target.append(el('p', { class: 'eyebrow', text: 'The night diary' }));
  if (events.length === 0) {
    target.append(el('p', { class: 'empty', text: 'Nothing has happened yet. Make a plan and run the night.' }));
    return;
  }
  let phase = '';
  const list = el('ol', { class: 'entries' });
  events.slice(0, reveal).forEach((e) => {
    if (e.phase !== phase) {
      phase = e.phase;
      list.append(el('li', { class: 'phase', text: `${phase} · night ${e.night}` }));
    }
    const li = el('li', { class: `entry kind-${e.kind}`, text: e.text });
    const accent = e.monsterId ? accents.get(e.monsterId) : undefined;
    if (accent) li.style.setProperty('--accent', accent);
    list.append(li);
  });
  target.append(list);
  target.scrollTop = target.scrollHeight;
}

/* ---------- the bestiary (MM-25) ---------- */

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

export function saveMet(met: ReadonlySet<Archetype>): void {
  try {
    localStorage.setItem(MET_KEY, JSON.stringify([...met]));
  } catch {
    /* ignore */
  }
}

/**
 * A 1930s field guide: one plate per archetype, unlocked the first time that
 * resident lives in your manor (and remembered between runs).
 */
export function renderBestiary(target: HTMLElement, state: GameState, met: Set<Archetype>): void {
  let changed = false;
  for (const m of state.monsters) {
    if (m.archetype !== 'fledgling' && !met.has(m.archetype)) {
      met.add(m.archetype);
      changed = true;
    }
  }
  if (changed) saveMet(met);
  target.replaceChildren();
  const head = el('header', { class: 'guide-head' });
  head.append(el('p', { class: 'eyebrow', text: 'A field guide to' }), el('h2', { text: 'The Household Monsters of the Valley' }), el('p', { class: 'guide-count', text: `${met.size} of ${PLAYABLE.length} plates observed` }));
  target.append(head);
  const plates = el('div', { class: 'plates' });
  PLAYABLE.forEach((a, i) => {
    const plateNo = `Plate ${romanNumeral(i + 1)}`;
    const copy = PLATES[a as keyof typeof PLATES];
    const accent = ACCENTS[a] ?? BONE;
    if (!met.has(a)) {
      const locked = el('article', { class: 'plate locked' });
      locked.append(el('p', { class: 'plate-no', text: plateNo }), portrait(a, accent, 132, 'shadow', 'An unidentified silhouette'), el('h3', { text: 'Not yet observed' }), el('p', { class: 'latin', text: 'Species incerta' }));
      plates.append(locked);
      return;
    }
    const m = createArchetype(a);
    const plate = el('article', { class: 'plate' });
    plate.style.setProperty('--accent', accent);
    plate.append(el('p', { class: 'plate-no', text: plateNo }));
    plate.append(el('div', { class: 'engraving' }, portrait(a, accent, 132, 'plate', `Engraving of ${m.name}`)));
    plate.append(el('h3', { text: m.name }), el('p', { class: 'latin', text: copy.binomial }));
    const facts = el('dl', { class: 'facts' });
    facts.append(el('dt', { text: 'Habitat' }), el('dd', { text: m.bedroom === 'roof' ? 'the roof' : `the ${m.bedroom}` }));
    facts.append(el('dt', { text: 'By cover' }), el('dd', { text: m.coverJob.title }));
    facts.append(el('dt', { text: 'By day' }), el('dd', { text: m.daylightActive ? 'abroad' : 'asleep' }));
    plate.append(facts);
    const habits = el('ul', { class: 'habits' });
    for (const q of m.quirks) habits.append(el('li', { text: getQuirk(q).description }));
    plate.append(el('h4', { text: 'Habits' }), habits, el('h4', { text: 'Field note' }), el('p', { class: 'note', text: copy.note }));
    plates.append(plate);
  });
  target.append(plates);
}

export const PLATE_BACKGROUND = PLATE_PAPER;
