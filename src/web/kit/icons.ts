/**
 * The icon set (MM-47): 24 × 24 line icons in the house style. One stroke
 * weight, square caps, mitred joins and a slight lean, in keeping with the
 * art direction. Icons always sit beside a text label and are hidden from
 * assistive technology; they never carry meaning on their own.
 */
import type { ActionKind, NeedKey } from '../../sim/types.ts';
import { h, type VNode } from './h.ts';

export const STROKE = 1.7;
/** Horizontal lean, in degrees, applied to every icon. */
export const LEAN_DEG = -6;

export type IconName = NeedKey | ActionKind | 'idle' | 'coin' | 'rod' | 'rodDown' | 'hunter' | 'allies';

/** Path data per icon, absolute or relative commands on a 24-unit grid. */
export const ICONS: Record<IconName, readonly string[]> = {
  hunger: ['M4 10h16l-2 6a4 4 0 0 1-4 3h-4a4 4 0 0 1-4-3z', 'M9 4v3M12 3v4M15 4v3'],
  energy: ['M13 2 5 13h6l-2 9 8-11h-6z'],
  social: ['M5 8a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M3 20c0-3 2.2-5 5-5s5 2 5 5', 'M14 9a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0', 'M14 15.5c3-.8 6 .6 7 4.5'],
  fun: ['M5 5h14v14H5z', 'M8.6 8.6h.01M15.4 15.4h.01M12 12h.01M15.4 8.6h.01M8.6 15.4h.01'],
  hygiene: ['M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z', 'M9.5 15a2.5 2.5 0 0 0 2.5 2.5'],
  comfort: ['M6 11V7h12v4', 'M3 11h4v4h10v-4h4v6H3z', 'M5 17v3M19 17v3'],
  bladder: ['M5 9h14l-1.5 9a2 2 0 0 1-2 1.5h-7a2 2 0 0 1-2-1.5z', 'M18.6 11h1.4a2 2 0 0 1 0 4h-1.9', 'M4 9h16'],
  anger: ['M12 2l2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2z'],
  feed: ['M7 3h10l-1 6a4 4 0 0 1-8 0z', 'M12 13v6M8 21h8'],
  sleep: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  socialise: ['M4 5h16v10H10l-5 4v-4H4z', 'M8 10h.01M12 10h.01M16 10h.01'],
  coverJob: ['M3 8h18v11H3z', 'M9 8V5h6v3', 'M3 13h18'],
  repair: ['M14 3l7 7-3 3-7-7z', 'M12.5 8.5 3 18l3 3 9.5-9.5'],
  lieLow: ['M4 4h16v16H4z', 'M4 4c3.5 4 3.5 12 0 16M20 4c-3.5 4-3.5 12 0 16', 'M12 4v16'],
  gameNight: ['M4 7l7-2 3.5 13-7 2z', 'M13.5 5H20v14h-3', 'M8 11h.01'],
  idle: ['M7 3h10M7 21h10', 'M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9'],
  coin: ['M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z', 'M12 8v8M9.5 10h5'],
  rod: ['M12 21V7', 'M8 11l4-4 4 4', 'M10 3h4'],
  rodDown: ['M12 21v-7l-5-4', 'M5 6l3 3'],
  hunter: ['M9 7h6v10H9z', 'M12 4v3M10 4h4', 'M9 17l-1 3h8l-1-3', 'M12 10v4'],
  allies: ['M2 11l5-4 5 3 5-3 5 4', 'M6 12l4 4 2-1 2 1 4-4'],
};

export function hasIcon(name: string): name is IconName {
  return name in ICONS;
}

/** An inline SVG icon, `size` CSS pixels square, drawn in currentColor. */
export function icon(name: IconName, size = 14): VNode {
  return h(
    'svg',
    {
      class: `icon-line icon-${name}`,
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      'aria-hidden': 'true',
      focusable: 'false',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': STROKE,
      'stroke-linecap': 'square',
      'stroke-linejoin': 'miter',
    },
    h('g', { transform: `translate(1.3 0) skewX(${LEAN_DEG})` }, ICONS[name].map((d) => h('path', { d }))),
  );
}
