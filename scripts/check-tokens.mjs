/**
 * Token linter.
 *
 * The library's contract is that every themeable value is written as a chain:
 *
 *     background: var(--ac-surface, var(--bg-panel, #110620));
 *
 * A color that appears anywhere *other* than the last fallback slot is a bug:
 * it will not respond to the theme picker, and it silently breaks for anyone
 * who drops the component into a themed app. This catches that.
 *
 * Allowed anywhere: `transparent`, `currentColor`, and the CSS system colors
 * (`Canvas`, `CanvasText`, `Highlight`, `ButtonBorder`, ...), which are exactly
 * what a `@media (forced-colors: active)` block is supposed to use.
 *
 *   node scripts/check-tokens.mjs
 *
 * Exits non-zero on the first file with violations, listing every one.
 */
import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Colors that carry meaning the theme cannot supply, so they are never linted. */
const ALLOWED = new Set(
  [
    'transparent',
    'currentcolor',
    'inherit',
    'initial',
    'unset',
    'revert',
    'none',
    // CSS system colors -- required for forced-colors (Windows High Contrast).
    'canvas',
    'canvastext',
    'linktext',
    'visitedtext',
    'activetext',
    'buttonface',
    'buttontext',
    'buttonborder',
    'field',
    'fieldtext',
    'highlight',
    'highlighttext',
    'selecteditem',
    'selecteditemtext',
    'mark',
    'marktext',
    'graytext',
    'accentcolor',
    'accentcolortext',
  ].map((s) => s.toLowerCase()),
);

/** Literal color syntaxes that must only ever appear as a var() fallback. */
const COLOR_PATTERNS = [
  { name: 'hex color', re: /#[0-9a-fA-F]{3,8}\b/g },
  { name: 'rgb()', re: /\brgba?\s*\(/g },
  { name: 'hsl()', re: /\bhsla?\s*\(/g },
  // The lookarounds keep this from firing on a color word embedded in an
  // identifier -- `--ac-accent-pink` is a token name, not a literal color.
  {
    name: 'named color',
    re: /(?<![\w-])(?:red|blue|green|yellow|orange|purple|pink|white|black|gray|grey|cyan|magenta|silver|navy|teal|olive|maroon|lime|aqua|fuchsia)(?![\w-])/gi,
  },
];

/**
 * Strip /* ... *\/ comments so documentation examples are not linted, keeping
 * newlines intact so reported line numbers still match the original file.
 */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * Blank out every `var(...)` expression, tracking nested parens so that
 * `var(--a, var(--b, #fff))` is removed whole. Whatever color literal survives
 * this pass was NOT in a fallback position.
 */
function stripVarExpressions(css) {
  const out = css.split('');
  for (let i = 0; i < css.length; i++) {
    if (css.startsWith('var(', i)) {
      let depth = 0;
      let j = i + 3; // at the '('
      for (; j < css.length; j++) {
        if (css[j] === '(') depth++;
        else if (css[j] === ')') {
          depth--;
          if (depth === 0) break;
        }
      }
      for (let k = i; k <= Math.min(j, css.length - 1); k++) {
        if (out[k] !== '\n') out[k] = ' ';
      }
      i = j;
    }
  }
  return out.join('');
}

function lineOf(css, index) {
  return css.slice(0, index).split('\n').length;
}

/**
 * The middle link has to be a token that something actually defines.
 *
 * A chain whose theme token is misspelled does not fail -- it quietly resolves
 * to the standalone literal and stops following the theme picker forever. In a
 * dark theme that is invisible, because the literal *is* a dark-theme color;
 * in a light theme it is dark text on a dark fill. `--bg-elev` (the token is
 * `--bg-elevated`) sat in tooltip at 1.01:1 in every light theme, and
 * `--accent` (it is `--accent-blue`) had four components ignoring the theme
 * entirely. Both were found by an axe sweep, not by reading the CSS.
 */
const TOKEN_SOURCES = [
  'src/site/theme/theme.css',
  'src/site/theme/effects.css',
  'src/site/styles/site.css',
  'src/library/tokens/tokens.css',
];

/** Middle tokens theme-service genuinely does not ship. The chain is dead at
 *  the middle link on purpose and the literal is the value in every theme. */
const NO_THEME_TOKEN = new Set([
  '--dur-slow', // theme-service ships --dur only; a slow variant is ours.
  '--backdrop', // no backdrop token exists; a dark dim is right in every theme.
]);

const definedTokens = new Set();
for (const source of TOKEN_SOURCES) {
  let css;
  try {
    css = await readFile(resolve(root, source), 'utf8');
  } catch {
    continue; // tokens.css is optional and the theme dir may not be synced yet.
  }
  for (const match of css.matchAll(/^\s*(--[\w-]+)\s*:/gm)) definedTokens.add(match[1]);
}

const files = [];
for await (const entry of glob('src/library/**/*.css', { cwd: root })) {
  files.push(entry);
}
files.sort();

let violations = 0;

for (const file of files) {
  const abs = resolve(root, file);
  const original = await readFile(abs, 'utf8');
  const searchable = stripVarExpressions(stripComments(original));

  for (const { name, re } of COLOR_PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(searchable)) !== null) {
      const text = match[0];
      if (ALLOWED.has(text.toLowerCase().replace(/[\s(]+$/, ''))) continue;

      violations++;
      console.error(
        `${relative(root, abs).replace(/\\/g, '/')}:${lineOf(searchable, match.index)}  ` +
          `${name} "${text.trim()}" is not in a var() fallback position`,
      );
    }
  }

  // Second pass, on the commented-out source so documentation examples like
  // var(--ac-token, var(--theme-token, #fallback)) are not linted.
  const decommented = stripComments(original);
  for (const match of decommented.matchAll(/var\(\s*--[\w-]+\s*,\s*var\(\s*(--[\w-]+)/g)) {
    const token = match[1];
    if (definedTokens.has(token) || NO_THEME_TOKEN.has(token)) continue;

    violations++;
    console.error(
      `${relative(root, abs).replace(/\\/g, '/')}:${lineOf(decommented, match.index)}  ` +
        `theme token "${token}" is not defined by theme-service, so this chain ` +
        `silently resolves to its literal in every theme`,
    );
  }
}

if (violations > 0) {
  console.error(
    `\ncheck-tokens: ${violations} violation${violations === 1 ? '' : 's'} in ${files.length} file(s).\n` +
      'Every color must be written as var(--ac-token, var(--theme-token, #literal)) so the\n' +
      'theme picker can drive it. See docs/authoring-a-component.md.',
  );
  process.exit(1);
}

console.log(`check-tokens: ${files.length} file(s) clean.`);
