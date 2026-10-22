/**
 * Localisation scaffold (MM-39). Every event sentence goes through `t()`,
 * which looks the key up in the active locale's table, falls back to English,
 * and finally to the key itself, then fills `{placeholders}`.
 *
 * The locale is process-wide and set before a run; the log records the text
 * in whatever language was active when the event was emitted.
 */
import { cy } from './strings/cy.ts';
import { en } from './strings/en.ts';

export type Locale = 'en' | 'cy';

export const TABLES: Record<Locale, Record<string, string>> = { en, cy };

let active: Locale = 'en';

export function setLocale(locale: Locale): void {
  if (!(locale in TABLES)) throw new Error(`Unknown locale "${locale}"`);
  active = locale;
}

export function getLocale(): Locale {
  return active;
}

export type Params = Record<string, string | number | boolean | undefined>;

export function t(key: string, params: Params = {}): string {
  const template = TABLES[active][key] ?? en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = params[name];
    return v === undefined ? whole : String(v);
  });
}

/** Keys the English table has that `locale` lacks: what still needs translating. */
export function missingKeys(locale: Locale): string[] {
  const table = TABLES[locale];
  return Object.keys(en).filter((k) => !(k in table));
}
