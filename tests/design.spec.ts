import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALARM, BONE, INK, LAMP, WARN } from '../src/web/art/palette.ts';
import { PRIMITIVES, THEMES, buildTokensCss } from '../src/web/design/tokens.ts';
import { RAW_COLOUR, ROOT, declarations, definedVars, readCss, usedVars } from './css.ts';

const styles = readCss('src/web/styles.css');
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
});
