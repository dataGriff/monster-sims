import { afterEach, describe, expect, it } from 'vitest';
import { parseArgs } from '../src/cli/args.ts';
import { getLocale, missingKeys, setLocale, t } from '../src/sim/i18n.ts';
import { play } from '../src/sim/loop.ts';
import { cy } from '../src/sim/strings/cy.ts';
import { en } from '../src/sim/strings/en.ts';

afterEach(() => setLocale('en'));

describe('Feature: Localisation scaffold', () => {
  it('Scenario: Lookup, placeholders and fallback', () => {
    expect(t('actions.feed.1', { name: 'The Golem', hunger: 45 })).toBe('The Golem ate (hunger +45).');
    expect(t('no.such.key')).toBe('no.such.key');
    setLocale('cy');
    expect(getLocale()).toBe('cy');
    const englishOnly = Object.keys(en).find((k) => !(k in cy))!;
    expect(t(englishOnly)).toBe(en[englishOnly]);
  });

  it('Scenario: Every Welsh key exists in English', () => {
    for (const key of Object.keys(cy)) expect(en, key).toHaveProperty(key);
    expect(Object.keys(cy).length).toBeGreaterThanOrEqual(60);
  });

  it('Scenario: The locale changes the words, never the simulation', () => {
    const english = play(42);
    setLocale('cy');
    const welsh = play(42);
    const shape = (g: typeof english) => g.log.map((e) => [e.night, e.phase, e.kind, e.monsterId ?? '', JSON.stringify(e.data ?? {})]);
    expect(shape(welsh)).toEqual(shape(english));
    expect(welsh.village.suspicion).toBe(english.village.suspicion);
    const en1 = english.log.find((e) => e.kind === 'suspicion')!;
    const cy1 = welsh.log.find((e) => e.kind === 'suspicion')!;
    expect(en1.text).toMatch(/^Suspicion /);
    expect(cy1.text).toMatch(/^Amheuaeth /);
  });

  it('Scenario: The report knows what is left', () => {
    const missing = missingKeys('cy');
    for (const k of missing) {
      expect(en).toHaveProperty(k);
      expect(cy).not.toHaveProperty(k);
    }
    expect(missing.length + Object.keys(cy).length).toBe(Object.keys(en).length);
    expect(parseArgs(['--lang', 'cy']).lang).toBe('cy');
    expect(() => parseArgs(['--lang', 'fr'])).toThrow(/--lang/);
  });
});
