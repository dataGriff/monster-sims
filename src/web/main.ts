/** Web client entry: wires the sim to the stage, HUD, plan, diary and bestiary. */
import { roomExposure } from '../sim/house.ts';
import { setLocale, type Locale } from '../sim/i18n.ts';
import { createGame, runNight } from '../sim/loop.ts';
import { PLAYABLE, VALLEY_HOUSEHOLD } from '../sim/monsters.ts';
import type { Archetype, Difficulty, Event, GameState, Setting } from '../sim/types.ts';
import { paintNoise, type Card } from './art/post.ts';
import { MOTION, defaultTheme, motion } from './design/tokens.ts';
import { STAGE_H, STAGE_W, drawScene, hitTest, type HitBox, type Scene } from './render.ts';
import {
  buildLayout,
  draftToPlan,
  emptyDraft,
  loadMet,
  loadSettings,
  renderBestiary,
  renderHeader,
  renderHud,
  renderPlan,
  renderTicker,
  saveSettings,
  type Draft,
  type Settings,
} from './ui.ts';
import { accentFor, daylight, moonPhase, spriteStates, type Sprite } from './viewmodel.ts';

type Phase = 'dusk' | 'night' | 'day';

const NOISE = 128;

function optionsFromUrl(): Parameters<typeof createGame>[0] {
  const q = new URLSearchParams(location.search);
  const seed = Number(q.get('seed') ?? 42) || 42;
  const setting = (q.get('setting') === 'valley' ? 'valley' : 'manor') as Setting;
  const householdParam = q.get('household');
  const household = householdParam
    ? householdParam.split(',').filter((a): a is Archetype => (PLAYABLE as readonly string[]).includes(a))
    : setting === 'valley'
      ? [...VALLEY_HOUSEHOLD]
      : undefined;
  const difficulty = q.get('difficulty') as Difficulty | null;
  const nights = Number(q.get('nights') ?? 7) || 7;
  const lang = (q.get('lang') === 'cy' ? 'cy' : 'en') as Locale;
  setLocale(lang);
  return {
    seed,
    nightsToSurvive: nights,
    setting,
    stories: q.get('stories') !== 'off',
    ...(household && household.length > 0 ? { household } : {}),
    ...(difficulty && ['gentle', 'standard', 'harsh'].includes(difficulty) ? { difficulty } : {}),
    ...(q.get('sandbox') === '1' ? { sandbox: true } : {}),
  };
}

interface CardState extends Omit<Card, 'alpha'> {
  start: number;
  /** Frames to hold; Infinity holds until replaced. */
  hold: number;
}

class App {
  state: GameState;
  draft: Draft;
  phase: Phase = 'dusk';
  frame = 0;
  shown: Event[] = [];
  reveal = 0;
  timer: number | null = null;
  settings: Settings;
  met = loadMet();
  light = daylight('dusk');
  card: CardState | null = null;
  hits: HitBox[] = [];
  noise: HTMLCanvasElement | undefined;
  keyart: boolean;
  layout;

  constructor(root: HTMLElement) {
    this.keyart = new URLSearchParams(location.search).get('keyart') === '1';
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const moreContrast = window.matchMedia?.('(prefers-contrast: more)').matches ?? false;
    this.settings = loadSettings(reduced, defaultTheme(moreContrast));
    this.layout = buildLayout(root);
    this.state = createGame(optionsFromUrl());
    this.draft = emptyDraft(this.state);
    this.noise = this.makeNoise();
    this.applySettings();
    this.renderAll();
    this.showCard({ title: 'Monster Manor', subtitle: 'a household of monsters · a village that watches' }, this.keyart ? Infinity : MOTION.titleHold);
    if (this.keyart) document.body.classList.add('keyart');
    window.addEventListener('keydown', (ev) => this.onKey(ev));
    this.layout.canvas.addEventListener('pointermove', (ev) => this.onHover(ev));
    this.layout.canvas.addEventListener('pointerleave', () => {
      this.layout.tooltip.hidden = true;
    });
    new ResizeObserver(() => this.resize()).observe(this.layout.stage);
    this.resize();
    const loop = () => {
      this.frame += 1;
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  makeNoise(): HTMLCanvasElement | undefined {
    const n = document.createElement('canvas');
    n.width = NOISE;
    n.height = NOISE;
    const c = n.getContext('2d');
    if (!c) return undefined;
    paintNoise(c, NOISE, 9);
    return n;
  }

  resize(): void {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const width = this.keyart ? 1920 : Math.max(320, this.layout.stage.clientWidth);
    const scale = this.keyart ? 1 : dpr;
    this.layout.canvas.width = Math.round(width * scale);
    this.layout.canvas.height = Math.round((width * scale * STAGE_H) / STAGE_W);
  }

  applySettings(): void {
    document.documentElement.style.fontSize = `${16 * this.settings.scale}px`;
    document.documentElement.classList.toggle('reduce-motion', !this.settings.motion);
    document.documentElement.dataset['theme'] = this.settings.theme;
    saveSettings(this.settings);
  }

  accents(): Map<string, string> {
    return new Map(this.state.monsters.map((m) => [m.id, accentFor(m)]));
  }

  renderAll(): void {
    const { header, hud, plan } = this.layout;
    const s = this.state;
    const where = s.options.setting === 'valley' ? 'the valley' : 'the manor';
    renderHeader(header, `seed ${s.options.seed} · ${where} · ${s.options.difficulty ?? 'standard'}`, this.settings, () => {
      this.applySettings();
      this.renderAll();
    });
    renderHud(hud, s);
    renderPlan(plan, s, this.draft, {
      onChange: () => this.renderAll(),
      onRun: () => this.runNight(),
      onNewRun: (seed) => this.newRun(seed),
    });
    renderTicker(this.layout.ticker, this.shown, this.reveal, this.accents());
    renderBestiary(this.layout.bestiary, s, this.met);
  }

  showCard(card: Omit<CardState, 'start' | 'hold'>, hold: number): void {
    this.card = { ...card, start: this.frame, hold };
  }

  cardAlpha(): Card | undefined {
    if (!this.card) return undefined;
    const age = this.frame - this.card.start;
    const fade = motion('cardFade', this.settings.motion);
    if (age > this.card.hold + fade) {
      this.card = null;
      return undefined;
    }
    const alpha = Math.min(1, age / fade, (this.card.hold + fade - age) / fade);
    return this.card.subtitle !== undefined
      ? { title: this.card.title, subtitle: this.card.subtitle, alpha }
      : { title: this.card.title, alpha };
  }

  newRun(seed: number): void {
    const url = new URL(location.href);
    url.searchParams.set('seed', String(seed));
    history.replaceState(null, '', url);
    this.state = createGame({ ...optionsFromUrl(), seed });
    this.draft = emptyDraft(this.state);
    this.phase = 'dusk';
    this.shown = [];
    this.reveal = 0;
    this.renderAll();
    this.showCard({ title: 'Monster Manor', subtitle: `a new household · seed ${seed}` }, MOTION.newRunHold);
  }

  runNight(): void {
    if (this.state.status !== 'running' || this.timer !== null) return;
    const n = this.state.night + 1;
    const moon = moonPhase(n);
    this.showCard({ title: `Night ${n}`, subtitle: moon === 'full' ? 'the moon is full' : `the moon is ${moon}` }, MOTION.nightHold);
    const events = runNight(this.state, draftToPlan(this.draft));
    this.shown = [...events];
    this.reveal = 0;
    this.phase = 'night';
    const step = () => {
      this.reveal += 1;
      const e = this.shown[this.reveal - 1];
      if (e) {
        this.phase = e.phase === 'day' ? 'day' : e.phase === 'dusk' ? 'dusk' : 'night';
        this.layout.caption.textContent = e.text;
      }
      renderTicker(this.layout.ticker, this.shown, this.reveal, this.accents());
      if (this.reveal >= this.shown.length) {
        this.timer = null;
        this.finishNight();
        return;
      }
      this.timer = window.setTimeout(step, motion('revealStep', this.settings.motion));
    };
    this.timer = window.setTimeout(step, motion('revealDelay', this.settings.motion));
  }

  skip(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
    this.reveal = this.shown.length;
    this.finishNight();
  }

  finishNight(): void {
    this.phase = this.state.status === 'running' ? 'dusk' : this.state.status === 'won' ? 'day' : 'night';
    this.draft.build = [];
    this.draft.choices = {};
    for (const m of this.state.monsters) if (!(m.id in this.draft.night)) this.draft.night[m.id] = 'lieLow';
    if (this.state.status === 'won') this.showCard({ title: 'The Household Survived', subtitle: `${this.state.night} nights · Suspicion ${this.state.village.suspicion}` }, Infinity);
    if (this.state.status === 'lost') this.showCard({ title: 'The Manor Has Fallen', subtitle: `night ${this.state.night} · the mob is at the door` }, Infinity);
    this.renderAll();
  }

  onKey(ev: KeyboardEvent): void {
    const target = ev.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
      if (!(target instanceof HTMLInputElement && target.type === 'radio')) return;
    }
    const k = ev.key.toLowerCase();
    if (k === this.settings.keys.run) {
      ev.preventDefault();
      this.runNight();
    } else if (k === this.settings.keys.skip) {
      ev.preventDefault();
      this.skip();
    } else if (k === this.settings.keys.focusPlan) {
      ev.preventDefault();
      (this.layout.plan.querySelector('input[type=radio]:checked') as HTMLElement | null)?.focus();
    }
  }

  onHover(ev: PointerEvent): void {
    const rect = this.layout.canvas.getBoundingClientRect();
    const sx = ((ev.clientX - rect.left) / rect.width) * STAGE_W;
    const sy = ((ev.clientY - rect.top) / rect.height) * STAGE_H;
    const hit = hitTest(this.hits, sx, sy);
    const tip = this.layout.tooltip;
    if (!hit) {
      tip.hidden = true;
      this.layout.canvas.style.cursor = 'default';
      return;
    }
    this.layout.canvas.style.cursor = 'help';
    tip.hidden = false;
    tip.replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = hit.name;
    const p = document.createElement('span');
    p.textContent = hit.caption;
    tip.append(strong, p);
    tip.style.left = `${Math.min(rect.width - 240, ev.clientX - rect.left + 14)}px`;
    tip.style.top = `${ev.clientY - rect.top + 14}px`;
  }

  scene(): Scene {
    const s = this.state;
    const target = daylight(this.phase);
    this.light += (target - this.light) * motion('lightEase', this.settings.motion);
    if (this.keyart) return this.keyartScene();
    const card = this.cardAlpha();
    return {
      phase: this.phase,
      daylight: this.light,
      moon: moonPhase(this.phase === 'dusk' && s.status === 'running' ? s.night + 1 : Math.max(1, s.night)),
      seed: s.options.seed,
      valley: s.options.setting === 'valley',
      rooms: s.house.rooms.map((r) => ({ id: r.id, name: r.name, lit: r.lit && this.phase === 'night', exposure: roomExposure(s.house, r.id), secretPassage: r.secretPassage, windows: r.windows })),
      furniture: s.house.furniture,
      sprites: spriteStates(s, this.phase),
      lightningRod: s.house.lightningRod,
      lightningLovers: s.monsters.some((m) => m.quirks.includes('lightningPowered')),
      defences: s.house.defences,
      suspicion: s.village.suspicion,
      mobGathering: s.village.suspicion >= 90,
      hunterPresent: s.village.hunterPresent,
      ...(card ? { card } : {}),
    };
  }

  /** The poster composition: full moon, lit windows, the whole launch household awake, the village at the gate. */
  keyartScene(): Scene {
    const s = this.state;
    const pose: Record<string, Sprite['pose']> = { count: 'act', wolfman: 'act', golem: 'idle' };
    const room: Record<string, Sprite['room']> = { count: 'parlour', wolfman: 'roof', golem: 'workshop' };
    const sprites: Sprite[] = s.monsters.map((m) => ({
      id: m.id,
      name: m.name,
      archetype: m.archetype,
      bed: m.bed,
      initial: m.name.charAt(4),
      accent: accentFor(m),
      room: room[m.id] ?? m.bedroom,
      pose: pose[m.id] ?? 'idle',
      caption: m.name,
    }));
    return {
      phase: 'night',
      daylight: 0.08,
      moon: 'full',
      seed: s.options.seed,
      valley: false,
      rooms: s.house.rooms.map((r) => ({ id: r.id, name: r.name, lit: r.id === 'parlour' || r.id === 'workshop', exposure: 0, secretPassage: r.secretPassage, windows: r.windows })),
      furniture: s.house.furniture,
      sprites,
      lightningRod: true,
      lightningLovers: false,
      defences: { drawbridge: false, fogMachine: true, decoyCoffins: false, organ: true },
      suspicion: 92,
      mobGathering: true,
      hunterPresent: true,
      card: { title: 'Monster\nManor', subtitle: 'a household of monsters · a village that watches', alpha: 1, region: { x: 600, y: 120, w: 340 } },
    };
  }

  draw(): void {
    const c = this.layout.canvas.getContext('2d');
    if (!c) return;
    const k = this.layout.canvas.width / STAGE_W;
    c.setTransform(k, 0, 0, k, 0, 0);
    this.hits = drawScene(c, this.scene(), this.keyart ? 0 : this.frame, {
      grain: this.settings.grain,
      motion: this.settings.motion && !this.keyart,
      ...(this.noise ? { noise: this.noise, noiseSize: NOISE } : {}),
    });
  }
}

const root = document.getElementById('app');
export const app = root ? new App(root) : null;
