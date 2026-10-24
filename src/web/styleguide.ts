/**
 * The living style guide (MM-48): every token, scale, component, icon,
 * figure, furniture drawing and stage variant, rendered by the same code the
 * game uses so it cannot drift. Served as styleguide.html.
 */
import { createGame, runNight } from '../sim/loop.ts';
import { PLAYABLE, VALLEY_HOUSEHOLD } from '../sim/monsters.ts';
import { DEFAULT_PLAN, planForNight } from '../sim/plan.ts';
import type { GameState } from '../sim/types.ts';
import { drawFigure, figureHeight, type FigureStyle, type Pose } from './art/figures.ts';
import { FIXTURES, FURNITURE, drawItemIcon } from './art/furniture.ts';
import { INK, contrast, onAccent } from './art/palette.ts';
import { drawCard } from './art/post.ts';
import { EASE, GUTTER, MOTION, SPACE, THEMES, THEME_LABELS, TYPE, cssName, type ThemeName } from './design/tokens.ts';
import { button, catalogueItem, chip, chips, eyebrow, gauge, lockedPlate, meter, plate, portrait, select, storyCard, tileGroup, toggle } from './kit/components.ts';
import { h, mount, type VNode } from './kit/h.ts';
import { ICONS, icon, type IconName } from './kit/icons.ts';
import { STAGE_H, STAGE_W, drawScene, type Scene } from './render.ts';
import { ACCENTS, daylight, moonPhase, spriteStates } from './viewmodel.ts';

const noop = () => {};

function canvas(w: number, hgt: number, draw: (c: CanvasRenderingContext2D) => void, label = ''): VNode {
  return h('canvas', {
    class: 'sg-canvas',
    ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }),
    draw: (el: Element) => {
      const cv = el as HTMLCanvasElement;
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      cv.width = w * dpr;
      cv.height = hgt * dpr;
      cv.style.width = `${w}px`;
      cv.style.height = `${hgt}px`;
      const c = cv.getContext('2d');
      if (!c) return;
      c.scale(dpr, dpr);
      draw(c);
    },
  });
}

function section(id: string, kicker: string, title: string, intro: string, ...body: VNode[]): VNode {
  return h('section', { class: 'sg-section', id, 'aria-labelledby': `${id}-title` }, eyebrow(kicker), h('h2', { id: `${id}-title` }, title), h('p', { class: 'sg-intro' }, intro), ...body);
}

/* ---------- tokens ---------- */

const TEXT_ROLES = ['text', 'textMuted', 'textStrong', 'warnText', 'alarmText', 'lamp'] as const;

function themePanel(name: ThemeName): VNode {
  const t = THEMES[name];
  const swatches = Object.entries(t)
    .filter(([k]) => k !== 'colorScheme')
    .map(([role, value]) => {
      const isText = (TEXT_ROLES as readonly string[]).includes(role);
      const ratio = isText && value.startsWith('#') ? `${contrast(value, t.surface).toFixed(1)}:1 on surface` : '';
      return h(
        'li',
        { class: 'sg-swatch' },
        h('span', { class: 'sg-chip', style: { background: `var(${cssName(role)})` } }),
        h('code', null, cssName(role)),
        h('span', { class: 'sg-value' }, value),
        ratio ? h('span', { class: 'sg-ratio' }, ratio) : null,
      );
    });
  return h('div', { class: 'sg-theme', 'data-theme': name }, h('h3', null, THEME_LABELS[name]), h('p', { class: 'sg-sample' }, 'The village sleeps. ', h('span', { class: 'sg-muted' }, 'Muted text. '), h('span', { class: 'sg-warn' }, 'A hunter in town. '), h('span', { class: 'sg-alarm' }, 'The mob gathers.')), h('ul', { class: 'sg-swatches' }, swatches));
}

function accents(): VNode {
  return h(
    'ul',
    { class: 'sg-accents' },
    PLAYABLE.map((a) => {
      const accent = ACCENTS[a]!;
      return h(
        'li',
        { style: { '--accent': accent } },
        h('span', { class: 'sg-accent-fill', style: { background: accent, color: onAccent(accent) } }, a),
        h('span', { class: 'sg-value' }, `${accent} · ${contrast(accent, INK).toFixed(1)}:1 on ink`),
      );
    }),
  );
}

function scales(): VNode[] {
  return [
    h('h3', null, 'Type'),
    h('ul', { class: 'sg-type' }, Object.entries(TYPE).filter(([k]) => k !== 'root').map(([k, v]) => h('li', null, h('code', null, `--text-${k} · ${v}`), h('span', { style: { 'font-size': `var(--text-${k})` } }, 'Monster Manor')))),
    h('h3', null, 'Space'),
    h('ul', { class: 'sg-space' }, Object.entries(SPACE).map(([k, v]) => h('li', null, h('code', null, `--space-${k}`), h('span', { class: 'sg-bar', style: { width: v } })))),
    h('p', { class: 'sg-note' }, `Page gutter: ${GUTTER}.`),
    h('h3', null, 'Motion'),
    h('ul', { class: 'sg-motion' }, Object.entries(MOTION).map(([k, v]) => h('li', null, h('code', null, k), h('span', null, String(v))))),
    h('p', { class: 'sg-note' }, `Easing: ${EASE.standard}. With animation off every duration is zero and the client is instant.`),
  ];
}

/* ---------- components ---------- */

function components(game: GameState): VNode[] {
  const needs: VNode[] = [
    meter({ label: 'calm', value: 80, tone: 'calm' }),
    meter({ label: 'warn', value: 32, tone: 'warn' }),
    meter({ label: 'alarm', value: 12, tone: 'alarm', critical: true }),
    meter({ label: 'anger', value: 70, tone: 'alarm', critical: true, inverted: true, icon: icon('anger', 12) }),
  ];
  const zones = [
    { from: 0, to: 40, className: 'z-calm' },
    { from: 40, to: 70, className: 'z-gossip', mark: 'gossip' },
    { from: 70, to: 90, className: 'z-hunter', mark: 'hunter' },
    { from: 90, to: 100, className: 'z-mob', mark: 'mob' },
  ];
  const gauges = ([[22, 'calm', 'The village sleeps'], [55, 'calm', 'Gossip'], [78, 'warn', 'A hunter in town'], [95, 'alarm', 'The mob gathers']] as const).map(([v, tone, caption]) => gauge({ title: 'Suspicion', value: v, tone, zones, caption, label: `Suspicion ${v}` }));
  return [
    h('h3', null, 'Meters'),
    h('div', { class: 'sg-grid needs' }, needs),
    h('h3', null, 'Gauges'),
    h('div', { class: 'sg-grid' }, gauges),
    h('h3', null, 'Chips'),
    chips([chip('20 coin', '', icon('coin')), chip('Rod down', 'bad', icon('rodDown')), chip('Hunter in town', 'warn', icon('hunter')), chip('2 allies', 'good', icon('allies'))]),
    h('h3', null, 'Buttons and fields'),
    h('div', { class: 'sg-row' }, button({ label: 'Run the night', primary: true, onClick: noop }), button({ label: 'Run over', primary: true, disabled: true, onClick: noop }), button({ label: 'New run', onClick: noop }), select({ id: 'sg-select', label: 'Theme', visibleLabel: true, value: 'night', options: Object.entries(THEME_LABELS).map(([value, label]) => ({ value, label })), onChange: noop })),
    h('div', { class: 'sg-row' }, toggle('sg-toggle-a', 'Film grain and vignette', true, noop), toggle('sg-toggle-b', 'Animation', false, noop)),
    h('h3', null, 'Tile group'),
    h(
      'fieldset',
      { class: 'assign', style: { '--accent': ACCENTS['count']!, '--on-accent': onAccent(ACCENTS['count']!) } },
      h('legend', null, portrait('count', ACCENTS['count']!, 40), h('span', null, 'The Count')),
      tileGroup({ name: 'sg-tiles', label: 'Example', value: 'feed', options: [{ value: 'idle', label: 'Idle', icon: icon('idle') }, { value: 'feed', label: 'Feed', icon: icon('feed') }, { value: 'sleep', label: 'Sleep', icon: icon('sleep') }], onChange: noop }),
      h('ul', { class: 'hints' }, h('li', null, 'Shift fails 20% of the time.')),
    ),
    h('h3', null, 'Story card'),
    storyCard({ id: 'sg', title: 'A lost traveller at the door', value: 'takeIn', onChange: noop, choices: [{ id: 'turnAway', label: 'Turn them away' }, { id: 'takeIn', label: 'Give them a bed' }] }),
    h('h3', null, 'Catalogue items'),
    h(
      'div',
      { class: 'catalogue sg-catalogue' },
      catalogueItem({ id: 'coffin', name: 'coffin', cost: 10, blurb: '', owned: true, affordable: true, checked: false, disabled: false, onChange: noop }),
      catalogueItem({ id: 'organ', name: 'pipe organ', cost: 20, blurb: '', owned: false, affordable: true, checked: true, disabled: false, onChange: noop }),
      catalogueItem({ id: 'drawbridge', name: 'drawbridge', cost: 30, blurb: '', owned: false, affordable: false, checked: false, disabled: false, onChange: noop }),
    ),
    h('h3', null, 'Plates'),
    h(
      'div',
      { class: 'plates' },
      plate({ number: 'Plate I', accent: ACCENTS['count']!, archetype: 'count', name: 'The Count', binomial: 'Sanguisuga nobilis', facts: [['Habitat', 'the crypt'], ['By cover', 'night watchman']], habits: ['Hunger only fills from "feed" at night.'], note: 'Feed him at night or he starves.' }),
      lockedPlate('Plate II', 'wolfman', ACCENTS['wolfman']!),
    ),
    h('p', { class: 'sg-note' }, `Built from a live game (seed ${game.options.seed}) where the views need one.`),
  ];
}

/* ---------- icons, figures, furniture ---------- */

function icons(): VNode {
  return h('ul', { class: 'sg-icons' }, (Object.keys(ICONS) as IconName[]).map((n) => h('li', null, icon(n, 28), h('code', null, n))));
}

const POSES: Pose[] = ['idle', 'walk', 'act', 'asleep'];
const STYLES: FigureStyle[] = ['stage', 'plate', 'shadow'];

function figures(): VNode {
  return h(
    'div',
    { class: 'sg-figures' },
    [...PLAYABLE, 'fledgling'].map((a) =>
      h(
        'div',
        { class: 'sg-figure-row' },
        h('h4', null, a),
        STYLES.flatMap((style) =>
          POSES.map((pose) =>
            h(
              'figure',
              { class: `sg-figure sg-${style}` },
              canvas(76, 76, (c) => {
                const fh = figureHeight(a);
                const s = 58 / Math.max(fh, 40);
                c.translate(38, pose === 'asleep' ? 60 : 72);
                c.scale(s, s);
                drawFigure(c, a, { pose, t: 12, accent: ACCENTS[a] ?? '#999999', style, motion: false });
              }, `${a}, ${pose}, ${style}`),
              h('figcaption', null, `${pose} · ${style}`),
            ),
          ),
        ),
      ),
    ),
  );
}

function furniture(): VNode {
  const ids = [...Object.keys(FURNITURE), ...Object.keys(FIXTURES)];
  return h('ul', { class: 'sg-icons sg-furniture' }, ids.map((id) => h('li', null, canvas(72, 72, (c) => drawItemIcon(c, id, 72), id), h('code', null, id))));
}

/* ---------- stage ---------- */

function sceneOf(state: GameState, phase: Scene['phase'], extra: Partial<Scene> = {}): Scene {
  return {
    phase,
    daylight: daylight(phase),
    moon: moonPhase(Math.max(1, state.night)),
    seed: state.options.seed,
    valley: state.options.setting === 'valley',
    rooms: state.house.rooms.map((r) => ({ id: r.id, name: r.name, lit: phase === 'night' && r.lit, exposure: 0, secretPassage: r.secretPassage, windows: r.windows })),
    furniture: state.house.furniture,
    sprites: spriteStates(state, phase),
    lightningRod: state.house.lightningRod,
    lightningLovers: false,
    defences: state.house.defences,
    suspicion: state.village.suspicion,
    mobGathering: false,
    hunterPresent: false,
    ...extra,
  };
}

function stage(manor: GameState, valley: GameState): VNode {
  const variants: Array<[string, Scene]> = [
    ['Dusk', sceneOf(manor, 'dusk')],
    ['Night', sceneOf(manor, 'night')],
    ['Day', sceneOf(manor, 'day')],
    ['Mob, hunter and every defence', sceneOf(manor, 'night', { mobGathering: true, hunterPresent: true, suspicion: 94, moon: 'full', defences: { drawbridge: true, fogMachine: true, decoyCoffins: true, organ: true } })],
    ['The valley', sceneOf(valley, 'night')],
  ];
  const w = 480;
  const hgt = (w * STAGE_H) / STAGE_W;
  return h(
    'div',
    { class: 'sg-stages' },
    variants.map(([label, scene]) =>
      h(
        'figure',
        { class: 'sg-stage' },
        canvas(w, hgt, (c) => {
          c.scale(w / STAGE_W, w / STAGE_W);
          drawScene(c, scene, 0, { grain: false, motion: false });
        }, label),
        h('figcaption', null, label),
      ),
    ),
    h(
      'figure',
      { class: 'sg-stage' },
      canvas(w, hgt, (c) => {
        c.scale(w / STAGE_W, w / STAGE_W);
        drawScene(c, sceneOf(manor, 'night'), 0, { grain: false, motion: false });
        drawCard(c, STAGE_W, STAGE_H, { title: 'Night 7', subtitle: 'the moon is full', alpha: 1 });
      }, 'Title card'),
      h('figcaption', null, 'Title card'),
    ),
  );
}

/* ---------- page ---------- */

function build(): VNode[] {
  const manor = createGame({ seed: 42, household: ['count', 'wolfman', 'golem', 'mummy', 'invisible'] });
  runNight(manor, planForNight(DEFAULT_PLAN, 1));
  const valley = createGame({ seed: 7, setting: 'valley', household: [...VALLEY_HOUSEHOLD] });
  runNight(valley, { night: { gwyllgi: 'feed', cwnannwn: 'sleep', gwrach: 'lieLow' } });
  const toc: Array<[string, string]> = [['colour', 'Colour'], ['scales', 'Scales'], ['components', 'Components'], ['icons', 'Icons'], ['figures', 'Residents'], ['furniture', 'Furniture'], ['stage', 'Stage']];
  return [
    h('header', { class: 'sg-head' }, h('div', { class: 'wordmark' }, h('span', { class: 'wm-1' }, 'Monster'), h('span', { class: 'wm-2' }, 'Manor')), h('p', { class: 'meta' }, 'Style guide · generated from the code the game runs'), h('a', { class: 'guide-link', href: './index.html' }, 'Back to the game')),
    h('nav', { class: 'sg-toc', 'aria-label': 'Sections' }, toc.map(([id, label]) => h('a', { href: `#${id}` }, label))),
    section('colour', 'Tokens', 'Colour', 'Primitives in src/web/design/tokens.ts feed colour roles per theme; components only use roles. Text roles show their contrast on the theme surface.', h('div', { class: 'sg-themes' }, (Object.keys(THEMES) as ThemeName[]).map(themePanel)), h('h3', null, 'Resident accents'), accents()),
    section('scales', 'Tokens', 'Scales', 'Every font size, padding, margin, gap and transition in styles.css comes from these; the design lint enforces it.', ...scales()),
    section('components', 'Kit', 'Components', 'src/web/kit/components.ts. Each returns a view tree with its own ARIA.', ...components(manor)),
    section('icons', 'Kit', 'Icons', '24-unit line icons, one stroke weight, square caps, a slight lean. Always beside a text label.', icons()),
    section('figures', 'Art', 'Residents', 'Every archetype in every pose (idle, walk, act, asleep) and style (stage, plate, shadow).', figures()),
    section('furniture', 'Art', 'Furniture and fixtures', 'The same drawers paint the stage and the build catalogue.', furniture()),
    section('stage', 'Art', 'Stage', 'drawScene() for representative nights, with animation and grain off.', stage(manor, valley)),
  ];
}

const root = document.getElementById('guide');
if (root) mount(root, ...build());
