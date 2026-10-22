/**
 * `pnpm shots` (MM-49): build the client, serve it, and capture the
 * reference images in docs/art/ with headless Chromium.
 *
 * Uses playwright-core's Chromium. Set CHROMIUM_PATH to use another binary
 * (for example /opt/pw-browsers/chromium-1194/chrome-linux/chrome).
 */
import { join } from 'node:path';
import { chromium, type Page } from 'playwright-core';
import { build, preview } from 'vite';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'docs', 'art');
const JPEG = { type: 'jpeg', quality: 86 } as const;

async function settle(page: Page, url: string): Promise<void> {
  await page.addInitScript(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
}

await build({ root: ROOT, logLevel: 'warn' });
const server = await preview({ root: ROOT, preview: { port: 4179, strictPort: true }, logLevel: 'warn' });
const base = 'http://localhost:4179';
const browser = await chromium.launch({ ...(process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {}), args: ['--no-sandbox'] });
const errors: string[] = [];
try {
  const key = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  key.on('pageerror', (e) => errors.push(String(e)));
  await key.goto(`${base}/?seed=42&keyart=1&household=count,wolfman,golem`, { waitUntil: 'networkidle' });
  await key.waitForTimeout(800);
  await key.locator('.stage canvas').screenshot({ path: join(OUT, 'key-art.jpg'), ...JPEG });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await settle(page, `${base}/?seed=42&household=count,wolfman,golem,mummy,invisible`);
  await page.screenshot({ path: join(OUT, 'screen-dusk.jpg'), ...JPEG });
  await page.locator('.plan').screenshot({ path: join(OUT, 'screen-plan.jpg'), ...JPEG });
  // each choice re-renders the plan, so they must happen one after another
  // oxlint-disable-next-line no-await-in-loop
  for (const id of ['#act-count-feed', '#act-golem-sleep', '#act-wolfman-repair', '#act-invisible-socialise']) await page.check(id, { force: true });
  await page.keyboard.press('r');
  await page.waitForTimeout(2500);
  await page.locator('.stage').screenshot({ path: join(OUT, 'stage-night.jpg'), ...JPEG });
  await page.keyboard.press(' ');
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelectorAll('.plate').forEach((el, i) => i > 4 && el.remove()));
  await page.locator('.bestiary').screenshot({ path: join(OUT, 'bestiary.jpg'), ...JPEG });

  const guide = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  guide.on('pageerror', (e) => errors.push(String(e)));
  await guide.goto(`${base}/styleguide.html`, { waitUntil: 'networkidle' });
  await guide.waitForTimeout(800);
  await guide.locator('#colour').screenshot({ path: join(OUT, 'styleguide-colour.jpg'), ...JPEG });
  await guide.locator('#figures').screenshot({ path: join(OUT, 'styleguide-residents.jpg'), ...JPEG });
  await guide.locator('#components').screenshot({ path: join(OUT, 'styleguide-components.jpg'), ...JPEG });
} finally {
  await browser.close();
  await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
}
if (errors.length > 0) {
  process.stderr.write(`page errors:\n${errors.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`captured reference images in ${OUT}\n`);
}
