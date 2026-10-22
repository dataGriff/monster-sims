/**
 * Pure views (MM-46): state in, VNode tree out. The client mounts them;
 * tests render them in Node and check names, values and states.
 */
import { CATALOGUE } from '../sim/build.ts';
import { createArchetype, PLAYABLE } from '../sim/monsters.ts';
import { getQuirk } from '../sim/quirks.ts';
import { pendingStory, type Story } from '../sim/stories.ts';
import { ACTION_KINDS, type ActionKind, type Archetype, type Event as SimEvent, type GameState } from '../sim/types.ts';
import { THRESHOLDS } from '../sim/village.ts';
import { PLATES, romanNumeral } from './art/bestiary.ts';
import { BONE, onAccent } from './art/palette.ts';
import { THEME_LABELS, type ThemeName } from './design/tokens.ts';
import { fragment, h, type VNode } from './kit/h.ts';
import { button, catalogueItem, chip, chips, eyebrow, gauge, lockedPlate, meter, moonIcon, panelTitle, plate, portrait, select, storyCard, tileGroup, toggle, type Tone } from './kit/components.ts';
import { ACCENTS, hudModel, riskHints, type Hud } from './viewmodel.ts';

export interface Draft {
  night: Record<string, ActionKind | null>;
  day: Record<string, ActionKind | null>;
  build: string[];
  choices: Record<string, string>;
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

/** What story would fire if this draft were confirmed: a clone at dusk with the assignments applied. */
export function previewStory(state: GameState, d: Draft): Story | undefined {
  const clone = structuredClone(state);
  clone.night += 1;
  for (const m of clone.monsters) m.assignedAction = d.night[m.id] ?? null;
  return pendingStory(clone);
}

/* ---------- header and settings ---------- */

export interface Keys {
  run: string;
  skip: string;
  focusPlan: string;
}

export interface Settings {
  scale: number;
  keys: Keys;
  grain: boolean;
  motion: boolean;
  theme: ThemeName;
}

export interface HeaderCallbacks {
  /** Settings changed; re-apply and re-render. */
  onChange: () => void;
  /** Wait for the next key and assign it to `name`. */
  onRemap: (name: keyof Keys) => void;
}

export function headerView(meta: string, s: Settings, cb: HeaderCallbacks): VNode {
  const keyRow = (name: keyof Keys, label: string): VNode => {
    const current = s.keys[name] === ' ' ? 'space' : s.keys[name];
    return h(
      'div',
      { class: 'setting' },
      h('span', null, label),
      h('kbd', null, current),
      button({ label: 'remap', ariaLabel: `Remap key for ${label}, currently ${current}`, onClick: () => cb.onRemap(name) }),
    );
  };
  return fragment(
    h('div', { class: 'wordmark' }, h('span', { class: 'wm-1' }, 'Monster'), h('span', { class: 'wm-2' }, 'Manor')),
    h('p', { class: 'meta' }, meta),
    h('a', { class: 'guide-link', href: './styleguide.html' }, 'Style guide'),
    h(
      'details',
      { class: 'settings' },
      h('summary', null, 'Settings'),
      h(
        'div',
        { class: 'settings-panel' },
        h(
          'div',
          { class: 'setting' },
          h('span', null, 'Text size'),
          button({ label: 'A−', ariaLabel: 'Smaller text', onClick: () => ((s.scale = Math.max(0.8, Math.round((s.scale - 0.1) * 10) / 10)), cb.onChange()) }),
          button({ label: 'A+', ariaLabel: 'Larger text', onClick: () => ((s.scale = Math.min(1.8, Math.round((s.scale + 0.1) * 10) / 10)), cb.onChange()) }),
        ),
        select({
          id: 'setting-theme',
          label: 'Theme',
          visibleLabel: true,
          value: s.theme,
          options: Object.entries(THEME_LABELS).map(([value, label]) => ({ value, label })),
          onChange: (v) => ((s.theme = v as ThemeName), cb.onChange()),
        }),
        toggle('setting-grain', 'Film grain and vignette', s.grain, (on) => ((s.grain = on), cb.onChange())),
        toggle('setting-motion', 'Animation', s.motion, (on) => ((s.motion = on), cb.onChange())),
        keyRow('run', 'Run night'),
        keyRow('skip', 'Skip animation'),
        keyRow('focusPlan', 'Focus plan'),
      ),
    ),
  );
}

/* ---------- HUD ---------- */

const MOOD_WORDS: Record<Hud['mood'], string> = { calm: 'The village sleeps', gossip: 'Gossip', snooping: 'A hunter in town', mob: 'The mob gathers', mobAtDoor: 'At the door' };

function needTone(key: string, v: number): Tone {
  if (key === 'anger') return v >= 60 ? 'alarm' : v >= 30 ? 'warn' : 'calm';
  return v < 20 ? 'alarm' : v < 40 ? 'warn' : 'calm';
}

export function hudView(state: GameState): VNode {
  const hud = hudModel(state);
  const v = hud.suspicion;
  const tone: Tone = v >= THRESHOLDS.mob ? 'alarm' : v >= THRESHOLDS.snooping ? 'warn' : 'calm';
  const tonight = Math.min(hud.night + (hud.status === 'running' ? 1 : 0), hud.nightsToSurvive);
  const angerTone: Tone = hud.householdAnger >= 80 ? 'alarm' : hud.householdAnger >= 60 ? 'warn' : 'calm';
  return fragment(
    h(
      'div',
      { class: 'hud-head' },
      h('div', null, ...panelTitle(hud.status === 'running' ? 'Tonight' : 'The run is over', `Night ${tonight} of ${hud.nightsToSurvive}`)),
      h('div', { class: 'moon-box', title: `Moon: ${hud.moon}` }, moonIcon(hud.moon, 34), h('span', null, hud.moon === 'full' ? 'full moon' : `full in ${hud.nextFullMoonIn}`)),
    ),
    h(
      'div',
      { class: 'nights', role: 'img', 'aria-label': `Night ${hud.night} of ${hud.nightsToSurvive} survived` },
      Array.from({ length: hud.nightsToSurvive }, (_, i) => {
        const n = i + 1;
        return h('span', { class: `pip${n <= hud.night ? ' done' : ''}${n % 7 === 0 ? ' fullmoon' : ''}`, title: n % 7 === 0 ? `Night ${n}: full moon` : `Night ${n}` });
      }),
    ),
    gauge({
      title: 'Suspicion',
      value: v,
      tone,
      label: `Suspicion ${v} of 100, ${MOOD_WORDS[hud.mood]}`,
      caption: MOOD_WORDS[hud.mood],
      zones: [
        { from: 0, to: 40, className: 'z-calm' },
        { from: 40, to: 70, className: 'z-gossip', mark: 'gossip' },
        { from: 70, to: 90, className: 'z-hunter', mark: 'hunter' },
        { from: 90, to: 100, className: 'z-mob', mark: 'mob' },
      ],
    }),
    h('div', { class: 'gauge anger' }, meter({ label: 'Household anger', value: hud.householdAnger, tone: angerTone, critical: hud.householdAnger >= 60, inverted: true })),
    chips([
      chip(`${hud.coin} coin`),
      chip(hud.lightningRod ? 'Rod standing' : 'Rod down', hud.lightningRod ? '' : 'bad'),
      hud.hunterPresent ? chip('Hunter in town', 'warn') : null,
      hud.allies.length > 0 ? chip(`${hud.allies.length} ${hud.allies.length === 1 ? 'ally' : 'allies'}`, 'good') : null,
    ].filter((x): x is VNode => x !== null)),
    hud.monsters.map((m) => {
      const archetype = state.monsters.find((x) => x.id === m.id)?.archetype ?? 'fledgling';
      return h(
        'article',
        { class: 'resident', style: { '--accent': m.accent }, 'data-resident': m.id },
        h('header', null, portrait(archetype, m.accent, 44, 'stage'), h('div', null, h('h3', null, m.name), h('p', { class: 'job' }, m.job))),
        h(
          'div',
          { class: 'needs' },
          m.needs.map((n) => meter({ label: n.key, value: n.value, tone: needTone(n.key, n.value), critical: n.critical, inverted: n.key === 'anger' })),
        ),
      );
    }),
  );
}

/* ---------- plan ---------- */

export interface PlanCallbacks {
  onChange: () => void;
  onRun: () => void;
  onNewRun: (seed: number) => void;
}

export function planView(state: GameState, draft: Draft, cb: PlanCallbacks): VNode {
  const ended = state.status !== 'running';
  const rows = ended
    ? []
    : state.monsters.map((m) => {
        const accent = ACCENTS[m.archetype] ?? BONE;
        const current = draft.night[m.id] ?? null;
        const hints = riskHints(state, m, current);
        return h(
          'fieldset',
          { class: 'assign', style: { '--accent': accent, '--on-accent': onAccent(accent) }, 'data-resident': m.id },
          h('legend', null, portrait(m.archetype, accent, 40, 'stage'), h('span', null, m.name)),
          tileGroup<ActionKind | null>({
            name: `act-${m.id}`,
            label: `${m.name} tonight`,
            value: current,
            options: [{ value: null, label: 'Idle' }, ...ACTION_KINDS.map((k) => ({ value: k, label: ACTION_LABELS[k] }))],
            onChange: (k) => ((draft.night[m.id] = k), cb.onChange()),
          }),
          m.daylightActive
            ? h(
                'div',
                { class: 'dayslot' },
                select({
                  id: `day-${m.id}`,
                  label: `${m.name} by day`,
                  value: draft.day[m.id] ?? '',
                  options: [{ value: '', label: 'Sleeps by day' }, ...(['coverJob', 'socialise', 'repair'] as const).map((k) => ({ value: k, label: `By day: ${ACTION_LABELS[k]}` }))],
                  onChange: (v) => ((draft.day[m.id] = (v || null) as ActionKind | null), cb.onChange()),
                }),
              )
            : null,
          h('ul', { class: 'hints' }, hints.map((t) => h('li', null, t))),
        );
      });
  const story = ended ? undefined : previewStory(state, draft);
  let seedValue = state.options.seed;
  const left = h(
    'div',
    { class: 'plan-main' },
    ...panelTitle(ended ? 'Curtain' : 'At dusk', ended ? (state.status === 'won' ? 'The household survived.' : 'The manor has fallen.') : `The plan for night ${state.night + 1}`),
    rows,
    story
      ? storyCard({
          id: story.id,
          title: story.title,
          choices: story.choices.map((c) => ({ id: c.id, label: c.label })),
          value: draft.choices[story.id] ?? story.choices[0]!.id,
          onChange: (c) => ((draft.choices[story.id] = c), cb.onChange()),
        })
      : null,
    h(
      'div',
      { class: 'controls' },
      button({ label: ended ? 'Run over' : 'Run the night', primary: true, disabled: ended, onClick: cb.onRun }),
      h('span', { class: 'spacer' }),
      h('label', { class: 'seed', for: 'new-seed' }, 'Seed'),
      h('input', { type: 'number', id: 'new-seed', class: 'seed-input', value: String(state.options.seed), onChange: (ev: Event) => (seedValue = Number((ev.target as HTMLInputElement).value) || 1) }),
      button({ label: 'New run', onClick: () => cb.onNewRun(seedValue) }),
    ),
  );
  const right = h(
    'div',
    { class: 'plan-build' },
    ...panelTitle('Build', `${state.house.coin} coin to spend`),
    h(
      'div',
      { class: 'catalogue' },
      CATALOGUE.map((item) => {
        const owned = item.kind === 'defence' ? state.house.defences[item.defence!] : item.kind === 'lightningRod' ? state.house.lightningRod : state.house.furniture.some((f) => f.id === item.id && !f.broken);
        return catalogueItem({
          id: item.id,
          name: item.name,
          cost: item.cost,
          blurb: item.blurb,
          owned,
          affordable: item.cost <= state.house.coin,
          checked: draft.build.includes(item.id),
          disabled: ended,
          onChange: (on) => ((draft.build = on ? [...draft.build, item.id] : draft.build.filter((x) => x !== item.id)), cb.onChange()),
        });
      }),
    ),
  );
  return fragment(left, right);
}

/* ---------- diary ---------- */

export function diaryView(events: readonly SimEvent[], reveal: number, accents: ReadonlyMap<string, string> = new Map()): VNode {
  if (events.length === 0) {
    return fragment(eyebrow('The night diary'), h('p', { class: 'empty' }, 'Nothing has happened yet. Make a plan and run the night.'));
  }
  const items: VNode[] = [];
  let phase = '';
  for (const e of events.slice(0, reveal)) {
    if (e.phase !== phase) {
      phase = e.phase;
      items.push(h('li', { class: 'phase' }, `${phase} · night ${e.night}`));
    }
    const accent = e.monsterId ? accents.get(e.monsterId) : undefined;
    items.push(h('li', { class: `entry kind-${e.kind}`, ...(accent ? { style: { '--accent': accent } } : {}) }, e.text));
  }
  return fragment(eyebrow('The night diary'), h('ol', { class: 'entries' }, items));
}

/* ---------- bestiary ---------- */

export function bestiaryView(met: ReadonlySet<Archetype>): VNode {
  return fragment(
    h('header', { class: 'guide-head' }, eyebrow('A field guide to'), h('h2', null, 'The Household Monsters of the Valley'), h('p', { class: 'guide-count' }, `${met.size} of ${PLAYABLE.length} plates observed`)),
    h(
      'div',
      { class: 'plates' },
      PLAYABLE.map((a, i) => {
        const number = `Plate ${romanNumeral(i + 1)}`;
        const accent = ACCENTS[a] ?? BONE;
        if (!met.has(a)) return lockedPlate(number, a, accent);
        const m = createArchetype(a);
        const copy = PLATES[a as keyof typeof PLATES];
        return plate({
          number,
          accent,
          archetype: a,
          name: m.name,
          binomial: copy.binomial,
          facts: [
            ['Habitat', m.bedroom === 'roof' ? 'the roof' : `the ${m.bedroom}`],
            ['By cover', m.coverJob.title],
            ['By day', m.daylightActive ? 'abroad' : 'asleep'],
          ],
          habits: m.quirks.map((q) => getQuirk(q).description),
          note: copy.note,
        });
      }),
    ),
  );
}
