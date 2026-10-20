/** Web client entry: wires the sim to the renderer, HUD and planning form. */
import { setLocale, type Locale } from '../sim/i18n.ts';
import { createGame, runNight } from '../sim/loop.ts';
import { PLAYABLE, VALLEY_HOUSEHOLD } from '../sim/monsters.ts';
import type { Archetype, Difficulty, Event, GameState, Setting } from '../sim/types.ts';
import { drawScene, type Scene } from './render.ts';
import { buildLayout, draftToPlan, emptyDraft, loadSettings, renderBestiary, renderHud, renderPlan, renderSettings, renderTicker, saveSettings, type Draft } from './ui.ts';
import { daylight, moonPhase, spriteStates } from './viewmodel.ts';
import { roomExposure } from '../sim/house.ts';

type Phase = 'dusk' | 'night' | 'day';

function optionsFromUrl(): Parameters<typeof createGame>[0] {
  const q = new URLSearchParams(location.search);
  const seed = Number(q.get('seed') ?? 42) || 42;
  const setting = (q.get('setting') === 'valley' ? 'valley' : 'manor') as Setting;
  const householdParam = q.get('household');
  const household = householdParam
    ? (householdParam.split(',').filter((a): a is Archetype => (PLAYABLE as readonly string[]).includes(a)))
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

class App {
  state: GameState;
  draft: Draft;
  phase: Phase = 'dusk';
  frame = 0;
  shown: Event[] = [];
  reveal = 0;
  timer: number | null = null;
  settings = loadSettings();
  met = new Set<string>();
  layout;

  constructor(root: HTMLElement) {
    this.layout = buildLayout(root);
    this.state = createGame(optionsFromUrl());
    this.draft = emptyDraft(this.state);
    this.applySettings();
    this.renderAll();
    window.addEventListener('keydown', (ev) => this.onKey(ev));
    const loop = () => {
      this.frame += 1;
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  applySettings(): void {
    document.documentElement.style.fontSize = `${16 * this.settings.scale}px`;
    saveSettings(this.settings);
  }

  renderAll(): void {
    const { header, hud, plan } = this.layout;
    header.replaceChildren();
    const h1 = document.createElement('h1');
    h1.textContent = 'Monster Manor';
    const sub = document.createElement('span');
    sub.className = 'sub';
    sub.textContent = `seed ${this.state.options.seed} · ${this.state.options.setting ?? 'manor'} · ${this.phase}`;
    header.append(h1, sub);
    renderSettings(header, this.settings, () => {
      this.applySettings();
      this.renderAll();
    });
    renderHud(hud, this.state);
    renderPlan(plan, this.state, this.draft, {
      onChange: () => renderPlan(plan, this.state, this.draft, this.callbacks()),
      onRun: () => this.runNight(),
      onNewRun: (seed) => this.newRun(seed),
    });
    renderTicker(this.layout.ticker, this.shown, this.reveal);
    renderBestiary(this.layout.bestiary, this.state, this.met);
  }

  callbacks() {
    return { onChange: () => this.renderAll(), onRun: () => this.runNight(), onNewRun: (seed: number) => this.newRun(seed) };
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
  }

  runNight(): void {
    if (this.state.status !== 'running' || this.timer !== null) return;
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
      renderTicker(this.layout.ticker, this.shown, this.reveal);
      if (this.reveal >= this.shown.length) {
        this.timer = null;
        this.finishNight();
        return;
      }
      this.timer = window.setTimeout(step, 350);
    };
    step();
  }

  skip(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
    this.reveal = this.shown.length;
    this.finishNight();
  }

  finishNight(): void {
    this.phase = this.state.status === 'running' ? 'dusk' : 'day';
    // keep yesterday's choices as the default for tonight, drop one-off purchases
    this.draft.build = [];
    this.draft.choices = {};
    for (const m of this.state.monsters) {
      if (!(m.id in this.draft.night)) this.draft.night[m.id] = 'lieLow';
    }
    this.renderAll();
  }

  onKey(ev: KeyboardEvent): void {
    const target = ev.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
    const k = ev.key.toLowerCase();
    if (k === this.settings.keys.run) {
      ev.preventDefault();
      this.runNight();
    } else if (k === this.settings.keys.skip) {
      ev.preventDefault();
      this.skip();
    } else if (k === this.settings.keys.focusPlan) {
      ev.preventDefault();
      this.layout.plan.querySelector('select')?.focus();
    }
  }

  scene(): Scene {
    const s = this.state;
    return {
      phase: this.phase,
      daylight: daylight(this.phase),
      moon: moonPhase(this.phase === 'dusk' && s.status === 'running' ? s.night + 1 : s.night),
      rooms: s.house.rooms.map((r) => ({ id: r.id, name: r.name, lit: r.lit && this.phase !== 'day', exposure: roomExposure(s.house, r.id), secretPassage: r.secretPassage, windows: r.windows })),
      furniture: s.house.furniture,
      sprites: spriteStates(s, this.phase),
      lightningRod: s.house.lightningRod,
      defences: s.house.defences,
      mobGathering: s.village.suspicion >= 90,
      hunterPresent: s.village.hunterPresent,
    };
  }

  draw(): void {
    const ctx = this.layout.canvas.getContext('2d');
    if (!ctx) return;
    drawScene(ctx, this.layout.canvas.width, this.layout.canvas.height, this.scene(), this.frame);
  }
}

const root = document.getElementById('app');
export const app = root ? new App(root) : null;
