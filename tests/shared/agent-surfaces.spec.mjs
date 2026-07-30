/**
 * The agent surfaces, asserted against reality.
 *
 * `npm run check:agents` proves the generated files match their sources. It
 * cannot prove the sources are *true*: the generator never opens
 * `component.html`, `component.css` or `component.js`, so a contract that names
 * a role nobody wrote, a key nobody handles or a factory nobody registered
 * renders perfectly and lies. This file closes that gap for everything a
 * contract claims.
 *
 * It is the pattern `typography`, `data-table` and `prose-surface` already use
 * for their on-page readouts: a claim written by a person, proven against the
 * real thing, so it cannot quietly stop being correct.
 *
 * Two checks the plan specified are deliberately absent, and one is deliberately
 * different -- see "Phase 2, as revised" in docs/agent-layer.md:
 *
 *   - `contract.pattern` does not exist. meta.json already has `apg`.
 *   - `failureModes` is NOT reconciled against the count of BROKEN ON PURPOSE
 *     comments. Those comments run 0 to 6 per component and the zero ones
 *     include `dropdown` and `field`, whose failure modes are the richest in the
 *     library; the count would have forced them empty. A broken demo is a
 *     teaching device on a page. A failure mode is how the pattern goes wrong in
 *     someone else's app. They are not the same list.
 */
import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { TIER_2_BUDGET, SKILL_OUT } from '../../scripts/build-agent-surfaces.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const componentsDir = resolve(root, 'src/library/components');

const read = (path) => readFileSync(path, 'utf8').replace(/^﻿/, '');

/** Every component, with the files a contract has to be true about. */
const COMPONENTS = readdirSync(componentsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .filter((entry) => existsSync(resolve(componentsDir, entry.name, 'meta.json')))
  .map((entry) => {
    const dir = resolve(componentsDir, entry.name);
    const meta = JSON.parse(read(resolve(dir, 'meta.json')));
    const specFile = resolve(dir, 'tests', `${entry.name}.spec.mjs`);
    return {
      slug: meta.slug ?? entry.name,
      name: meta.name ?? entry.name,
      files: meta.files ?? ['html', 'css', 'js'],
      contract: meta.contract ?? null,
      js: existsSync(resolve(dir, 'component.js')) ? read(resolve(dir, 'component.js')) : '',
      css: existsSync(resolve(dir, 'component.css')) ? read(resolve(dir, 'component.css')) : '',
      spec: existsSync(specFile) ? read(specFile) : '',
    };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

const SLUGS = new Set(COMPONENTS.map((c) => c.slug));
const DEMO = '.demo';

/* --- helpers -------------------------------------------------------------- */

/**
 * Turn a contract token into a CSS attribute selector.
 *
 * A token is `attr` or `attr=value`. The value is matched exactly only when it
 * is a literal -- no spaces, no `<` -- so `aria-describedby="<hint id> <error
 * id>"` in a contract means "this attribute is present", which is all a
 * space-separated idref list can be asserted to be from the outside.
 */
function selectorFor(token) {
  const split = token.indexOf('=');
  const attr = split === -1 ? token : token.slice(0, split);
  const value = split === -1 ? null : token.slice(split + 1);

  if (!/^[a-zA-Z][a-zA-Z-]*$/.test(attr)) return null;
  if (value === null || value.includes(' ') || value.includes('<')) return `[${attr}]`;
  return `[${attr}="${value}"]`;
}

/**
 * Keys as a contract writes them, as strings the component's own spec would
 * contain. Playwright spells the space bar `' '` as often as `'Space'`.
 */
const KEY_SPELLINGS = { Space: ['Space', "press(' ')", 'press(" ")'] };

/** A key the browser implements for a native control has no handler to test. */
const NATIVE = 'native:';

/* --- 1 · every component has a contract, and it fits ---------------------- */

test.describe('contract blocks', () => {
  // The generator validates the shape and refuses to render a malformed one, so
  // this is the coverage check: a component with no contract is invisible at
  // Tier 2, and the read path would send an agent to a file that is not there.
  test('every component has one', () => {
    const missing = COMPONENTS.filter((c) => !c.contract).map((c) => c.slug);
    expect(missing, `no "contract" in meta.json:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  test('every rendered Tier 2 file is under budget', () => {
    const over = [];
    for (const { slug } of COMPONENTS) {
      const file = resolve(root, 'agents/components', `${slug}.md`);
      if (!existsSync(file)) continue; // the coverage check above owns this
      const bytes = Buffer.byteLength(read(file), 'utf8');
      if (bytes > TIER_2_BUDGET) over.push(`${slug}: ${bytes} > ${TIER_2_BUDGET}`);
    }
    expect(over, `over the Tier 2 budget:\n  ${over.join('\n  ')}`).toEqual([]);
  });

  // Replaces the failure-mode count. Weak on its own, but it is the field an
  // author is most tempted to leave for later, and "later" is never.
  test('failureModes is never empty', () => {
    const empty = COMPONENTS.filter((c) => c.contract && !c.contract.failureModes?.length).map(
      (c) => c.slug,
    );
    expect(empty, `empty failureModes:\n  ${empty.join('\n  ')}`).toEqual([]);
  });

  // A dead cross-link is a dead end for the agent that followed it.
  test('every seeAlso slug resolves to a component', () => {
    const broken = [];
    for (const { slug, contract } of COMPONENTS) {
      for (const other of contract?.seeAlso ?? []) {
        if (!SLUGS.has(other)) broken.push(`${slug} -> ${other}`);
        if (other === slug) broken.push(`${slug} -> itself`);
      }
    }
    expect(broken, `seeAlso does not resolve:\n  ${broken.join('\n  ')}`).toEqual([]);
  });
});

/* --- 3 · a documented key is a tested key --------------------------------- */

test.describe('keyboard maps', () => {
  test('every key a contract names is pressed by that component\'s spec', () => {
    const untested = [];

    for (const { slug, contract, spec } of COMPONENTS) {
      for (const [keys, effect] of contract?.keyboard ?? []) {
        // The browser owns this one, so there is no library code to exercise and
        // testing it would be testing Chromium. The exemption is visible in the
        // rendered Tier 2 file, so it is a claim rather than a silent skip.
        if (effect.startsWith(NATIVE)) continue;

        for (const key of keys.split('/').map((k) => k.trim())) {
          const spellings = KEY_SPELLINGS[key] ?? [key];
          if (!spellings.some((spelling) => spec.includes(spelling))) {
            untested.push(`${slug}: ${key}`);
          }
        }
      }
    }

    expect(
      untested,
      `documented but never pressed in the component's own spec:\n  ${untested.join('\n  ')}`,
    ).toEqual([]);
  });
});

/* --- 4 · the API is real -------------------------------------------------- */

test.describe('API signatures', () => {
  test('every factory a contract names is registered on global.AC', () => {
    const problems = [];

    for (const { slug, contract, files, js } of COMPONENTS) {
      const api = contract?.api ?? [];
      if (!api.length) continue;

      if (!files.includes('js')) {
        problems.push(`${slug}: has an api but meta.json files has no "js"`);
        continue;
      }
      for (const signature of api) {
        const name = signature.match(/^AC\.(\w+)\s*\(/)?.[1];
        if (!name) {
          problems.push(`${slug}: cannot read a factory name out of "${signature}"`);
          continue;
        }
        // The real registration, not `window.AC` -- component.js is an IIFE
        // taking the global as a parameter.
        if (!new RegExp(`\\bglobal\\.AC\\.${name}\\s*=`).test(js)) {
          problems.push(`${slug}: component.js never registers ${name}`);
        }
      }
    }

    expect(problems, `API claims that are not real:\n  ${problems.join('\n  ')}`).toEqual([]);
  });

  test('a component with no JS claims no API', () => {
    const wrong = COMPONENTS.filter((c) => !c.files.includes('js') && c.contract?.api?.length).map(
      (c) => c.slug,
    );
    expect(wrong, `CSS-only components claiming an API:\n  ${wrong.join('\n  ')}`).toEqual([]);
  });
});

/* --- 8 · the cross-cutting prose points at things that exist -------------- */

/**
 * The four Tier 4 surfaces are prose, and prose cannot be asserted. What *can*
 * be asserted is the part of them that is a reference: they earn their keep by
 * naming the component in this library that has each fix live, and a name is
 * exactly the thing a rename breaks silently.
 *
 * Two forms are checked, both distinctive enough to match without parsing the
 * sentence around them:
 *
 *   `badge`'s ...        a possessive, which prose here only uses for a slug
 *   `jump-nav` is the precedent
 *
 * A mention in any other shape is not checked. That is a deliberate floor, not
 * an oversight -- widening the pattern to catch `field` keeps ... would also
 * catch every backticked CSS property in the file.
 */
const PROSE_SURFACES_OUT = ['pitfalls', 'conventions', 'verify', 'testing'].map((name) => ({
  name,
  text: read(resolve(root, `agents/${name}.md`)),
}));

const SLUG_REFERENCE = /`([a-z][a-z0-9-]*)`(?:'s?|\s+is the precedent\b)/g;
const MARKER_REFERENCE = /`([a-z][a-z0-9-]*)`'?s? `(\[[A-Z]+\])`/g;

test.describe('cross-cutting surfaces', () => {
  test('every component a pitfall names still exists', () => {
    const missing = [];

    for (const { name, text } of PROSE_SURFACES_OUT) {
      for (const [, slug] of text.matchAll(SLUG_REFERENCE)) {
        if (!SLUGS.has(slug)) missing.push(`agents/${name}.md names \`${slug}\`, which is not a component`);
      }
    }

    expect(missing, `dead references:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  test('every source-comment marker a pitfall points at is still in that component', () => {
    // `effects`' `[PATCH]` is the only way a reader finds the block worth
    // lifting. A section renamed in the CSS leaves the pitfall pointing at
    // nothing, and nothing else in the repo would notice.
    const dead = [];

    for (const { name, text } of PROSE_SURFACES_OUT) {
      for (const [, slug, marker] of text.matchAll(MARKER_REFERENCE)) {
        const component = COMPONENTS.find((c) => c.slug === slug);
        if (!component) continue; // the reference test above owns this case
        if (!component.css.includes(marker) && !component.js.includes(marker)) {
          dead.push(`agents/${name}.md points at ${slug}'s ${marker}, which is in neither its CSS nor its JS`);
        }
      }
    }

    expect(dead, `dead section markers:\n  ${dead.join('\n  ')}`).toEqual([]);
  });

  test('a reference is actually being found, so the checks above cannot pass vacuously', () => {
    // Both patterns are regexes over prose. A rewrite that stopped using the
    // possessive would make them match nothing and pass forever.
    const slugs = PROSE_SURFACES_OUT.flatMap(({ text }) => [...text.matchAll(SLUG_REFERENCE)]);
    const markers = PROSE_SURFACES_OUT.flatMap(({ text }) => [...text.matchAll(MARKER_REFERENCE)]);

    expect(slugs.length, 'no component references found in agents/*.md at all').toBeGreaterThan(5);
    expect(markers.length, 'no source-comment markers found in agents/*.md at all').toBeGreaterThan(0);
  });
});

/* --- 9 · Tier 0 points at files that are really there --------------------- */

/**
 * The three Tier 0 renderings -- a checkout reads AGENTS.md, a fetcher reads
 * llms.txt, Claude Code loads the skill.
 *
 * `--check` proves all three match the preamble. It cannot prove the preamble is
 * true about the repo, and two of its claims are: the rule naming
 * `docs/BUILD-STATUS.md` and `CLAUDE.md` as the files never to read, and the
 * skill's audience note naming the same two as a contributor's files. Rename
 * either and Tier 0 forbids a file that is not there, while the skill sends a
 * contributor nowhere.
 */
const TIER_0 = ['AGENTS.md', 'agents/llms.txt', SKILL_OUT].map((path) => ({
  path,
  text: read(resolve(root, path)),
}));

/**
 * Only `.md`, and only without a metacharacter. The read path is mostly
 * templates -- `<slug>`, `{docs.md,meta.json}` -- which name no single file, and
 * `llms.txt` is written bare in prose while living at `agents/llms.txt`. What is
 * left is every path a reader could open verbatim.
 */
const MD_PATH = /`([^`\n]+\.md)`/g;
const TEMPLATED = /[<>{}|*]/;

test.describe('Tier 0 references', () => {
  test('every repo file a Tier 0 surface names verbatim exists', () => {
    // Deduplicated: the skill names `CLAUDE.md` twice, in its audience note and
    // again in the rules, and one fix covers both.
    const missing = new Set();
    let checked = 0;

    for (const { path, text } of TIER_0) {
      for (const [, named] of text.matchAll(MD_PATH)) {
        if (TEMPLATED.test(named)) continue;
        checked++;
        if (!existsSync(resolve(root, named))) missing.add(`${path} names \`${named}\``);
      }
    }

    // Same guard as the pitfall references: a regex over prose that stops
    // matching passes forever. Six is the floor the current surfaces clear.
    expect(checked, 'no verbatim .md paths found in Tier 0 at all').toBeGreaterThan(5);
    expect(
      [...missing],
      `Tier 0 points at files that do not exist:\n  ${[...missing].join('\n  ')}`,
    ).toEqual([]);
  });

  test('the skill is not gitignored, so it will actually commit', () => {
    // The one claim in this phase that would fail silently and completely: a
    // skill that does not commit is a skill nobody but its author ever loads,
    // and every other check here would still pass. .gitignore excludes
    // `.claude/settings.local.json` only, and this is what holds that to it.
    let ignored = false;
    try {
      execFileSync('git', ['check-ignore', '-q', '--', SKILL_OUT], { cwd: root, stdio: 'pipe' });
      ignored = true; // exit 0 means git would ignore the path
    } catch (err) {
      // 1 is "not ignored", which is the answer we want. Anything else -- no
      // git, not a work tree -- is a real failure and should say so.
      if (err.status !== 1) throw err;
    }
    expect(ignored, `${SKILL_OUT} is gitignored, so the skill would never reach a clone`).toBe(false);
  });
});

/* --- 10 · the one duplication between the two audiences ------------------- */

/**
 * `CLAUDE.md` and `agents/conventions.md` deliberately state the same conventions
 * to different readers -- one is a checklist for someone adding a component, the
 * other is an explanation for someone pasting one out -- and most of what each
 * says is its own. What they genuinely share is the canonical CSS shapes: the
 * three-level token chain, the accent mixed toward `--text`, and the motion
 * `calc()`. Those carry token names, a percentage and a duration, which is
 * exactly the kind of detail that gets updated in one file only.
 *
 * `CLAUDE.md` is canonical, because a contributor changing a convention is
 * editing that file. Extracted from its "Non-negotiable conventions" section by
 * heading, never by parsing the prose.
 */
const CANONICAL_CSS = (() => {
  const section = read(resolve(root, 'CLAUDE.md'))
    .split('## Non-negotiable conventions')[1]
    ?.split('\n## ')[0];
  if (!section) return [];
  return [...section.matchAll(/```css\n([\s\S]*?)```/g)]
    .flatMap(([, block]) => block.split('\n'))
    // A declaration, not the annotation comment under the first one. The
    // trailing semicolon goes because conventions.src.md writes one of the three
    // inline in a sentence rather than in a fenced block.
    .map((line) => line.trim().replace(/;$/, ''))
    .filter((line) => line && !line.startsWith('/*'));
})();

test.describe('the contributor and agent conventions agree', () => {
  test('every CSS shape CLAUDE.md mandates is the shape the agent surface teaches', () => {
    const source = read(resolve(root, 'docs/agents/conventions.src.md'));

    // Guards the extraction, not the docs: a renamed heading or a fence that
    // stopped being ```css would silently leave nothing to compare and pass.
    expect(
      CANONICAL_CSS.length,
      'no CSS declarations found under CLAUDE.md "## Non-negotiable conventions"',
    ).toBeGreaterThan(2);

    const drifted = CANONICAL_CSS.filter((declaration) => !source.includes(declaration));
    expect(
      drifted,
      `in CLAUDE.md but not in docs/agents/conventions.src.md:\n  ${drifted.join('\n  ')}`,
    ).toEqual([]);
  });
});

/* --- 11 · the human entry point's links resolve --------------------------- */

/**
 * `README.md` is the human door and the only hand-written file here with
 * markdown links -- every link under `agents/` points outward at a spec, and
 * `CLAUDE.md` writes its paths in backticks, which section 9 already covers.
 * So a moved `docs/at-support.md` or `docs/agent-layer.md` breaks on the
 * repository's most-read page and nothing says so.
 *
 * Different shape from section 9: a link target, not inline code, and the
 * failure is a reader's dead end rather than a false claim.
 */
const MD_LINK = /\[[^\]]+\]\(([^)\s]+)\)/g;
const EXTERNAL = /^(https?:|mailto:|#)/;

test.describe('README links', () => {
  test('every repo file README.md links to exists', () => {
    const text = read(resolve(root, 'README.md'));
    const missing = [];
    let checked = 0;

    for (const [, target] of text.matchAll(MD_LINK)) {
      if (EXTERNAL.test(target)) continue;
      const path = target.split('#')[0];
      // A target that escapes the repo -- `../theme-service` -- is deliberately
      // not checked. It would pass on a machine that has the sibling checkout
      // and fail in CI, which is worse than not checking. Same reason phase 4's
      // path check was not extended to CLAUDE.md.
      const absolute = resolve(root, path);
      if (!absolute.startsWith(resolve(root))) continue;
      checked++;
      if (!existsSync(absolute)) missing.push(target);
    }

    // A regex over prose that stops matching passes forever. Three is the floor
    // the current README clears.
    expect(checked, 'no in-repo markdown links found in README.md at all').toBeGreaterThan(2);
    expect(
      missing,
      `README.md links to files that do not exist:\n  ${missing.join('\n  ')}`,
    ).toEqual([]);
  });
});

/* --- 7 · the generated surfaces match their sources ---------------------- */

test.describe('generated surfaces', () => {
  test('--check is clean', () => {
    // Same command CI runs. Asserted here too so a suite run on its own is
    // enough to catch a meta.json edited without regenerating. Run as a
    // subprocess rather than by importing: the drift report is what is worth
    // seeing, and it goes to stderr.
    let failure = null;
    try {
      execFileSync(process.execPath, ['scripts/build-agent-surfaces.mjs', '--check'], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (err) {
      failure = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim() || err.message;
    }
    expect(failure, `\n${failure}`).toBeNull();
  });
});

/* --- 2 and 6 · in the browser -------------------------------------------- */

for (const { slug, name, contract } of COMPONENTS) {
  if (!contract) continue;

  test.describe(`${slug} (${name})`, () => {
    const PAGE = `components/${slug}/`;

    test('every role and attribute the contract names is in the shipped markup', async ({ page }) => {
      await page.goto(PAGE);

      const tokens = Object.entries(contract.aria ?? {}).flatMap(([part, attrs]) =>
        attrs.map((token) => ({ part, token, selector: selectorFor(token) })),
      );
      const unreadable = tokens.filter((t) => !t.selector);
      expect(
        unreadable,
        `not an attribute token:\n  ${unreadable.map((t) => `${t.part}: ${t.token}`).join('\n  ')}`,
      ).toEqual([]);
      if (!tokens.length) return;

      // Outside any deliberately broken example. A contract describes what has
      // to be in the markup you copy, and the broken variants are the markup you
      // must not -- so finding the attribute only inside one is a miss, which is
      // exactly the confusion this check exists to prevent.
      const missing = await page.evaluate(
        ({ demo, selectors }) => {
          const scope = document.querySelector(demo);
          if (!scope) return selectors.map((s) => `${s} (no ${demo} on the page)`);
          return selectors.filter((selector) => {
            const found = [...scope.querySelectorAll(selector)];
            return !found.some((el) => !el.closest('[data-ac-demo-broken]'));
          });
        },
        { demo: DEMO, selectors: tokens.map((t) => t.selector) },
      );

      const named = missing.map(
        (selector) => `${tokens.find((t) => t.selector === selector).part}: ${selector}`,
      );
      expect(
        named,
        `claimed by the contract, absent from the demo outside a broken example:\n  ${named.join(
          '\n  ',
        )}`,
      ).toEqual([]);
    });

    test('the served files the contract points at exist', async ({ request }) => {
      // Tier 2 tells an agent to fetch these. A 404 here is the read path
      // breaking at the last hop, which is the one that matters.
      const responses = await Promise.all(
        [`library/components/${slug}/meta.json`, `library/components/${slug}/docs.md`].map((path) =>
          request.get(path).then((r) => `${path}: ${r.status()}`),
        ),
      );
      expect(responses.filter((r) => !r.endsWith(': 200'))).toEqual([]);
    });
  });
}
