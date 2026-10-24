/** `pnpm tokens`: regenerate tokens.css from tokens.ts. */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildTokensCss } from './tokens.ts';

const out = join(import.meta.dirname, 'tokens.css');
writeFileSync(out, buildTokensCss());
process.stdout.write(`wrote ${out}\n`);
