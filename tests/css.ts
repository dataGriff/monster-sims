/** Minimal CSS reading for design-lint tests: innermost rule blocks and their declarations. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Declaration {
  selector: string;
  prop: string;
  value: string;
}

export const ROOT = join(import.meta.dirname, '..');

export function readCss(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
}

export function declarations(css: string): Declaration[] {
  const out: Declaration[] = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1]!.trim();
    for (const part of m[2]!.split(';')) {
      const i = part.indexOf(':');
      if (i < 0) continue;
      const prop = part.slice(0, i).trim();
      const value = part.slice(i + 1).trim();
      if (prop) out.push({ selector, prop, value });
    }
  }
  return out;
}

export function definedVars(css: string): Set<string> {
  return new Set(declarations(css).filter((d) => d.prop.startsWith('--')).map((d) => d.prop));
}

export function usedVars(css: string): Set<string> {
  return new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]!));
}

export const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|(?<![\w-])(white|black|red|green|blue|grey|gray|orange|yellow|purple)(?![\w-])/;
