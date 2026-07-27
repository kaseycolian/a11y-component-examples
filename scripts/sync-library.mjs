/**
 * Mirror the two verbatim-served source folders into public/.
 *
 *   src/library/     -> public/library/     the components themselves
 *   src/site/theme/  -> public/theme/       the vendored theme-service files
 *
 * Why this exists: the demo on each component page must load the component's
 * *real* files -- the same bytes the copy panel shows -- over HTTP, via
 * <link rel="stylesheet"> and <script src>. Astro only serves static assets
 * from public/, and both source folders deliberately live outside it: the
 * library so it stays a plain framework-free folder you could lift out
 * wholesale, and the theme so its vendored files stay next to the
 * THEME-SERVICE.md that tracks their version.
 *
 * Both targets are generated and gitignored. Never edit them; edit the source.
 *
 * Runs automatically via the `predev` and `prebuild` npm hooks.
 *   node scripts/sync-library.mjs           one-shot copy
 *   node scripts/sync-library.mjs --watch   re-copy on change (used by dev)
 */
import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const JOBS = [
  {
    source: resolve(root, 'src/library'),
    target: resolve(root, 'public/library'),
    label: 'src/library -> public/library',
    // Tests live beside their component for maintainability, but they are not
    // part of what a visitor copies, so they stay out of the served output.
    filter: (src) => !/[\\/]tests([\\/]|$)/.test(src),
  },
  {
    source: resolve(root, 'src/site/theme'),
    target: resolve(root, 'public/theme'),
    label: 'src/site/theme -> public/theme',
    // The tracking log is documentation for maintainers, not a served asset.
    filter: (src) => !/THEME-SERVICE\.md$/.test(src),
  },
];

async function syncOne({ source, target, filter }) {
  if (!existsSync(source)) {
    throw new Error(`source not found: ${source}`);
  }
  // Rebuild from scratch so deleted files do not linger in the output.
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true, filter });
}

async function syncAll() {
  for (const job of JOBS) {
    await syncOne(job);
    console.log(`sync-library: ${job.label}`);
  }
}

try {
  await syncAll();
} catch (err) {
  console.error(`sync-library: ${err.message}`);
  process.exit(1);
}

if (process.argv.includes('--watch')) {
  let pending = null;
  for (const job of JOBS) {
    watch(job.source, { recursive: true }, () => {
      clearTimeout(pending);
      pending = setTimeout(() => {
        syncAll().then(
          () => console.log('sync-library: re-synced'),
          (err) => console.error('sync-library:', err.message),
        );
      }, 80);
    });
  }
  console.log('sync-library: watching for changes');
}
