/**
 * Mirror the verbatim-served source folders into public/.
 *
 *   src/library/     -> public/library/     the components themselves
 *   src/site/theme/  -> public/theme/       the vendored theme-service files
 *   agents/          -> public/agents/      the agent-facing index and contracts
 *   agents/llms.txt  -> public/llms.txt     the same file where a fetcher looks
 *
 * Why this exists: the demo on each component page must load the component's
 * *real* files -- the same bytes the copy panel shows -- over HTTP, via
 * <link rel="stylesheet"> and <script src>. Astro only serves static assets
 * from public/, and both source folders deliberately live outside it: the
 * library so it stays a plain framework-free folder you could lift out
 * wholesale, and the theme so its vendored files stay next to the
 * THEME-SERVICE.md that tracks their version.
 *
 * agents/ joins them for the same reason and one more: an agent that fetched the
 * site rather than cloning it has to reach the same bytes a checkout has, or the
 * two disagree. It is written by scripts/build-agent-surfaces.mjs and committed;
 * this only publishes it. llms.txt gets copied twice because the convention puts
 * it at the root of a site while the generator keeps every surface in one folder.
 *
 * All targets are generated and gitignored. Never edit them; edit the source.
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

/**
 * Tests live beside their component for maintainability, but they are not part
 * of what a visitor copies, so they stay out of the served output.
 *
 * Exported because `tests/shared/what-you-see.spec.mjs` asserts that public/ is
 * src/ byte for byte, and it has to exempt exactly what this exempts. Two copies
 * of the rule would drift, and the drift would read as a passing test.
 */
export const isServed = (src) => !/[\\/]tests([\\/]|$)/.test(src);

export const JOBS = [
  {
    source: resolve(root, 'src/library'),
    target: resolve(root, 'public/library'),
    label: 'src/library -> public/library',
    filter: isServed,
  },
  {
    source: resolve(root, 'src/site/theme'),
    target: resolve(root, 'public/theme'),
    label: 'src/site/theme -> public/theme',
    // The tracking log is documentation for maintainers, not a served asset.
    filter: (src) => !/THEME-SERVICE\.md$/.test(src),
  },
  {
    source: resolve(root, 'agents'),
    target: resolve(root, 'public/agents'),
    label: 'agents -> public/agents',
  },
  {
    // llms.txt belongs at the root of what is served, which for a project Pages
    // site is the base path. The generator keeps it with its siblings, so the
    // copy is what puts it where a fetcher will look for it.
    source: resolve(root, 'agents/llms.txt'),
    target: resolve(root, 'public/llms.txt'),
    label: 'agents/llms.txt -> public/llms.txt',
    file: true,
  },
];

async function syncOne({ source, target, filter, file }) {
  if (!existsSync(source)) {
    throw new Error(`source not found: ${source}`);
  }
  // Rebuild from scratch so deleted files do not linger in the output.
  await rm(target, { recursive: true, force: true });
  if (file) {
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target);
    return;
  }
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true, filter });
}

async function syncAll() {
  for (const job of JOBS) {
    await syncOne(job);
    console.log(`sync-library: ${job.label}`);
  }
}

// Only when run as a script. The spec imports `isServed` from here so the two
// cannot disagree about what is served, and importing must not trigger a sync.
const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  try {
    await syncAll();
  } catch (err) {
    console.error(`sync-library: ${err.message}`);
    process.exit(1);
  }
}

if (invokedDirectly && process.argv.includes('--watch')) {
  let pending = null;
  for (const job of JOBS) {
    // Single-file jobs need no watcher of their own: every one of them lives
    // inside a folder another job already watches, and a change there re-runs
    // syncAll(), which copies the file too.
    if (job.file) continue;
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
