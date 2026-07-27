/**
 * Scaffold a new component folder.
 *
 *   npm run new:component -- <slug> --group <group-id> --name "Display Name"
 *   npm run new:component -- tooltip --group overlays-disclosure --name "Tooltip"
 *
 * Optional: --no-js for a CSS-only component.
 *
 * The templates already satisfy every convention the linter and the a11y gate
 * check for -- the token fallback chain, the motion gate, a forced-colors
 * block, the IIFE + destroy() shape. Fill in the behavior, do not re-derive
 * the boilerplate. See docs/component-specs.md for the contract to build to.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const GROUPS = [
  'foundations',
  'buttons-actions',
  'forms-inputs',
  'overlays-disclosure',
  'navigation',
  'feedback-status',
  'data-display',
  'compositions',
];

/* --- Arguments -------------------------------------------------------------- */

const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith('-'));

/**
 * Reads a flag's value, joining every word up to the next `--flag`. Quotes
 * around a multi-word --name do not survive `npm run ... --`, so
 * `--name Text Input` has to be treated as one value rather than one word.
 */
function flag(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;

  const words = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) words.push(argv[j]);
  return words.length ? words.join(' ') : fallback;
}

const group = flag('group');
const withJs = !argv.includes('--no-js');

function die(message) {
  console.error(`new-component: ${message}`);
  console.error(`\nUsage: npm run new:component -- <slug> --group <id> --name "Display Name"`);
  console.error(`Groups: ${GROUPS.join(', ')}`);
  process.exit(1);
}

if (!slug) die('a slug is required');
if (!/^[a-z][a-z0-9-]*$/.test(slug)) die(`"${slug}" must be lower-kebab-case`);
if (!group) die('--group is required');
if (!GROUPS.includes(group)) die(`unknown group "${group}"`);

const name =
  flag('name') || slug.replace(/(^|-)([a-z])/g, (_, sep, ch) => (sep ? ' ' : '') + ch.toUpperCase());

/** `text-input` -> `TextInput`, for the factory name. */
const pascal = slug.replace(/(^|-)([a-z])/g, (_, __, ch) => ch.toUpperCase());

const dir = resolve(root, 'src/library/components', slug);

try {
  await access(dir);
  die(`src/library/components/${slug}/ already exists -- refusing to overwrite`);
} catch {
  /* does not exist, which is what we want */
}

/* --- Templates ---------------------------------------------------------------- */

const html = `<!-- ===========================================================================
     ${name.toUpperCase()} — TODO one line: what it is

     WHAT TO COPY
       Any one example below is self-contained. Take its section, plus the
       matching [CORE] sections of component.css and component.js.
       Copy all three files whole for the library-grade version.

     THE CONTRACT (the same in every example)
       TODO: the two or three attributes that make this work, from
       docs/component-specs.md. This block is the reason the file exists.

     ac-demo-* / ac-demo__* is scaffolding for this page only — the grid and the
     per-example headings. Never copy it into your app.
     =========================================================================== -->

<div class="ac-demo-grid">
  <!-- ======================================================================
       EXAMPLE 1 · TODO the baseline case
       CSS [CORE]. ${withJs ? 'JS [CORE].' : 'No JS.'}
       ====================================================================== -->
  <div class="ac-demo">
    <h3 class="ac-demo__title">1 &middot; TODO</h3>

    <div class="ac-${slug}"${withJs ? ` data-ac-${slug}` : ''}>
      <!-- TODO -->
    </div>
  </div>

  <!-- ======================================================================
       EXAMPLE 2 · TODO an awkward state
       Ship the ones people get wrong: disabled, empty, error, long text that
       has to wrap. One example each, numbered, so they can be copied apart.
       ====================================================================== -->
</div>
`;

const css = `/* ===========================================================================
   ${name.toUpperCase()}

   WHAT TO COPY — sections are marked with the examples that need them.

     [CORE]      every example.
     [FORCED]    always ship this. High Contrast rebuilds every cue.
     [DEMO]      this page only. Do not copy.

   TODO: add a section per concern (states, variants, sub-parts) and name the
   examples that need it, e.g. "[INVALID] examples 2, 3".

   Copy the file whole for the library version.

   Every color is var(--ac-token, var(--theme-token, #literal)) so this works
   standalone, in a theme-service app, and in an app that sets --ac-*.
   scripts/check-tokens.mjs enforces it.
   =========================================================================== */

/* --- [DEMO] this page only ------------------------------------------------- */

.ac-demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: 1.75rem;
  width: 100%;
}

.ac-demo {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.ac-demo__title {
  margin: 0 0 0.6rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--ac-border, var(--border, #34205a));
  font-family: var(--ac-font-mono, var(--font-mono, "Cascadia Mono", Consolas, ui-monospace, monospace));
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ac-accent-blue, var(--accent-blue, #3ceaff));
  text-transform: none;
}

/* --- [CORE] --------------------------------------------------------------- */

.ac-${slug} {
  font-family: var(--ac-font-ui, var(--font-ui, "Trebuchet MS", "Segoe UI", system-ui, sans-serif));
  color: var(--ac-text, var(--text, #f3ecff));
  background: var(--ac-surface, var(--bg-panel, #110620));
  border: 1px solid var(--ac-border, var(--border, #34205a));
  border-radius: var(--ac-radius, var(--radius, 10px));

  /* Motion is gated, never hardcoded: --ac-motion resolves to 0 under
     prefers-reduced-motion or [data-motion="off"]. */
  transition: border-color
    calc(var(--ac-motion, var(--motion, 1)) * var(--ac-dur, var(--dur, 150ms))) ease;
}

.ac-${slug}:focus-visible {
  outline: 3px solid var(--ac-focus, var(--focus-ring, #3ceaff));
  outline-offset: 2px;
}

/* --- [FORCED] Windows High Contrast — always ship this --------------------- */

/* forced-colors drops color-mix, glows and opacity, so every cue built from them
   has to be rebuilt from system colors. */
@media (forced-colors: active) {
  .ac-${slug} {
    border-color: ButtonBorder;
  }

  .ac-${slug}:focus-visible {
    outline-color: CanvasText;
  }

  .ac-demo__title {
    color: CanvasText;
    border-bottom-color: CanvasText;
  }
}
`;

const js = `/* ===========================================================================
   ${name.toUpperCase()}

   WHAT TO COPY
     [CORE]       every example. The whole contract.
     [AUTO-INIT]  delete if you construct instances yourself.

   TODO: if any behavior is optional, put it in its own [NAME] block and say
   which examples need it, so it can be deleted without unpicking the rest.

   Copy the file whole for the library version.

   TODO: two or three lines on the non-obvious accessibility decision this file
   makes. If there isn't one, this component probably needs no JS.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  var uid = 0;

  /**
   * @param {HTMLElement} root element carrying [data-ac-${slug}]
   * @param {object} [options]
   */
  function create${pascal}(root, options) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._ac${pascal}) return root && root._ac${pascal};

    var settings = options || {};
    var id = root.id || 'ac-${slug}-' + ++uid;

    /* === [CORE] ========================================================== */

    // TODO: query the parts, mint any ids that are missing, set the ARIA
    // attributes, bind the listeners. See docs/component-specs.md for the
    // contract this component has to meet.

    var api = {
      destroy: function () {
        // TODO: unbind everything bound above and undo any attribute the
        // factory added, so destroy() really is the inverse of create.
        delete root._ac${pascal};
      },
    };

    root._ac${pascal} = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.create${pascal} = create${pascal};

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-${slug}]').forEach(function (el) {
      create${pascal}(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }
})(window);
`;

const meta = `{
  "slug": "${slug}",
  "name": "${name}",
  "group": "${group}",
  "order": 100,
  "summary": "TODO: one sentence, what it is and why it is here. Shown on the index card.",
  "tags": [],
  "apg": null,
  "wcag": [],
  "status": "draft",
  "files": [${withJs ? '"html", "css", "js"' : '"html", "css"'}]
}
`;

const docs = `## Before you copy

Your framework may have a better idiom for this than ${withJs ? `\`AC.create${pascal}\`` : 'these classes'}.
Use it. **The ARIA wiring below is the same either way**, and it is the part almost every
implementation gets wrong. Take the markup and the CSS, keep the attribute contract, and let your
framework own the state.

Each example on this page is separately copyable: the HTML sections are numbered, and the CSS${
  withJs ? ' and JS' : ''
}
sections say which examples need them.

## The contract

TODO: the shape of the pattern in two or three sentences, then the table.

| Element | Attribute | Why |
| --- | --- | --- |
| | | |

## Keyboard

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | |

## Screen reader behavior

TODO: what NVDA, JAWS, VoiceOver and TalkBack actually announce, and anywhere
they differ. Say what was tested rather than what should happen.

## States

TODO: default, hover, focus, active, disabled, empty, error -- whichever apply.
Note how each is signaled without relying on color.
${
  withJs
    ? `
## API

\`\`\`js
const c = AC.create${pascal}(el, {});

c.destroy();
\`\`\`

Idempotent: calling it twice on the same element returns the existing instance.

## Using it in a framework

Delete the auto-init block at the bottom of \`component.js\` and call the factory
from your own lifecycle. In React:

\`\`\`jsx
const ref = useRef(null);

useEffect(() => {
  const c = AC.create${pascal}(ref.current);
  return () => c.destroy();
}, []);
\`\`\`
`
    : ''
}
## What to watch for

TODO: the mistakes people actually make with this pattern.
`;

const spec = `import { test, expect } from '@playwright/test';

const PAGE = 'components/${slug}/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// Assert the ARIA contract and the keyboard map from docs/component-specs.md --
// not merely that the thing rendered. A test that only checks for presence
// would still pass if every attribute were wrong.

test('TODO: exposes the right roles and names', async ({ page }) => {
  await expect(page.locator('.ac-${slug}')).toBeVisible();
});

test.fixme('TODO: keyboard map', async ({ page }) => {});
`;

/* --- Write ---------------------------------------------------------------------- */

await mkdir(join(dir, 'tests'), { recursive: true });

const files = [
  ['component.html', html],
  ['component.css', css],
  ['meta.json', meta],
  ['docs.md', docs],
  [join('tests', `${slug}.spec.mjs`), spec],
];
if (withJs) files.splice(2, 0, ['component.js', js]);

for (const [file, contents] of files) {
  await writeFile(join(dir, file), contents, 'utf8');
}

console.log(`new-component: created src/library/components/${slug}/`);
for (const [file] of files) console.log(`  ${file}`);
console.log(`
Next:
  1. Read the "${slug}" entry in docs/component-specs.md and build to it.
  2. Fill in meta.json (summary, tags, apg, wcag) and flip status to "stable".
  3. npm run check:tokens && npm run build
  4. npx playwright test --project=chromium ${slug}
  5. Tick the row in docs/BUILD-STATUS.md`);
