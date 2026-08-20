#!/usr/bin/env node
/**
 * Screenshot a component page.
 *
 *   npm run shots -- dropdown
 *   npm run shots -- dropdown --skip-build
 *   npm run shots -- dropdown --widths 1280,900,320
 *
 * "Screenshot the finished page before ticking the row" has caught a real bug
 * three times, every time with the whole suite green. It was a recipe with two
 * failure modes and it had been rewritten from scratch more than once, so this
 * is the recipe as a command. Everything below is one of its steps.
 *
 * THE VIEWPORT IS 3000px TALL, ON PURPOSE. A single tall element screenshot
 * stitches while it scrolls, and the sticky header paints across the middle of
 * the result, hiding an example. That is an artifact rather than a bug -- and
 * it is also exactly where a real one goes unnoticed. With a viewport taller
 * than the demo, an element screenshot never scrolls and the header cannot get
 * into it, so the per-example shots come back clean at every width in one pass.
 *
 * SHOOT THE EXAMPLES ONE AT A TIME AS WELL AS THE GRID. The grid shot is how
 * the page reads; the per-example shots are where a broken one is visible.
 *
 * TWO NUMBERS COME BACK WITH THEM, because they are one line each and both have
 * found things: `scrollWidth - clientWidth` is sideways overflow (SC 1.4.10),
 * which is invisible in a screenshot, and `document.activeElement` is what
 * caught `document.body.focus()` leaving a keyboard reader parked mid-page.
 *
 * The output goes to `shots/`, which is gitignored -- the recipe's last line is
 * that `git status` comes back with only the component folder, and a script
 * that leaves PNGs in the tree fails that on its own. `npm run clean -- --all`
 * removes them.
 *
 * The port and base path are imported from playwright.config.mjs so there is
 * one definition of where the site is served. A preview server already holding
 * the port is reused and left running, for the same reason its config sets
 * `reuseExistingServer` -- and because a probe that kills someone else's server
 * is worse than one that reuses it.
 */
import { chromium } from '@playwright/test';
import { spawn, execSync, execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import playwrightConfig from '../playwright.config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = playwrightConfig.use.baseURL;

/** Taller than any demo page's grid, so an element shot never scrolls. */
const VIEWPORT_HEIGHT = 3000;

function usage(message) {
  console.error(
    `${message}\n\n` +
      '  npm run shots -- <slug> [--skip-build] [--widths 1280,320]\n\n' +
      'Slugs are the folder names under skill/library/components/.',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
if (!slug) usage('shots: no component slug given.');
if (!existsSync(resolve(root, 'skill/library/components', slug))) {
  usage(`shots: no component "${slug}" in skill/library/components/.`);
}

const skipBuild = args.includes('--skip-build');
const widthsArg = args[args.indexOf('--widths') + 1];
const widths =
  args.includes('--widths') && widthsArg
    ? widthsArg.split(',').map((w) => Number(w.trim()))
    : [1280, 320];
if (widths.some((w) => !Number.isFinite(w) || w < 200)) usage(`shots: bad --widths "${widthsArg}".`);

async function serverIsUp() {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(2_000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * `npm run preview` is a shell that spawns astro, which spawns node. Killing
 * the shell alone leaves the port held, and the next run reuses a server built
 * from the tree as it was -- which is the shape of the probe that made a source
 * edit look like a broken component. Kill the tree.
 */
function killTree(child) {
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      child.kill('SIGKILL');
    }
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
}

async function startServer() {
  // One command string rather than argv + `shell: true`, which Node deprecated
  // in DEP0190 -- with a shell, the arguments are concatenated, not escaped.
  const child = spawn('npm run preview', {
    cwd: root,
    shell: true,
    stdio: 'ignore',
    detached: process.platform !== 'win32',
  });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await serverIsUp()) return child;
    await new Promise((r) => setTimeout(r, 500));
  }
  killTree(child);
  throw new Error(`preview did not come up at ${BASE} within 60s`);
}

/** `2 · Pressed is not a color` -> `02-pressed-is-not-a-color`. */
function fileName(index, title) {
  const stem = (title ?? '')
    .replace(/^\s*\d+\s*[·.:-]\s*/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  const n = String(index + 1).padStart(2, '0');
  return stem ? `${n}-${stem}` : n;
}

async function main() {
  if (!skipBuild) {
    console.log('shots: building...');
    execSync('npm run build', { cwd: root, stdio: 'inherit' });
  }

  const reused = await serverIsUp();
  const server = reused ? null : await startServer();
  if (reused) console.log(`shots: reusing the preview server already on ${BASE}`);

  const outDir = resolve(root, 'shots', slug);
  await rm(outDir, { recursive: true, force: true });

  const browser = await chromium.launch();
  const notes = [];
  try {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: VIEWPORT_HEIGHT },
      });
      const page = await context.newPage();
      const url = `${BASE}components/${slug}/`;
      const response = await page.goto(url, { waitUntil: 'load' });
      if (!response?.ok()) throw new Error(`${url} returned ${response?.status()}`);
      // The demo's own script is deferred, so the markup is on screen before
      // the enhancement is. Waiting for the markup is not waiting for the
      // enhancement -- give the factories a turn before shooting.
      await page.waitForLoadState('networkidle');

      const dir = resolve(outDir, String(width));
      await mkdir(dir, { recursive: true });

      const grids = page.locator('.ac-demo-grid');
      const gridCount = await grids.count();
      for (let i = 0; i < gridCount; i++) {
        await grids.nth(i).screenshot({ path: resolve(dir, `grid-${i + 1}.png`) });
      }

      const demos = page.locator('.ac-demo-grid > .ac-demo');
      const demoCount = await demos.count();
      for (let i = 0; i < demoCount; i++) {
        const demo = demos.nth(i);
        const title = await demo.locator('.ac-demo__title').first().textContent().catch(() => null);
        await demo.screenshot({ path: resolve(dir, `${fileName(i, title)}.png`) });
      }

      const probe = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        focused: document.activeElement?.tagName ?? 'none',
        focusedClass: document.activeElement?.className || '',
      }));

      const line =
        `${String(width).padStart(5)}px  ${gridCount} grid + ${demoCount} example shots  ` +
        `overflow ${probe.overflow}px  activeElement <${probe.focused.toLowerCase()}` +
        `${probe.focusedClass ? ` class="${probe.focusedClass}"` : ''}>`;
      notes.push(line);
      console.log(line);
      if (probe.overflow > 0) {
        console.log(`         ^ the page scrolls sideways at ${width}px (SC 1.4.10)`);
      }
      if (probe.focused !== 'BODY') {
        console.log(`         ^ something took focus on load; a keyboard reader starts there`);
      }

      await context.close();
    }
  } finally {
    await browser.close();
    if (server) killTree(server);
  }

  // A run is worth nothing a week later if the numbers are only in a terminal
  // that has scrolled away.
  await writeFile(resolve(outDir, 'README.txt'), `${slug}\n${notes.join('\n')}\n`, 'utf8');
  console.log(`shots: wrote shots/${slug}/ (gitignored)`);
}

try {
  await main();
} catch (err) {
  console.error(`shots: ${err.message}`);
  process.exit(1);
}
