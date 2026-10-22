/**
 * The component kit (MM-46). Every piece of interface is built from these;
 * they return VNodes, carry their own ARIA, and use only the classes styled
 * in styles.css. See docs/design-system.md.
 */
import { drawFigure, figureHeight, type FigureStyle } from '../art/figures.ts';
import { drawItemIcon } from '../art/furniture.ts';
import { BONE, INK, withAlpha } from '../art/palette.ts';
import { moonPath, type MoonPhase } from '../art/scenery.ts';
import { h, type Child, type Handler, type VNode } from './h.ts';

export type Tone = 'calm' | 'warn' | 'alarm';

/** Small uppercase label above a heading. */
export function eyebrow(text: string): VNode {
  return h('p', { class: 'eyebrow' }, text);
}

/** Eyebrow + heading, the standard panel title. */
export function panelTitle(kicker: string, title: string, level: 'h2' | 'h3' = 'h2'): VNode[] {
  return [eyebrow(kicker), h(level, null, title)];
}

export interface MeterProps {
  label: string;
  value: number;
  max?: number;
  tone?: Tone;
  critical?: boolean;
  /** Visually distinguishes meters where high is bad (anger). */
  inverted?: boolean;
  icon?: VNode;
}

/** A labelled bar: label, track, value. Used for needs and household anger. */
export function meter(p: MeterProps): VNode {
  const max = p.max ?? 100;
  const pct = Math.max(0, Math.min(100, (p.value / max) * 100));
  return h(
    'div',
    { class: `need${p.critical ? ' critical' : ''}` },
    h('span', { class: 'need-label' }, p.icon ?? null, p.label),
    h(
      'div',
      { class: 'track', role: 'meter', 'aria-label': p.label, 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': p.value },
      h('div', { class: `fill ${p.tone ?? 'calm'}${p.inverted ? ' inverted' : ''}`, style: { width: `${pct}%` } }),
    ),
    h('span', { class: 'need-value' }, String(p.value)),
  );
}

export interface Zone {
  from: number;
  to: number;
  className: string;
  mark?: string;
}

export interface GaugeProps {
  title: string;
  value: number;
  tone: Tone;
  zones: Zone[];
  caption: string;
  /** Spoken description, e.g. "Suspicion 42 of 100, gossip". */
  label: string;
}

/** A large zoned gauge with threshold marks, used for Suspicion. */
export function gauge(p: GaugeProps): VNode {
  return h(
    'div',
    { class: 'gauge suspicion' },
    h('div', { class: 'gauge-head' }, h('span', { class: 'gauge-title' }, p.title), h('span', { class: `gauge-value ${p.tone}` }, String(p.value))),
    h(
      'div',
      { class: 'gauge-track', role: 'meter', 'aria-label': p.label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': p.value },
      p.zones.map((z) => h('div', { class: `zone ${z.className}`, style: { left: `${z.from}%`, width: `${z.to - z.from}%` } })),
      h('div', { class: `gauge-fill ${p.tone}`, style: { width: `${Math.max(0, Math.min(100, p.value))}%` } }),
    ),
    h('div', { class: 'gauge-marks', 'aria-hidden': 'true' }, p.zones.filter((z) => z.mark).map((z) => h('span', { style: { left: `${z.from}%` } }, z.mark!))),
    h('p', { class: `mood ${p.tone}` }, p.caption),
  );
}

export function chip(text: string, tone: 'bad' | 'warn' | 'good' | '' = '', icon?: VNode): VNode {
  return h('li', tone ? { class: tone } : null, icon ?? null, text);
}

export function chips(items: VNode[]): VNode {
  return h('ul', { class: 'chips' }, items);
}

export interface TileOption<T extends string | null> {
  value: T;
  label: string;
  icon?: VNode;
}

export interface TileGroupProps<T extends string | null> {
  name: string;
  label: string;
  options: Array<TileOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

/** A radio group drawn as tiles. Native radios stay in the tree for keyboard and screen readers. */
export function tileGroup<T extends string | null>(p: TileGroupProps<T>): VNode {
  return h(
    'div',
    { class: 'tiles', role: 'radiogroup', 'aria-label': p.label },
    p.options.map((o) => {
      const id = `${p.name}-${o.value ?? 'none'}`;
      return h(
        'span',
        { class: 'tile' },
        h('input', { type: 'radio', name: p.name, id, value: o.value ?? '', checked: p.value === o.value, onChange: () => p.onChange(o.value) }),
        h('label', { for: id }, o.icon ?? null, o.label),
      );
    }),
  );
}

export function toggle(id: string, label: string, checked: boolean, onChange: (on: boolean) => void): VNode {
  return h(
    'div',
    { class: 'setting' },
    h('input', { type: 'checkbox', id, checked, onChange: (ev: Event) => onChange((ev.target as HTMLInputElement).checked) }),
    h('label', { for: id }, label),
  );
}

export interface SelectProps {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  /** Show the label as text before the control, or only to assistive tech. */
  visibleLabel?: boolean;
}

export function select(p: SelectProps): VNode {
  const control = h(
    'select',
    { id: p.id, ...(p.visibleLabel ? {} : { 'aria-label': p.label }), value: p.value, onChange: (ev: Event) => p.onChange((ev.target as HTMLSelectElement).value) },
    p.options.map((o) => h('option', { value: o.value, selected: o.value === p.value }, o.label)),
  );
  return p.visibleLabel ? h('div', { class: 'setting' }, h('label', { for: p.id }, p.label), control) : control;
}

export interface ButtonProps {
  label: string;
  onClick: Handler;
  primary?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export function button(p: ButtonProps): VNode {
  return h('button', { type: 'button', class: p.primary ? 'primary' : undefined, disabled: p.disabled, 'aria-label': p.ariaLabel, onClick: p.onClick }, p.label);
}

export interface StoryCardProps {
  id: string;
  title: string;
  choices: Array<{ id: string; label: string }>;
  value: string;
  onChange: (choice: string) => void;
}

/** A story event on a paper card, with its branches as radios. */
export function storyCard(p: StoryCardProps): VNode {
  return h(
    'fieldset',
    { class: 'story' },
    h('legend', null, p.title),
    p.choices.map((c) => {
      const id = `choice-${p.id}-${c.id}`;
      return h(
        'div',
        { class: 'choice' },
        h('input', { type: 'radio', name: `choice-${p.id}`, id, value: c.id, checked: p.value === c.id, onChange: () => p.onChange(c.id) }),
        h('label', { for: id }, c.label),
      );
    }),
  );
}

export interface CatalogueItemProps {
  id: string;
  name: string;
  cost: number;
  blurb: string;
  owned: boolean;
  affordable: boolean;
  checked: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}

/** A build-catalogue tile: drawn icon, name, cost; a checkbox underneath. */
export function catalogueItem(p: CatalogueItemProps): VNode {
  const id = `buy-${p.id}`;
  const cls = ['item', p.owned ? 'owned' : '', p.affordable ? '' : 'dear'].filter(Boolean).join(' ');
  return h(
    'div',
    { class: 'item-wrap' },
    h('input', { type: 'checkbox', id, checked: p.checked, disabled: p.disabled, onChange: (ev: Event) => p.onChange((ev.target as HTMLInputElement).checked) }),
    h(
      'label',
      { for: id, class: cls, title: p.blurb },
      itemCanvas(p.id, 42),
      h('span', { class: 'item-name' }, p.name),
      h('span', { class: 'item-cost' }, p.owned ? 'owned' : `${p.cost} coin`),
    ),
  );
}

/* ---------- drawn pieces ---------- */

function sizeCanvas(el: Element, size: number): CanvasRenderingContext2D | null {
  const canvas = el as HTMLCanvasElement;
  const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const c = canvas.getContext('2d');
  c?.scale(dpr, dpr);
  return c;
}

/** A resident's portrait: their stage figure on a roundel, or a plate engraving for the bestiary. */
export function portrait(archetype: string, accent: string, size: number, style: FigureStyle = 'stage', label = ''): VNode {
  return h('canvas', {
    class: `portrait portrait-${style}`,
    ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }),
    'data-archetype': archetype,
    draw: (el: Element) => {
      const c = sizeCanvas(el, size);
      if (!c) return;
      if (style === 'stage') {
        const g = c.createRadialGradient(size / 2, size * 0.45, 2, size / 2, size / 2, size * 0.7);
        g.addColorStop(0, withAlpha(accent, 0.3));
        g.addColorStop(1, withAlpha(INK, 0));
        c.fillStyle = g;
        c.fillRect(0, 0, size, size);
      }
      const fh = figureHeight(archetype);
      const scale = (size * 0.82) / Math.max(fh, 40);
      c.translate(size / 2 - (archetype === 'gwyllgi' || archetype === 'cwnannwn' ? 4 * scale : 0), size * 0.94);
      c.scale(scale, scale);
      drawFigure(c, archetype, { pose: 'idle', t: 0, accent, style, motion: false });
    },
  });
}

export function itemCanvas(id: string, size: number): VNode {
  return h('canvas', {
    class: 'icon',
    'aria-hidden': 'true',
    'data-item': id,
    draw: (el: Element) => {
      const c = sizeCanvas(el, size);
      if (c) drawItemIcon(c, id, size);
    },
  });
}

/** The HUD moon, drawn with the same geometry as the sky. */
export function moonIcon(phase: MoonPhase, size: number): VNode {
  const r = 12;
  return h(
    'svg',
    { viewBox: `0 0 ${r * 2} ${r * 2}`, width: size, height: size, class: 'moon', 'aria-hidden': 'true' },
    h('circle', { cx: r, cy: r, r, fill: '#2a2933' }),
    h('path', { d: moonPath(phase, r), fill: phase === 'full' ? '#efe6cd' : BONE }),
  );
}

export interface PlateProps {
  number: string;
  accent: string;
  archetype: string;
  name: string;
  binomial: string;
  facts: Array<[string, string]>;
  habits: string[];
  note: string;
}

/** A field-guide plate. */
export function plate(p: PlateProps): VNode {
  return h(
    'article',
    { class: 'plate', style: { '--accent': p.accent } },
    h('p', { class: 'plate-no' }, p.number),
    h('div', { class: 'engraving' }, portrait(p.archetype, p.accent, 132, 'plate', `Engraving of ${p.name}`)),
    h('h3', null, p.name),
    h('p', { class: 'latin' }, p.binomial),
    h('dl', { class: 'facts' }, p.facts.map(([k, v]) => [h('dt', null, k), h('dd', null, v)])),
    h('h4', null, 'Habits'),
    h('ul', { class: 'habits' }, p.habits.map((t) => h('li', null, t))),
    h('h4', null, 'Field note'),
    h('p', { class: 'note' }, p.note),
  );
}

export function lockedPlate(number: string, archetype: string, accent: string): VNode {
  return h(
    'article',
    { class: 'plate locked' },
    h('p', { class: 'plate-no' }, number),
    portrait(archetype, accent, 132, 'shadow', 'An unidentified silhouette'),
    h('h3', null, 'Not yet observed'),
    h('p', { class: 'latin' }, 'Species incerta'),
  );
}

export function list(items: Child[], cls?: string): VNode {
  return h('ul', cls ? { class: cls } : null, items.map((i) => h('li', null, i)));
}
