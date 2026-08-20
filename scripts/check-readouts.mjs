#!/usr/bin/env node
/**
 * Demo readouts have to be scoped.
 *
 * A readout is the `<code data-ac-<abbr>-out="key">` a demo prints its own
 * measurements into. The keys are short and repeat across examples on purpose,
 * so what keeps two of them apart is the element the lookup starts from.
 *
 *   root.querySelector('[data-ac-nc-out="' + name + '"]')     scoped
 *   document.querySelector('[data-ac-nc-out="' + name + '"]') page-wide
 *
 * The page-wide form silently writes to the first match, and the second readout
 * never updates. It looks like a component that stopped reporting rather than a
 * selector that found the wrong element, and it was caught by eye in
 * `status-text` before that component shipped.
 *
 *   node scripts/check-readouts.mjs
 *
 * WHY NOT "KEYS ARE UNIQUE PER PAGE". That was the obvious check and it is the
 * wrong one: `disclosure` carries `data-ac-disc-out="stops"` twice, in two
 * different `.ac-disclosure-frame` elements, each read by its own frame-scoped
 * lookup. Both update correctly. A uniqueness lint would fail on working code.
 * Scoping is the property that makes a duplicate key safe, so scoping is what
 * is checked.
 *
 * Two rules, because a lint that sweeps nothing reports a pass:
 *
 *   SCOPED  every readout lookup starts from an element, never from `document`
 *   SWEPT   a component with a component.js and readout markup has at least one
 *           such lookup, so renaming the convention fails here rather than
 *           quietly emptying the check
 *
 * CSS-only components are exempt from SWEPT by construction. `data-table` and
 * `prose-surface` print their readouts as static markup and their own specs
 * assert those strings against the real accessibility tree -- nothing resolves
 * them at runtime, so there is nothing to scope.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS = resolve(root, 'skill/library/components');

/** A selector naming a readout attribute, in any quoting or concatenation. */
const READOUT = /data-ac-[\w-]*-out\b/;

/** Receivers that reach the whole page however they are spelled. */
function isPageWide(receiver) {
  return /(^|\.)(document|ownerDocument)$/.test(receiver) || /^(window\.)?document\./.test(receiver);
}

/**
 * Blank out comments, keeping newlines so reported line numbers still match.
 * Same treatment check-tokens.mjs gives CSS, and for the same reason: the file
 * headers in this library explain their own mechanisms, and an explanation is
 * not a call site.
 */
function stripComments(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length));
}

/** From the `(` of a call, the argument text, with nesting balanced. */
function argumentsOf(js, open) {
  let depth = 0;
  for (let i = open; i < js.length; i++) {
    if (js[i] === '(') depth++;
    else if (js[i] === ')') {
      depth--;
      if (depth === 0) return js.slice(open + 1, i);
    }
  }
  return js.slice(open + 1);
}

function lineOf(js, index) {
  return js.slice(0, index).split('\n').length;
}

const slugs = (await readdir(COMPONENTS, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const problems = [];
let lookups = 0;
let components = 0;

for (const slug of slugs) {
  const jsPath = resolve(COMPONENTS, slug, 'component.js');
  const htmlPath = resolve(COMPONENTS, slug, 'component.html');
  if (!existsSync(jsPath)) continue;

  const js = stripComments(await readFile(jsPath, 'utf8'));
  const html = existsSync(htmlPath) ? await readFile(htmlPath, 'utf8') : '';

  let found = 0;
  for (const match of js.matchAll(/([\w$.[\]'"]+)\.(querySelectorAll|querySelector)\s*\(/g)) {
    const open = match.index + match[0].length - 1;
    if (!READOUT.test(argumentsOf(js, open))) continue;

    found++;
    lookups++;
    if (isPageWide(match[1])) {
      problems.push(
        `skill/library/components/${slug}/component.js:${lineOf(js, match.index)}  ` +
          `readout lookup starts from \`${match[1]}\`, so it resolves page-wide`,
      );
    }
  }

  if (found > 0) components++;
  else if (READOUT.test(html)) {
    problems.push(
      `skill/library/components/${slug}  has readout markup and a component.js, but no ` +
        `lookup this check can see -- if the convention moved, move this check with it`,
    );
  }
}

if (problems.length) {
  for (const problem of problems) console.error(problem);
  console.error(
    `\ncheck-readouts: ${problems.length} problem${problems.length === 1 ? '' : 's'}.\n` +
      'Scope the lookup to the component root, or to whatever element bounds the example --\n' +
      'a readout key is only unique inside the element its lookup starts from.',
  );
  process.exit(1);
}

console.log(`check-readouts: ${lookups} scoped lookup(s) across ${components} component(s).`);
