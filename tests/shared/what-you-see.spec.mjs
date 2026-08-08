/**
 * Rule 1 of CLAUDE.md, asserted.
 *
 *     What you see is what you copy. The live demo and the code panel load the
 *     *same physical files*. Never introduce a transform between them.
 *
 * Nothing enforced it. The rule is the library's whole premise -- a visitor
 * reads the panel, copies it, and expects the thing they just watched work --
 * and it can break with no error, no failing assertion and a page that renders
 * perfectly.
 *
 * FOUR BYTE PATHS, WHICH IS WHY THIS NEEDS A TEST
 * A component's source reaches the page four different ways, and only two of
 * them are the same journey:
 *
 *   the panel's text      import.meta.glob(...'?raw') -> src/library/, inlined
 *                         into the HTML at build time and syntax-highlighted
 *   the Copy button       the same string, verbatim, in data-code
 *   the demo's CSS/JS     <link> and <script src> -> public/library/, which
 *                         scripts/sync-library.mjs copies from src/library/
 *   the download link     the same public/library/ file
 *
 * So the bytes the visitor reads and the bytes the browser runs travel
 * different roads, and either can go stale without the other noticing.
 *
 * THE TWO WAYS IT BREAKS, BOTH SILENT
 *
 *   1. The sync does not run, or drops a file. public/ keeps the previous
 *      version, the panel shows the current one, and the demo on screen is not
 *      the code beside it. Everything still renders. Red-probed: appending one
 *      comment to a component.css without re-syncing fires three of these
 *      tests.
 *
 *   2. The tag stops pointing at the real file. A bundler that resolves it, a
 *      hashed asset URL, a path edited by hand -- what executes is no longer
 *      something anybody can copy. So the URL is read off the rendered page and
 *      fetched, rather than constructed here from the slug: a test that builds
 *      its own path proves the server works, not that the page uses it.
 *
 * The demo's *markup* is safe by construction and is checked anyway: it is the
 * same `?raw` string the panel renders, used twice on one page, so the two
 * cannot disagree. Only its download link can go stale.
 *
 * WHAT THIS DOES NOT COVER
 * Hand-written excerpts elsewhere on the site -- the home page hero types out a
 * Form Field snippet -- are prose about a component rather than a copy of one.
 * No byte comparison reaches them, and none should.
 */
import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, join } from 'node:path';

// The same predicate the sync itself uses, imported rather than restated: tests
// live beside their component and are deliberately not served, and a second copy
// of that rule would drift into a passing test that checks nothing.
import { isServed } from '../../scripts/sync-library.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const srcLibrary = resolve(root, 'src/library');
const publicLibrary = resolve(root, 'public/library');
const componentsDir = resolve(srcLibrary, 'components');

/**
 * Read as bytes, not as text. A comparison that decodes first would call a file
 * and its re-encoded copy identical, and re-encoding is exactly what
 * PowerShell's Set-Content does to this repo -- see the encoding gotcha in
 * docs/BUILD-STATUS.md.
 */
const bytes = (path) => readFileSync(path);

/** Every registered component, from the same meta.json the site builds from. */
const COMPONENTS = readdirSync(componentsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const meta = JSON.parse(readFileSync(resolve(componentsDir, entry.name, 'meta.json'), 'utf8'));
    return {
      slug: meta.slug ?? entry.name,
      name: meta.name ?? entry.name,
      files: meta.files ?? ['html', 'css', 'js'],
    };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

/**
 * Every file under a directory that the sync would publish, as paths relative to
 * it. `isServed` is applied to the absolute path, the same way `fs.cp` applies
 * it, so a directory it excludes is not descended into either.
 */
function walk(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (!isServed(full)) return [];
    if (entry.isDirectory()) return walk(full, base);
    return [relative(base, full).replace(/\\/g, '/')];
  });
}

/**
 * Vite's `?raw` import strips a file's trailing newline, and everything the page
 * inlines comes through it: the panel's highlighted text, the Copy button's
 * `data-code`, and the demo markup itself. The file served over HTTP is copied
 * by `fs.cp` and keeps it, so the two disagree by exactly one byte at the very
 * end and by nothing else.
 *
 * Measured rather than assumed: rebuilt with `compressHTML: false` and the
 * newline is still gone, so it is not Astro's compressor trimming the attribute.
 *
 * So the comparison allows that one byte and nothing more. Any other difference
 * -- a re-encode, a minifier, a stray transform -- still fails, which is the
 * whole point of the file.
 *
 * CRLF IS NOT ALLOWED FOR, AND THAT IS DELIBERATE
 * The HTML parser normalizes CRLF to LF while reading an attribute value, so a
 * source file with Windows endings arrives in `data-code` as LF while the copy
 * served over HTTP keeps its CRs. The clipboard and the download link then hand
 * over different bytes. This test found exactly that on its first run --
 * `drawer/component.html`, 217 CRLF lines, the only such file in the library --
 * and it was a working-tree artifact: the committed blob was already LF, so CI
 * would never have seen it. Normalizing the file is the fix; loosening this
 * comparison is not.
 */
const asInlined = (source) => source.replace(/\n$/, '');

/** The panel's tab order in [slug].astro: HTML, then CSS, then JS. */
const TABS = [
  { ext: 'html', label: 'HTML' },
  { ext: 'css', label: 'CSS' },
  { ext: 'js', label: 'JS' },
];

/* --- 1 · the sync ---------------------------------------------------------
   Node only, no browser. public/library/ is generated and gitignored, so this
   is the first thing that goes stale and the last thing anyone looks at. */

test.describe('src/library -> public/library', () => {
  test('every source file is in public, byte for byte', () => {
    const drifted = [];

    for (const path of walk(srcLibrary)) {
      const copy = resolve(publicLibrary, path);
      if (!existsSync(copy)) {
        drifted.push(`${path}: never synced`);
        continue;
      }
      const from = bytes(resolve(srcLibrary, path));
      const to = bytes(copy);
      if (!from.equals(to)) {
        drifted.push(`${path}: ${from.length} bytes in src, ${to.length} in public`);
      }
    }

    // A sweep that reaches nothing passes forever. The library is never empty.
    expect(walk(srcLibrary).length, 'no files found under src/library at all').toBeGreaterThan(20);
    expect(
      drifted,
      `public/library is not src/library -- run npm run build:\n  ${drifted.join('\n  ')}`,
    ).toEqual([]);
  });

  test('nothing is left in public that no longer has a source', () => {
    // The other direction, and the one a deleted component leaves behind: a
    // stale file under public/ is still served, still linkable, and belongs to
    // nothing.
    const sources = new Set(walk(srcLibrary));
    const orphans = walk(publicLibrary).filter((path) => !sources.has(path));

    expect(
      orphans,
      `served from public/library with no file in src/library:\n  ${orphans.join('\n  ')}`,
    ).toEqual([]);
  });
});

/* --- 2 · the page ---------------------------------------------------------- */

for (const { slug, name, files } of COMPONENTS) {
  const tabs = TABS.filter((tab) => files.includes(tab.ext));

  test.describe(`${slug} (${name})`, () => {
    const PAGE = `components/${slug}/`;

    test('whatever URL the demo loads, those bytes are the source file', async ({ page, request }) => {
      await page.goto(PAGE);

      // The URL is read off the page rather than constructed here, which is the
      // whole strength of this test: it does not check that a path we already
      // know about serves the right thing, it checks that the thing the browser
      // was actually told to fetch is the file. Rewrite the tag to a bundle, a
      // hash, a CDN or a stale copy and this fails on the bytes, whatever the
      // new URL turned out to be.
      //
      // (`is:inline` on the <script> in [slug].astro is defensive rather than
      // load-bearing as that tag is written today: `src` is a runtime
      // expression, so Astro cannot resolve it to a module and leaves it alone.
      // Measured -- the built tag is byte-identical with the directive removed.
      // Make the src a static relative path and that stops being true, which is
      // the change this test is here to catch.)
      const loaded = await page.evaluate((wanted) => ({
        css: [...document.querySelectorAll('link[rel="stylesheet"]')]
          .map((el) => el.getAttribute('href'))
          .filter((href) => href?.includes(wanted)),
        js: [...document.querySelectorAll('script[src]')]
          .map((el) => el.getAttribute('src'))
          .filter((src) => src?.includes(wanted)),
      }), `components/${slug}/component.`);

      for (const { ext } of tabs) {
        if (ext === 'html') continue; // inlined into the page, never fetched

        const tag = ext === 'css' ? 'link rel="stylesheet"' : 'script src';

        // Deduplicated, because one page legitimately loads the same file
        // twice: the shell is a consumer of this library, so BaseLayout pulls
        // dropdown's CSS and JS in site-wide for the header's two pickers, and
        // on /components/dropdown/ the page then loads them again as its own
        // component. Two tags, one URL, no drift. Two *different* URLs for the
        // same component file would be drift, and both get fetched below.
        const urls = [
          ...new Set(
            (ext === 'css' ? loaded.css : loaded.js).filter((url) =>
              url.endsWith(`component.${ext}`),
            ),
          ),
        ];

        expect(
          urls.length,
          `the page loads this component's component.${ext} from ${urls.length} different URLs; ` +
            `expected exactly one <${tag}> target:\n  ${urls.join('\n  ')}`,
        ).toBe(1);

        for (const url of urls) {
          const response = await request.get(url);
          expect(response.status(), `${url} did not serve`).toBe(200);

          const served = Buffer.from(await response.body());
          const source = bytes(resolve(componentsDir, slug, `component.${ext}`));
          expect(
            served.equals(source),
            `${url} served ${served.length} bytes, src/library has ${source.length}`,
          ).toBe(true);
        }
      }
    });

    test('the download link serves the source file', async ({ request }) => {
      // The panel's "download the raw file" and the demo's own assets are the
      // same public/ copy, but the link is written separately in [slug].astro
      // and could point somewhere else without the demo noticing.
      for (const { ext } of tabs) {
        const path = `library/components/${slug}/component.${ext}`;
        const response = await request.get(path);
        expect(response.status(), `${path} did not serve`).toBe(200);

        const served = Buffer.from(await response.body());
        const source = bytes(resolve(componentsDir, slug, `component.${ext}`));
        expect(
          served.equals(source),
          `${path} served ${served.length} bytes, src/library has ${source.length}`,
        ).toBe(true);
      }
    });

    test('the panel shows, and copies, exactly what is served', async ({ page }) => {
      await page.goto(PAGE);

      for (const [i, { ext, label }] of tabs.entries()) {
        const source = readFileSync(resolve(componentsDir, slug, `component.${ext}`), 'utf8');
        const panel = page.locator(`#src-${slug}-panel-${i}`);

        // The tab is the one it claims to be, so an off-by-one in the panel
        // order cannot make the rest of this pass against the wrong file.
        await expect(page.locator(`#src-${slug}-tab-${i}`)).toHaveText(label);

        // What the Copy button puts on the clipboard. CodePanel reads
        // data-code, so this is the string a visitor actually walks away with.
        expect(
          await panel.getAttribute('data-code'),
          `${slug} ${label}: the Copy button would hand over something other than the file`,
        ).toBe(asInlined(source));

        // What the visitor reads. Shiki wraps every token in its own <span>, so
        // the rendered text is only equal to the file if no transform ran
        // between them -- which is the rule. textContent, not innerText:
        // innerText is layout-aware and would normalize whitespace this test
        // exists to compare.
        expect(
          await panel.locator('pre').evaluate((el) => el.textContent),
          `${slug} ${label}: the highlighted code is not the file`,
        ).toBe(asInlined(source));

        // And the download link hands over the served file, not a third copy.
        expect(await panel.getAttribute('data-href')).toContain(
          `library/components/${slug}/component.${ext}`,
        );
      }
    });

    test('the demo markup is the HTML the panel is showing', async ({ page }) => {
      await page.goto(PAGE);

      // Guaranteed by construction -- [slug].astro uses one `?raw` string for
      // both -- and asserted because "by construction" is a claim about code
      // that can be edited. Compared as text, because the browser normalizes
      // attribute quoting and self-closing tags on parse.
      const source = readFileSync(resolve(componentsDir, slug, 'component.html'), 'utf8');
      const shown = await page.locator('.demo').innerText();

      // The visible strings the fragment ships, in order. Enough to catch a
      // demo built from a different file, without asserting on whitespace the
      // parser is entitled to change.
      const headings = [...source.matchAll(/<h4 class="ac-demo__title">([\s\S]*?)<\/h4>/g)].map(
        ([, text]) =>
          text
            .replace(/&middot;/g, '·')
            .replace(/&mdash;/g, '—')
            .replace(/&rsquo;/g, '’')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim(),
      );

      expect(headings.length, `${slug}/component.html has no example headings`).toBeGreaterThan(0);
      for (const heading of headings) {
        expect(shown, `"${heading}" is in component.html but not on the page`).toContain(heading);
      }
    });
  });
}

/* --- 3 · the guard on the guard -------------------------------------------
   Everything above compares the page to src/library. None of it would notice
   src/library being empty, or public/ being a directory of zero-byte files. */

test('the files being compared are real', () => {
  const sizes = COMPONENTS.flatMap(({ slug, files }) =>
    TABS.filter((tab) => files.includes(tab.ext)).map(({ ext }) =>
      statSync(resolve(componentsDir, slug, `component.${ext}`)).size,
    ),
  );

  expect(sizes.length, 'no component files found to compare').toBeGreaterThan(20);
  expect(Math.min(...sizes), 'a component file is empty').toBeGreaterThan(100);
});
