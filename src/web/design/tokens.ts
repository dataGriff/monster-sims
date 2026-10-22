/**
 * Design tokens: the single source of truth for the interface and the
 * canvas (MM-43). `pnpm tokens` writes `tokens.css` from this file; the
 * canvas palette (`../art/palette.ts`) imports its primitives from here.
 *
 * Two layers:
 *  - primitives: the raw palette, named for what they look like;
 *  - roles: what a colour is for (surface, muted text, alarm fill…), per theme.
 * Components only ever use roles.
 */

/** The raw palette. Canvas art may use these directly. */
export const PRIMITIVES = {
  ink: '#0e0e12',
  soot: '#17171d',
  charcoal: '#222129',
  slate: '#34333d',
  ash: '#5b5966',
  pewter: '#8c8896',
  bone: '#d8d0bc',
  paper: '#ece5d3',
  sepia: '#2b2219',
  sepiaWash: '#7d6a50',
  platePaper: '#e9e0c8',
  lamp: '#f2c46b',
  warn: '#e3a33a',
  alarm: '#d0453b',
} as const;

export type ThemeName = 'night' | 'paper' | 'contrast';

export const THEME_LABELS: Record<ThemeName, string> = {
  night: 'Night',
  paper: 'Paper',
  contrast: 'High contrast',
};

/** Colour roles. Every one exists in every theme. */
export interface ThemeColours {
  /** Page background and its glow at the top. */
  bg: string;
  bgGlow: string;
  /** Panels, the bottom of their gradient, and popovers. */
  surface: string;
  surfaceEnd: string;
  raised: string;
  /** Wells: meter tracks, inputs, the stage frame. */
  sunken: string;
  text: string;
  textMuted: string;
  textStrong: string;
  /** Text on a filled `text`-coloured button. */
  textInverse: string;
  rule: string;
  ruleStrong: string;
  /** Lamplight: the one warm light, and selection. */
  lamp: string;
  focus: string;
  /** Fills (bars, borders) and text variants that pass AA on surfaces. */
  calm: string;
  warn: string;
  warnText: string;
  alarm: string;
  alarmText: string;
  /** Field-guide plates, story cards and tooltips. */
  plate: string;
  plateInk: string;
  plateInkMuted: string;
  plateRule: string;
  plateEdge: string;
  plateHighlight: string;
  plateStain: string;
  /** Locked bestiary plates. */
  locked: string;
  /** Hard drop shadows. */
  shadow: string;
  colorScheme: 'dark' | 'light';
}

export const THEMES: Record<ThemeName, ThemeColours> = {
  night: {
    bg: PRIMITIVES.ink,
    bgGlow: '#1c1a24',
    surface: '#15151b',
    surfaceEnd: '#121218',
    raised: '#1d1d24',
    sunken: PRIMITIVES.ink,
    text: PRIMITIVES.bone,
    textMuted: PRIMITIVES.pewter,
    textStrong: PRIMITIVES.paper,
    textInverse: PRIMITIVES.ink,
    rule: 'rgba(216, 208, 188, 0.14)',
    ruleStrong: 'rgba(216, 208, 188, 0.32)',
    lamp: PRIMITIVES.lamp,
    focus: PRIMITIVES.lamp,
    calm: '#b8b1a0',
    warn: PRIMITIVES.warn,
    warnText: PRIMITIVES.warn,
    alarm: PRIMITIVES.alarm,
    alarmText: '#ec6a5f',
    plate: PRIMITIVES.platePaper,
    plateInk: PRIMITIVES.sepia,
    plateInkMuted: '#6b5a42',
    plateRule: '#b9ab8a',
    plateEdge: '#8f7f5f',
    plateHighlight: 'rgba(255, 255, 255, 0.25)',
    plateStain: 'rgba(120, 90, 50, 0.12)',
    locked: '#1a1a20',
    shadow: 'rgba(0, 0, 0, 0.55)',
    colorScheme: 'dark',
  },
  /** A light, field-guide interface for daytime reading. The stage stays a night world. */
  paper: {
    bg: '#e6dfcc',
    bgGlow: '#f3eee0',
    surface: '#f4efe2',
    surfaceEnd: '#ece5d4',
    raised: '#fbf8f0',
    sunken: '#ddd5c1',
    text: '#1f1b17',
    textMuted: '#5b5448',
    textStrong: '#0e0e12',
    textInverse: '#f4efe2',
    rule: 'rgba(43, 34, 25, 0.18)',
    ruleStrong: 'rgba(43, 34, 25, 0.42)',
    lamp: '#734a00',
    focus: '#734a00',
    calm: '#5f5a4d',
    warn: '#a86a10',
    warnText: '#7f4d00',
    alarm: '#b8352a',
    alarmText: '#9a2a20',
    plate: '#fbf6e8',
    plateInk: PRIMITIVES.sepia,
    plateInkMuted: '#5f4f39',
    plateRule: '#c4b593',
    plateEdge: '#9a8966',
    plateHighlight: 'rgba(255, 255, 255, 0.5)',
    plateStain: 'rgba(120, 90, 50, 0.1)',
    locked: '#d6cdb8',
    shadow: 'rgba(43, 34, 25, 0.3)',
    colorScheme: 'light',
  },
  /** Maximum legibility: pure black and white, strong rules, no translucency. */
  contrast: {
    bg: '#000000',
    bgGlow: '#000000',
    surface: '#000000',
    surfaceEnd: '#000000',
    raised: '#0d0d0d',
    sunken: '#000000',
    text: '#ffffff',
    textMuted: '#dcdcdc',
    textStrong: '#ffffff',
    textInverse: '#000000',
    rule: '#9a9a9a',
    ruleStrong: '#ffffff',
    lamp: '#ffd25e',
    focus: '#ffd25e',
    calm: '#ffffff',
    warn: '#ffb000',
    warnText: '#ffc94d',
    alarm: '#ff5a4f',
    alarmText: '#ff8a80',
    plate: '#ffffff',
    plateInk: '#000000',
    plateInkMuted: '#2e2e2e',
    plateRule: '#000000',
    plateEdge: '#000000',
    plateHighlight: 'rgba(255, 255, 255, 0)',
    plateStain: 'rgba(0, 0, 0, 0)',
    locked: '#111111',
    shadow: '#000000',
    colorScheme: 'dark',
  },
};

/** Which theme to start in: high contrast when the system asks for more contrast. */
export function defaultTheme(prefersMoreContrast: boolean): ThemeName {
  return prefersMoreContrast ? 'contrast' : 'night';
}

export const FONTS = {
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif",
} as const;

/**
 * Type scale (MM-44). Nothing in the interface is set smaller than `2xs`
 * (11.5 px at the default root size); the root size scales with the
 * player's text-size setting.
 */
export const TYPE = {
  root: '16px',
  '2xs': '0.72rem',
  xs: '0.78rem',
  sm: '0.85rem',
  base: '0.95rem',
  md: '1rem',
  lg: '1.15rem',
  xl: '1.3rem',
  '2xl': '1.65rem',
  display: '2.1rem',
} as const;

/** Spacing scale, named by its size in pixels: `--space-10` is 10 px. */
export const SPACE = {
  1: '1px',
  2: '2px',
  3: '3px',
  4: '4px',
  6: '6px',
  8: '8px',
  10: '10px',
  12: '12px',
  14: '14px',
  16: '16px',
  18: '18px',
  22: '22px',
  24: '24px',
  40: '40px',
} as const;

/** Page gutter: the side margin at every width. */
export const GUTTER = SPACE[16];

/** Layout breakpoints, in px. Media queries cannot read custom properties, so a test keeps them in step. */
export const BREAKPOINTS = { stack: 1000, narrow: 520 } as const;

/**
 * Motion. CSS reads the durations as custom properties; the client reads
 * the same numbers for its own timings. With animation off every duration
 * becomes zero.
 */
export const MOTION = {
  fast: 120,
  medium: 400,
  slow: 500,
  /** Diary: one line every… */
  revealStep: 420,
  revealStepReduced: 160,
  /** Pause before the first line, while the night's title card shows. */
  revealDelay: 700,
  /** Title cards, in animation frames. */
  cardFade: 18,
  titleHold: 150,
  nightHold: 60,
  newRunHold: 110,
  /** Fraction of the remaining distance the light eases each frame. */
  lightEase: 0.04,
} as const;

export const EASE = { standard: 'ease' } as const;

export type MotionKey = keyof typeof MOTION;

/** A timing in ms (or frames), zeroed when animation is off. */
export function motion(key: MotionKey, animate: boolean): number {
  if (animate) return MOTION[key];
  if (key === 'revealStep') return MOTION.revealStepReduced;
  if (key === 'lightEase') return 1;
  if (key === 'cardFade') return 1;
  return key === 'revealDelay' ? 0 : MOTION[key];
}

/** camelCase role → --kebab-case custom property. */
export function cssName(role: string): string {
  return `--${role.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

function block(selector: string, vars: Record<string, string>): string {
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);
  return `${selector} {\n${lines.join('\n')}\n}\n`;
}

function themeVars(t: ThemeColours): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [role, value] of Object.entries(t)) {
    if (role === 'colorScheme') out['color-scheme'] = value;
    else out[cssName(role)] = value;
  }
  return out;
}

/** The generated stylesheet. Deterministic, so a test can check the file is current. */
export function buildTokensCss(): string {
  const parts = [
    '/* Generated by `pnpm tokens` from src/web/design/tokens.ts. Do not edit by hand. */\n',
  ];
  for (const [name, colours] of Object.entries(THEMES) as Array<[ThemeName, ThemeColours]>) {
    const selector = name === 'night' ? `:root,\n[data-theme='night']` : `[data-theme='${name}']`;
    parts.push(block(selector, themeVars(colours)));
  }
  const scales: Record<string, string> = { '--font-serif': FONTS.serif };
  for (const [k, v] of Object.entries(TYPE)) scales[`--text-${k}`] = v;
  for (const [k, v] of Object.entries(SPACE)) scales[`--space-${k}`] = v;
  scales['--gutter'] = GUTTER;
  for (const k of ['fast', 'medium', 'slow'] as const) scales[`--dur-${k}`] = `${MOTION[k]}ms`;
  scales['--ease-standard'] = EASE.standard;
  parts.push(block(':root', scales));
  parts.push(block('.reduce-motion', { '--dur-fast': '0ms', '--dur-medium': '0ms', '--dur-slow': '0ms' }));
  return parts.join('\n');
}
