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
 * block, the IIFE + destroy() shape. Fill in the behaviour, do not re-derive
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

const html = `<!--
  ${name}

  TODO: the canonical accessible markup. This is what visitors copy, so it is
  the reference implementation, not a demo rig -- keep it minimal and correct.

  Show the awkward states too: disabled, empty, error, and long text that has to
  wrap or truncate. Those are the ones people get wrong.
-->
<div class="ac-${slug}"${withJs ? ` data-ac-${slug}` : ''}>
  <!-- TODO -->
</div>
`;

const css = `/* =============================================================================
   ${name}

   Every color is var(--ac-token, var(--theme-token, #literal)) so this works
   standalone, inside a theme-service app, and inside an app that sets --ac-*.
   scripts/check-tokens.mjs enforces it.
   ============================================================================= */

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

/* --- Windows High Contrast ---------------------------------------------------
   forced-colors drops color-mix fills, glows and opacity, so any state cue built
   from them disappears. Rebuild the cues from system colors. */
@media (forced-colors: active) {
  .ac-${slug} {
    border-color: ButtonBorder;
  }

  .ac-${slug}:focus-visible {
    outline-color: CanvasText;
  }
}
`;

const js = `/* =============================================================================
   ${name}

   No dependencies. Plain IIFE, so a straight paste into a <script> tag works.

   Vanilla:   <script src="component.js"></script> -- anything with
              [data-ac-${slug}] is wired up automatically.

   Framework: delete the auto-init block at the bottom and call the factory from
              your own lifecycle:

                const c = AC.create${pascal}(ref.current);
                c.destroy();   // on unmount
   ============================================================================= */
(function (global) {
  'use strict';

  var uid = 0;

  /**
   * @param {HTMLElement} root element carrying [data-ac-${slug}]
   * @param {object} [options]
   */
  function create${pascal}(root, options) {
    // Idempotent: initialising twice would double up the listeners.
    if (!root || root._ac${pascal}) return root && root._ac${pascal};

    var settings = options || {};
    var id = root.id || 'ac-${slug}-' + ++uid;

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

  /* --- Auto-init. Delete this block if you initialise manually. ------------- */
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

const docs = `## How it works

TODO: the shape of the pattern in two or three sentences, then the contract.

| Element | Attribute | Why |
| --- | --- | --- |
| | | |

## Keyboard

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | |

## Screen reader behaviour

TODO: what NVDA, JAWS, VoiceOver and TalkBack actually announce, and anywhere
they differ. Say what was tested rather than what should happen.

## States

TODO: default, hover, focus, active, disabled, empty, error -- whichever apply.
Note how each is signalled without relying on color.
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
