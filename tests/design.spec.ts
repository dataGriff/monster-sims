import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALARM, BONE, INK, LAMP, WARN } from '../src/web/art/palette.ts';
import { BREAKPOINTS, MOTION, PRIMITIVES, THEMES, TYPE, buildTokensCss, motion, type MotionKey } from '../src/web/design/tokens.ts';
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
    const undefinedVars = [...usedVars(styles)].filter((v) => !defined.has(v) && v !== '--accent');
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
});
