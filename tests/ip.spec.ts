import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLAYABLE } from '../src/sim/monsters.ts';

const ROOT = join(import.meta.dirname, '..');
const AUDIT = join(ROOT, 'docs', 'ip-audit.md');

function forbiddenTerms(): string[] {
  const doc = readFileSync(AUDIT, 'utf8');
  const m = /```terms\n([\s\S]*?)```/.exec(doc);
  if (!m) throw new Error('docs/ip-audit.md has no ```terms fence');
  return m[1]!.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|md|feature|json)$/.test(name)) out.push(full);
  }
  return out;
}

const SKIP = new Set(['docs/ip-audit.md', 'docs/backlog.md']);

describe('Feature: IP audit', () => {
  it('Scenario: The audit document lists terms and covers every archetype', () => {
    const terms = forbiddenTerms();
    expect(terms.length).toBeGreaterThanOrEqual(15);
    const doc = readFileSync(AUDIT, 'utf8');
    const names: Record<string, string> = {
      count: 'The Count',
      wolfman: 'The Wolf Man',
      golem: 'The Golem',
      mummy: 'The Mummy',
      invisible: 'The Invisible Man',
      lakeling: 'The Lake Creature',
      phantom: 'The Phantom',
      bride: 'The Bride',
      hunchback: 'The Hunchback',
      gwyllgi: 'Y Gwyllgi',
      cwnannwn: 'Cŵn Annwn',
      gwrach: 'Gwrach y Rhibyn',
    };
    for (const a of PLAYABLE) expect(doc, a).toContain(names[a]);
  });

  it('Scenario: None of the forbidden terms appear in the repository text', () => {
    const terms = forbiddenTerms().map((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    const files = ['src', 'features', 'tests', 'plans', 'docs']
      .flatMap((d) => walk(join(ROOT, d)))
      .concat(join(ROOT, 'README.md'));
    const hits: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file);
      if (SKIP.has(rel)) continue;
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        for (const re of terms) if (re.test(line)) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(hits).toEqual([]);
  });
});
