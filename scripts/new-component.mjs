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
 * the boilerplate. The contract to build to is meta.json's `contract` block --
 * CLAUDE.md says what it owes -- and docs/component-specs.md has the up-front
 * design decisions, for the components it has an entry for.
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

     REQUIRED MARKUP (the same in every example)
       TODO: the two or three attributes that make this work. The full contract
       is the "contract" block in meta.json. This block is the reason the file
       exists.

     ac-demo-* / ac-demo__* is scaffolding for this page only — the two section
     headings, the grid and the per-example headings. Never copy it into your app.
     =========================================================================== -->

<div class="ac-demo-section">
  <h3 class="ac-demo-section__title">Correct examples</h3>
  <p class="ac-demo-section__note">TODO: one sentence on what this group shows.</p>

  <div class="ac-demo-grid">
    <!-- ====================================================================
         EXAMPLE 1 · TODO the baseline case
         CSS [CORE]. ${withJs ? 'JS [CORE].' : 'No JS.'}
         ==================================================================== -->
    <div class="ac-demo">
      <h4 class="ac-demo__title">1 &middot; TODO</h4>

      <div class="ac-${slug}"${withJs ? ` data-ac-${slug}` : ''}>
        <!-- TODO -->
      </div>
    </div>

    <!-- ====================================================================
         EXAMPLE 2 · TODO an awkward state
         Ship the ones people get wrong: disabled, empty, error, long text that
         has to wrap. One example each, numbered, so they can be copied apart.
         ==================================================================== -->
  </div>
</div>

<!-- The counter-examples, second, so a visitor can tell at a glance which
     markup to take. Numbering continues from the section above — do not restart
     it, or the EXAMPLE banners in component.css and component.js stop lining up.
     Anything broken on purpose carries data-ac-demo-broken="<axe-rule-id> ...",
     which the shared a11y gate asserts still fails. Delete this whole block if
     the component genuinely has no counter-example. -->
<div class="ac-demo-section ac-demo-section--mistakes">
  <h3 class="ac-demo-section__title">Common mistakes</h3>
  <p class="ac-demo-section__note">TODO: one sentence. These are live and wrong on purpose.</p>

  <div class="ac-demo-grid">
    <!-- ====================================================================
         EXAMPLE 3 · TODO the mistake people actually make
         ==================================================================== -->
  </div>
</div>
`;

const css = `/* ===========================================================================
   ${name.toUpperCase()}

   WHAT TO COPY — sections are marked with the examples that need them.
   Everything here is real component code; the demo frame (ac-demo-*) lives in
   the site's own stylesheet, not this file.

     [CORE]      every example.
     [FORCED]    always ship this. High Contrast rebuilds every cue.

   TODO: add a section per concern (states, variants, sub-parts) and name the
   examples that need it, e.g. "[INVALID] examples 2, 3".

   Copy the file whole for the library version.

   Every color is var(--ac-token, var(--theme-token, #literal)) so this works
   standalone, in a theme-service app, and in an app that sets --ac-*.
   scripts/check-tokens.mjs enforces it.
   =========================================================================== */

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
    // attributes, bind the listeners. The contract this component has to meet is
    // the "contract" block in meta.json.

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
  "summary": "TODO: two or three sentences, ~50 words, in this order -- what it is, what it is for, the one thing that makes it hard. Direct and dry. Name at most one attribute. Never enumerate or count the examples. See CLAUDE.md > Writing style.",
  "tags": [],
  "apg": null,
  "wcag": [],
  "status": "draft",
  "files": [${withJs ? '"html", "css", "js"' : '"html", "css"'}],
  "demoNote": "TODO: one or two sentences saying what to try on the page. Not a list of every example.",
  "contract": {
    "useWhen": "TODO: one line -- when to reach for this rather than the nearest alternative. It is also this component's row in the agent index, where the whole roster shares one budget.",
    "root": [".ac-${slug}"],
    "failureModes": [
      "TODO: how this pattern goes wrong in someone else's app -- not what your demo happens to show"
    ]${
      withJs
        ? `,
    "api": [
      "AC.create${pascal}(root, options) -> { destroy }"
    ]`
        : ''
    }
  }
}
`;

const docs = `## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS${withJs ? ' and JS' : ''} sections name which
examples need them.

## Required markup

TODO: two or three sentences on the shape of the pattern, then the table. Rows in
DOM order, top to bottom.

| Element | Attribute | What it does |
| --- | --- | --- |
| | | |

## Keyboard

TODO: every key in contract.keyboard, in this order -- Tab, Enter, Space, arrows,
Home/End, Esc, typing. Keep this table even if the native element supplies every
key. Finish with the keys you deliberately did not bind, and why.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> | |

## States

TODO: default, hover, focus, active, disabled, empty, error -- whichever apply.

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| | | |

## Screen reader behavior

TODO: what NVDA, JAWS, VoiceOver and TalkBack actually announce, and anywhere
they differ. Say what was tested rather than what should happen.
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
## Common mistakes

TODO: the mistakes people actually make with this pattern. Bulleted, bold lead-in,
one sentence each.

## Related

TODO: links to the components this one sits next to, or delete this section.
`;

const spec = `import { test, expect } from '@playwright/test';

const PAGE = 'components/${slug}/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// Assert the ARIA contract and the keyboard map from this component's meta.json
// contract block -- not merely that the thing rendered. A test that only checks
// for presence would still pass if every attribute were wrong. Every key that
// block names has to be pressed here; agent-surfaces.spec.mjs checks that it is.

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
  1. Fill in the "contract" block in meta.json. The three required fields are
     scaffolded; add aria, keyboard and states as the component grows. You do not
     have to guess what is missing -- the suite reads your own markup and JS and
     names anything they do that the contract does not admit to. Keep "root"
     pointing at your component's real elements if you rename the class.
  2. Fill in the rest of meta.json (summary, tags, apg, wcag) and flip status to
     "stable". The summary has its own voice rule -- CLAUDE.md > Writing style.
  3. npm run agents      (renders agents/components/${slug}.md from that contract)
  4. npm run check:tokens && npm run build
  5. npx playwright test --project=chromium ${slug}
  6. Tick the row in docs/BUILD-STATUS.md`);
