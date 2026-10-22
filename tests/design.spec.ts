import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALARM, BONE, INK, LAMP, WARN, contrast, onAccent } from '../src/web/art/palette.ts';
import { PLAYABLE } from '../src/sim/monsters.ts';
import { ACCENTS } from '../src/web/viewmodel.ts';
import { BREAKPOINTS, MOTION, PRIMITIVES, THEMES, TYPE, buildTokensCss, defaultTheme, motion, type MotionKey, type ThemeName } from '../src/web/design/tokens.ts';
import { RAW_COLOUR, ROOT, declarations, definedVars, readCss, usedVars } from './css.ts';

const styles = readCss('src/web/styles.css');
const rem = (v: string) => (v.endsWith('rem') ? parseFloat(v) : parseFloat(v) / 16);
const tokensCss = readCss('src/web/design/tokens.css');

describe('Feature: Design framework', () => {
  it('Scenario: The generated token stylesheet is current', () => {
    const onDisk = readFileSync(join(ROOT, 'src/web/design/tokens.css'), 'utf8');
    expect(onDisk, 'run `pnpm tokens` and commit the result').toBe(buildTokensCss());
  });

  it('Scenario: The stylesheet uses tokens for every colour', () => {
    const offenders = declarations(styles)
      .filter((d) => !d.prop.startsWith('--') && RAW_COLOUR.test(d.value))
      .map((d) => `${d.selector} { ${d.prop}: ${d.value} }`);
    expect(offenders).toEqual([]);
    const defined = new Set([...definedVars(tokensCss), ...definedVars(styles)]);
    // --accent and --on-accent are set inline per resident
    const undefinedVars = [...usedVars(styles)].filter((v) => !defined.has(v) && v !== '--accent' && v !== '--on-accent');
    expect(undefinedVars).toEqual([]);
  });

  it('Scenario: The canvas and the interface share one palette', () => {
    expect([INK, BONE, LAMP, WARN, ALARM]).toEqual([PRIMITIVES.ink, PRIMITIVES.bone, PRIMITIVES.lamp, PRIMITIVES.warn, PRIMITIVES.alarm]);
    expect(THEMES.night.text).toBe(PRIMITIVES.bone);
    expect(THEMES.night.bg).toBe(PRIMITIVES.ink);
    expect(THEMES.night.lamp).toBe(PRIMITIVES.lamp);
  });

  it('Scenario: Sizes and timings come from the scales', () => {
    const decls = declarations(styles).filter((d) => !d.prop.startsWith('--'));
    const badType = decls.filter((d) => d.prop === 'font-size' && !/^var\(--text-[a-z0-9]+\)$/.test(d.value));
    expect(badType.map((d) => `${d.selector}: ${d.value}`)).toEqual([]);
    const spacing = /^(padding|margin|gap|row-gap|column-gap)(-(top|right|bottom|left|inline|block))?$/;
    const okPart = /^(0|auto|var\(--(space-\d+|gutter)\))$/;
    const badSpace = decls.filter((d) => spacing.test(d.prop) && !d.value.split(/\s+/).every((t) => okPart.test(t)));
    expect(badSpace.map((d) => `${d.selector} { ${d.prop}: ${d.value} }`)).toEqual([]);
    const badMotion = decls.filter((d) => d.prop === 'transition' && /\d+m?s\b/.test(d.value));
    expect(badMotion.map((d) => d.value)).toEqual([]);
    const steps = Object.entries(TYPE).filter(([k]) => k !== 'root').map(([, v]) => rem(v));
    expect(Math.min(...steps)).toBeGreaterThanOrEqual(0.72);
    const widths = [...styles.matchAll(/@media \(max-width: (\d+)px\)/g)].map((m) => Number(m[1]));
    expect(widths.toSorted((a, b) => a - b)).toEqual(Object.values(BREAKPOINTS).toSorted((a, b) => a - b));
  });

  it("Scenario: The client's timings come from the motion tokens", () => {
    const main = readFileSync(join(ROOT, 'src/web/main.ts'), 'utf8');
    expect(main).not.toMatch(/setTimeout\([^)]*\b\d{2,}\b/);
    expect(main).not.toMatch(/showCard\([\s\S]*?\}, \d+\)/);
    for (const key of Object.keys(MOTION) as MotionKey[]) {
      const off = motion(key, false);
      if (key === 'lightEase' || key === 'cardFade') expect(off, key).toBe(1);
      else if (key === 'revealStep') expect(off, key).toBeLessThan(MOTION.revealStep);
      else if (key === 'revealDelay') expect(off, key).toBe(0);
    }
    expect(tokensCss).toMatch(/\.reduce-motion \{[^}]*--dur-fast: 0ms/);
  });

  it('Scenario: Keyboard focus is always visible', () => {
    const focus = declarations(styles).filter((d) => d.selector === ':focus-visible' && d.prop === 'outline');
    expect(focus).toHaveLength(1);
    const hidden = declarations(styles).filter((d) => d.prop === 'opacity' && d.value === '0' && d.selector.endsWith(' input'));
    for (const h of hidden) {
      const base = h.selector.replace(/ input$/, ' input:focus-visible');
      expect(styles.includes(base), `${h.selector} needs a :focus-visible style`).toBe(true);
    }
  });

  it('Scenario: Every theme meets WCAG AA', () => {
    const failures: string[] = [];
    const check = (theme: string, fg: string, fgName: string, bg: string, bgName: string, min: number) => {
      const ratio = contrast(fg, bg);
      if (ratio < min) failures.push(`${theme}: ${fgName} on ${bgName} is ${ratio.toFixed(2)} (needs ${min})`);
    };
    for (const [name, t] of Object.entries(THEMES)) {
      const surfaces = { bg: t.bg, surface: t.surface, surfaceEnd: t.surfaceEnd, raised: t.raised, sunken: t.sunken };
      const texts = { text: t.text, textMuted: t.textMuted, textStrong: t.textStrong, warnText: t.warnText, alarmText: t.alarmText, lamp: t.lamp };
      for (const [fn, fg] of Object.entries(texts)) for (const [bn, bg] of Object.entries(surfaces)) check(name, fg, fn, bg, bn, 4.5);
      check(name, t.textInverse, 'textInverse', t.text, 'text (button fill)', 4.5);
      check(name, t.plateInk, 'plateInk', t.plate, 'plate', 4.5);
      check(name, t.plateInkMuted, 'plateInkMuted', t.plate, 'plate', 4.5);
      check(name, t.plate, 'plate (legend text)', t.plateInk, 'plateInk', 4.5);
      for (const [bn, bg] of Object.entries(surfaces)) check(name, t.focus, 'focus', bg, bn, 3);
      for (const fill of ['calm', 'warn', 'alarm'] as const) check(name, t[fill], fill, t.sunken, 'sunken', 3);
    }
    expect(failures).toEqual([]);
  });

  it("Scenario: Text on a resident's accent is always legible", () => {
    for (const a of PLAYABLE) {
      const accent = ACCENTS[a]!;
      expect(contrast(onAccent(accent), accent), a).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('Scenario: Themes are complete and selectable', () => {
    const roles = Object.keys(THEMES.night).toSorted();
    for (const [name, t] of Object.entries(THEMES)) expect(Object.keys(t).toSorted(), name).toEqual(roles);
    for (const name of Object.keys(THEMES) as ThemeName[]) expect(tokensCss).toContain(`[data-theme='${name}']`);
    expect(defaultTheme(true)).toBe('contrast');
    expect(defaultTheme(false)).toBe('night');
  });
});
