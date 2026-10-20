/** `pnpm i18n`: how much of each locale is translated, and which keys are missing. */
import { TABLES, missingKeys, type Locale } from '../sim/i18n.ts';
import { en } from '../sim/strings/en.ts';

const total = Object.keys(en).length;
for (const locale of Object.keys(TABLES) as Locale[]) {
  if (locale === 'en') continue;
  const missing = missingKeys(locale);
  const done = total - missing.length;
  process.stdout.write(`${locale}: ${done}/${total} keys translated (${Math.round((done / total) * 100)}%)\n`);
  for (const key of missing) process.stdout.write(`  missing ${key}\n`);
}
process.stdout.write(`en: ${total} keys\n`);
