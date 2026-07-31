/**
 * The shared a11y gate.
 *
 * Every component in the registry, driven through the same checks, so that a
 * regression anywhere is caught everywhere rather than only where somebody
 * remembered to write an assertion. The per-component specs assert each
 * component's own ARIA contract; this file asserts the things that are true of
 * all of them.
 *
 * The slug list is read from the filesystem rather than imported from
 * src/site/lib/registry.mjs -- that module is built on `import.meta.glob`,
 * which is Vite's, and this file runs in plain Node.
 *
 * DELIBERATE FAILURES
 * Most component pages ship at least one example that is broken on purpose and
 * live, because a failure you can Tab into teaches more than a paragraph about
 * one. A sweep like this would otherwise be red on nearly every page, so those
 * elements carry
 *
 *     data-ac-demo-broken="<check> <check> ..."
 *
 * naming the checks they are expected to fail. The gate does not merely skip
 * them: it asserts they *do* fail, so an example that quietly stops being
 * broken -- a fix applied to the wrong copy, a CSS rule that reaches further
 * than it was meant to -- fails the build too. A violation inside a marked
 * element that is *not* in its list is still a failure.
 *
 * The vocabulary is any axe rule id, plus:
 *     focus-visible   no visible focus indicator (SC 2.4.7)
 *     target-size     under the 24x24 floor (SC 2.5.8)
 *
 * `data-ac-demo-broken` is demo scaffolding. It is never part of a component
 * and never copied, the same as ac-demo-*.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const componentsDir = resolve(root, 'src/library/components');

/** Every registered component, from the same meta.json the site builds from. */
const COMPONENTS = readdirSync(componentsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const meta = JSON.parse(readFileSync(resolve(componentsDir, entry.name, 'meta.json'), 'utf8'));
    return { slug: meta.slug ?? entry.name, name: meta.name ?? entry.name };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

/** Both modes of all five families. Contrast is the check that varies by theme. */
const THEMES = JSON.parse(readFileSync(resolve(root, 'src/site/theme/themes.index.json'), 'utf8'))
  .families.flatMap((family) => [family.dark, family.light])
  .filter(Boolean);

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/**
 * The component demo only -- the shell has its own spec and its own page.
 * `.demo` is the wrapper [slug].astro puts the component.html fragment in, so
 * it is there for every component including `disclosure`, which predates the
 * `.ac-demo-grid` convention and is still waiting on its retrofit.
 */
const DEMO = '.demo';

/* --- helpers -------------------------------------------------------------- */

/**
 * axe's `target` is a frame path; with no iframes on the page the element's own
 * selector is the last entry.
 */
const selectorOf = (node) => node.target[node.target.length - 1];

/**
 * Split axe's violations into the ones a `data-ac-demo-broken` element claimed
 * and the ones nobody did, and report which claims went unclaimed.
 *
 * `undetermined` is axe's `incomplete` bucket, and it is passed in for one
 * reason: a claim it covers has *not* been shown to be repaired. axe returns
 * incomplete when it cannot finish a check -- for color-contrast, when it
 * cannot resolve what is behind the text -- and "I could not tell" is not the
 * same answer as "this element is fine". Treating it as a pass fails the build
 * and points at the demo, when what actually happened is that the checker gave
 * up. It only ever satisfies an existing claim; it never creates a violation.
 */
async function partition(page, violations, undetermined = []) {
  const flatten = (results) =>
    results.flatMap((result) =>
      result.nodes.map((node) => ({
        rule: result.id,
        impact: result.impact,
        selector: selectorOf(node),
        html: node.html.slice(0, 120),
      })),
    );
  const flat = flatten(violations);
  const unresolved = flatten(undetermined);

  return page.evaluate(({ found, unresolved }) => {
    const key = (el) => {
      // A stable per-element id for matching claims to violations. The marker
      // elements are few, so an index into the marker list is enough.
      const all = [...document.querySelectorAll('[data-ac-demo-broken]')];
      return all.indexOf(el);
    };

    const expected = [];
    const unexpected = [];
    const seen = new Set();

    for (const item of found) {
      const el = document.querySelector(item.selector);
      const marker = el?.closest('[data-ac-demo-broken]');
      const claims = marker ? marker.getAttribute('data-ac-demo-broken').split(/\s+/) : [];

      if (claims.includes(item.rule)) {
        expected.push(item);
        seen.add(`${key(marker)}:${item.rule}`);
      } else {
        unexpected.push({
          ...item,
          note: marker ? `inside a demo marked "${claims.join(' ')}"` : '',
        });
      }
    }

    // A claim axe could not finish checking stays claimed. Nothing here can
    // add to `unexpected` -- an incomplete result on an element nobody marked
    // is axe asking for a human, not a violation.
    for (const item of unresolved) {
      const marker = document.querySelector(item.selector)?.closest('[data-ac-demo-broken]');
      if (!marker) continue;
      if (marker.getAttribute('data-ac-demo-broken').split(/\s+/).includes(item.rule)) {
        seen.add(`${key(marker)}:${item.rule}`);
      }
    }

    // Claims that never fired. Only axe rule ids are checkable here; the two
    // words in the vocabulary that are not axe rules are asserted elsewhere.
    const notAxe = new Set(['focus-visible', 'target-size']);
    const unclaimed = [];
    [...document.querySelectorAll('[data-ac-demo-broken]')].forEach((el, index) => {
      for (const claim of el.getAttribute('data-ac-demo-broken').split(/\s+/)) {
        if (notAxe.has(claim)) continue;
        if (!seen.has(`${index}:${claim}`)) {
          unclaimed.push(`${claim} on ${el.tagName.toLowerCase()}.${el.className || '(no class)'}`);
        }
      }
    });

    return { expected, unexpected, unclaimed };
  }, { found: flat, unresolved });
}

/**
 * Rules axe gave up on, from the `error-occurred` check it files when an
 * evaluate throws.
 *
 * It is one incomplete node and *no* violations and *no* passes: axe abandons
 * the rule for the whole page, so a sweep that only looks at `violations` reads
 * a thrown rule as a clean page. Everything below has to fail on it instead --
 * for the deliberate failures it looks like the demo was repaired, and for the
 * theme sweep it looks like ten themes passed.
 */
const skippedRules = (results) =>
  results.incomplete.flatMap((result) =>
    result.nodes.flatMap((node) =>
      [...(node.none ?? []), ...(node.any ?? []), ...(node.all ?? [])]
        .filter((check) => check.id === 'error-occurred')
        .map((check) => `${result.id}: ${check.data?.message ?? 'threw'}\n    at ${selectorOf(node)}`),
    ),
  );

const describeNodes = (nodes) =>
  nodes.map((n) => `  ${n.rule} (${n.impact}) ${n.selector} ${n.note ?? ''}\n    ${n.html}`).join('\n');

/**
 * Everything the gate drives runs inside one page.evaluate rather than through
 * a locator per element: building a selector for an element with neither id nor
 * class produces `a.`, which is not a selector, and round-tripping several
 * hundred elements is slow for no benefit.
 *
 * `label` is for the failure message only. Never feed it back to page.locator.
 */
const PREAMBLE = `
  const claimed = (el, claim) => {
    const marker = el.closest('[data-ac-demo-broken]');
    return !!marker && marker.getAttribute('data-ac-demo-broken').split(/\\s+/).includes(claim);
  };
  const label = (el) => {
    if (el.id) return '#' + el.id;
    const cls = (el.getAttribute('class') || '').trim().split(/\\s+/)[0];
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '') +
      (el.textContent ? ' "' + el.textContent.trim().slice(0, 24) + '"' : '');
  };
  const tabbable = (root) => [...root.querySelectorAll('*')].filter((el) => {
    if (!(el.tabIndex >= 0)) return false;
    // :disabled, never el.disabled -- the IDL property reflects only the
    // control's own attribute, so it reads false for every input inside a
    // <fieldset disabled>. A disabled control is correctly out of the tab
    // order and correctly has no focus ring.
    if (el.matches(':disabled')) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  /* SC 2.5.8 applies to targets for *pointer* input, so a focusable heading or
     scroll region is not one -- and it comes with exceptions this has to
     honor, or the sweep reports the spec rather than the page. */
  const POINTER_TARGET = [
    'a[href]', 'button', 'input', 'select', 'textarea', 'summary',
    '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
    '[role="switch"]', '[role="tab"]', '[role="menuitem"]', '[role="option"]',
  ].join(',');

  /* The "user agent" exception: a native checkbox or radio is drawn by the
     browser at about 13-18px and the author has not touched it. Its own page
     still asserts the *row* clears 24px, which is the house rule -- this is
     the SC, and the SC exempts it. */
  const uaSized = (el) =>
    el.tagName === 'INPUT' &&
    /^(checkbox|radio)$/.test(el.type) &&
    !el.style.width &&
    !el.style.height;

  /* A pointer can hit the control or any label bound to it, so the target
     clears the floor if *any one of those boxes* does -- both dimensions of
     the same box. Comparing areas instead picks a full-width block label,
     which is 282px wide and 18px tall and clears nothing. */
  const clearsFloor = (el, min) =>
    [el, ...(el.labels || [])]
      .map((n) => n.getBoundingClientRect())
      .some((r) => r.width >= min && r.height >= min);

  const smallestBox = (el) => {
    const r = el.getBoundingClientRect();
    return Math.round(r.width) + 'x' + Math.round(r.height);
  };

  /* The "inline" exception: a link inside a sentence is sized by the
     line-height of the text around it and cannot be made 24px tall without
     wrecking the paragraph. */
  const inlineInText = (el) => {
    if (getComputedStyle(el).display !== 'inline') return false;
    const own = (el.textContent || '').trim().length;
    const around = (el.parentElement ? el.parentElement.textContent : '').trim().length;
    return around > own;
  };
`;

/** Run `body` in the page with the helpers above already defined. */
const inPage = (page, body, arg) =>
  page.evaluate(new Function('arg', `${PREAMBLE}\n${body}`), { demo: DEMO, ...arg });

/* --- the gate ------------------------------------------------------------- */

for (const { slug, name } of COMPONENTS) {
  test.describe(`${slug} (${name})`, () => {
    const PAGE = `components/${slug}/`;

    test.beforeEach(async ({ page }) => {
      await page.goto(PAGE);

      // Settle the colors before anything measures one. `.sidebar__link` and
      // `.code-tab` transition color, background-color and border-color
      // (site.css), and those transitions are on `var(--dur)` directly rather
      // than through the motion gate, so `data-motion="off"` does not stop
      // them. Any axe pass that starts while they are running samples whatever
      // is on screen at that instant -- a value part-way between two themes,
      // which reads as a contrast number that belongs to neither.
      //
      // It fails in both directions, and the second is the confusing one: a
      // deliberate failure measured mid-flight can come out *above* its
      // threshold, so axe reports nothing and the gate says the demo stopped
      // being broken. That is what CI hit on typography's opacity paragraph,
      // and it is why this belongs in beforeEach rather than in the one test
      // that first needed it.
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
    });

    test('axe finds nothing the page has not already claimed', async ({ page }) => {
      // One axe pass, but the heaviest pages are ~6000 nodes: data-table
      // measures 18.5s run alone and goes past the default 30s once the suite
      // runs at full parallelism, which showed up as a timeout on a different
      // page each run. Not a slow component -- the header is 417 of those nodes
      // and costs 1.1s of the 18.5s, measured with and without it.
      test.setTimeout(90_000);

      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

      const skipped = skippedRules(results);
      expect(skipped, `axe abandoned a rule, so it checked nothing:\n  ${skipped.join('\n  ')}`).toEqual(
        [],
      );

      const { expected, unexpected, unclaimed } = await partition(
        page,
        results.violations,
        results.incomplete,
      );

      expect(unexpected, `unclaimed violations:\n${describeNodes(unexpected)}`).toEqual([]);

      // The other direction: a demo that says it is broken has to still be
      // broken, or the example stopped teaching what its note says it does.
      expect(unclaimed, `claimed as broken but axe found nothing:\n  ${unclaimed.join('\n  ')}`).toEqual(
        [],
      );

      // Not an assertion, a receipt: it is worth seeing in the report that the
      // deliberate failures are still firing.
      test.info().annotations.push({ type: 'deliberate', description: `${expected.length} node(s)` });
    });

    test('contrast holds in every theme', async ({ page }) => {
      // A theme is a set of token values, so this is the one check that has to
      // be repeated per theme -- and it is the one that found the code panel
      // shipping a hardcoded dark syntax theme onto light backgrounds.
      // Ten axe passes over a whole demo page does not fit in the default 30s.
      test.setTimeout(180_000);
      const failures = [];

      // Transitions are already suppressed in beforeEach, which this test needs
      // more than any other: it flips data-theme and calls axe in the next
      // statement, so without it every sample lands part-way between two themes.

      for (const theme of THEMES) {
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
        const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
        for (const skipped of skippedRules(results)) {
          failures.push(`${theme}: axe abandoned the rule -- ${skipped}`);
        }
        const { unexpected } = await partition(page, results.violations);
        for (const node of unexpected) {
          failures.push(`${theme}: ${node.selector}\n    ${node.html}`);
        }
      }

      expect(failures, `contrast failures:\n  ${failures.join('\n  ')}`).toEqual([]);
    });

    test('nothing carries a positive tabindex', async ({ page }) => {
      // The one thing that actually detaches tab order from DOM order. Reading
      // order and focus order have to agree (SC 2.4.3), and every roving
      // tabindex in the library moves between 0 and -1, never above.
      const positive = await page.evaluate(
        (demo) =>
          [...document.querySelector(demo).querySelectorAll('[tabindex]')]
            .filter((el) => Number(el.getAttribute('tabindex')) > 0)
            .map((el) => `${el.tagName.toLowerCase()}[tabindex="${el.getAttribute('tabindex')}"]`),
        DEMO,
      );

      expect(positive).toEqual([]);
    });

    test('every tab stop can actually take focus', async ({ page }) => {
      // Ground truth rather than a selector list: ask the browser. focus() on
      // something that cannot take it is a no-op rather than a move, so the
      // probe restores focus itself -- otherwise it parks a keyboard reader
      // wherever it finished.
      const unreachable = await inPage(
        page,
        `
        const before = document.activeElement;
        const missed = [];
        for (const el of tabbable(document.querySelector(arg.demo))) {
          if (claimed(el, 'focus-visible')) continue;
          // A disabled control is correctly out of the tab order; tabIndex
          // still reports 0 for it, so ask the element rather than the number.
          if (el.disabled) continue;
          el.focus({ preventScroll: true });
          if (document.activeElement !== el) missed.push(label(el));
        }
        if (before instanceof HTMLElement) before.focus({ preventScroll: true });
        else document.activeElement?.blur?.();
        return missed;
      `,
      );

      expect(unreachable).toEqual([]);
    });

    test('focus is visible on every tab stop', async ({ page }) => {
      // SC 2.4.7. The library's ring is an outline, so an outline with width is
      // the check; a component that replaces it with a box-shadow, or that is
      // showing what happens without one, says so by claiming focus-visible.
      const invisible = await inPage(
        page,
        `
        const before = document.activeElement;
        const missed = [];
        for (const el of tabbable(document.querySelector(arg.demo))) {
          if (claimed(el, 'focus-visible')) continue;
          el.focus({ preventScroll: true });
          const s = getComputedStyle(el);
          const ring = (parseFloat(s.outlineWidth) > 0 && s.outlineStyle !== 'none') ||
            s.boxShadow !== 'none';
          if (!ring) missed.push(label(el));
        }
        if (before instanceof HTMLElement) before.focus({ preventScroll: true });
        else document.activeElement?.blur?.();
        return missed;
      `,
      );

      expect(invisible).toEqual([]);
    });

    test('a focused control is never left under the sticky header', async ({ page }) => {
      // SC 2.4.11. Scrolling *forward* aligns an element's bottom edge, so the
      // header only eats the focused element moving backwards -- focus-ring's
      // example 5 is the demonstration and this is the sweep. Both routes a
      // keyboard actually takes are covered: focus() scrolls the element into
      // view, and scroll-margin-top is what has to clear the header.
      const obscured = await inPage(
        page,
        `
        const header = document.querySelector('.site-header');
        const height = header ? header.getBoundingClientRect().height : 0;
        const before = document.activeElement;
        const bad = [];
        for (const el of tabbable(document.querySelector(arg.demo))) {
          if (claimed(el, 'focus-visible')) continue;
          el.focus({ preventScroll: false });
          const top = el.getBoundingClientRect().top;
          // Only a control the browser actually scrolled to counts: one that
          // was already comfortably on screen is not what the SC is about.
          if (top < height - 1 && top > -height) bad.push(label(el) + ' at ' + Math.round(top) + 'px');
        }
        if (before instanceof HTMLElement) before.focus({ preventScroll: true });
        else document.activeElement?.blur?.();
        return bad;
      `,
      );

      expect(obscured).toEqual([]);
    });

    test('every target clears the 24x24 floor', async ({ page }) => {
      // SC 2.5.8. box-sizing: border-box counts the border in, which is why a
      // demo built by removing min-width can land at exactly 24 rather than
      // under it -- so the comparison is >=, the same number the SC uses.
      const small = await inPage(
        page,
        `
        const bad = [];
        for (const el of tabbable(document.querySelector(arg.demo))) {
          if (claimed(el, 'target-size')) continue;
          if (!el.matches(POINTER_TARGET)) continue;
          if (inlineInText(el)) continue;
          if (uaSized(el)) continue;
          // A clipped control -- the skip-link recipe -- is 1x1 until it is
          // revealed, and is not a pointer target in that state. Its own spec
          // measures the revealed one.
          if (getComputedStyle(el).clipPath !== 'none') continue;

          if (!clearsFloor(el, 24)) bad.push(label(el) + ' ' + smallestBox(el));
        }
        return bad;
      `,
      );

      expect(small).toEqual([]);
    });

    test('reduced motion removes every duration, by either route', async ({ page }) => {
      // Both routes, because they are different mechanisms: the media query is
      // the OS preference, [data-motion="off"] is the page toggle, and a
      // component gated on only one of them looks correct until it is tested
      // against the other. test.use({ reducedMotion }) is accepted and ignored
      // in this setup -- emulateMedia is the one that works.
      const durations = async () =>
        page.evaluate((demo) => {
          const moving = [];
          for (const el of document.querySelector(demo).querySelectorAll('*')) {
            const style = getComputedStyle(el);
            const all = `${style.transitionDuration},${style.animationDuration}`;
            for (const d of all.split(',')) {
              const seconds = parseFloat(d);
              if (seconds > 0) {
                moving.push(`${el.tagName.toLowerCase()}.${el.className || ''} ${d.trim()}`);
                break;
              }
            }
          }
          return moving.slice(0, 8);
        }, DEMO);

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      expect(await durations(), 'prefers-reduced-motion').toEqual([]);

      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.reload();
      await page.evaluate((demo) => {
        // The scope the components read. motion-preferences puts it on the
        // demo grid; a real app puts it on <html>.
        document.documentElement.setAttribute('data-motion', 'off');
        document.querySelector(demo)?.setAttribute('data-motion', 'off');
      }, DEMO);
      expect(await durations(), '[data-motion="off"]').toEqual([]);
    });

    test('the component ships a forced-colors block, and it takes effect', async ({ page }) => {
      // Windows High Contrast drops gradients, box-shadows and color-mix, so a
      // component without this block loses every state cue it painted. The
      // static half is the contract; the runtime half proves the block is not
      // dead code. Chromium's emulation does not repaint author backgrounds,
      // so the assertion is "something changed", never "the tint is gone".
      const css = readFileSync(resolve(componentsDir, slug, 'component.css'), 'utf8');
      expect(css, `${slug}/component.css has no forced-colors block`).toContain(
        '@media (forced-colors: active)',
      );

      const snapshot = () =>
        page.evaluate((demo) => {
          const out = [];
          for (const el of document.querySelector(demo).querySelectorAll('*')) {
            const s = getComputedStyle(el);
            out.push(`${s.color}|${s.backgroundColor}|${s.borderTopColor}|${s.outlineColor}`);
          }
          return out.join('\n');
        }, DEMO);

      const before = await snapshot();
      await page.emulateMedia({ forcedColors: 'active' });
      expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
      expect(await snapshot()).not.toBe(before);
    });

    test('nothing overflows sideways at 320px', async ({ page }) => {
      // SC 1.4.10. 320px is 1280 at 400% zoom, which is what the SC is really
      // about, and it is where a fieldset's min-content width or an unbreakable
      // token in a readout shows up.
      await page.setViewportSize({ width: 320, height: 640 });
      await page.reload();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}
