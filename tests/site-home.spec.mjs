/**
 * The home page.
 *
 * It had no sweep of its own until now, and the gap was structural rather than an
 * oversight anyone made once: `tests/shared/a11y.spec.mjs` drives component pages,
 * `site-nav.spec.mjs` scopes itself to `.sidebar` and `site-header.spec.mjs` to
 * `.site-header`. Everything between the header and the footer on `/` -- the hero,
 * the promises, the group cards -- was checked by nothing.
 *
 * So this is deliberately the whole page rather than a region: the shell's own
 * specs already own their parts, and running axe over all of it is what makes the
 * page covered rather than covered-in-places.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Both modes of every family -- contrast is the check that varies by theme. */
const THEMES = JSON.parse(readFileSync(resolve(root, 'src/site/theme/themes.index.json'), 'utf8'))
  .families.flatMap((family) => [family.dark, family.light])
  .filter(Boolean);

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/**
 * Settle the colors before anything measures one. The hero's copy panel brings
 * `.code-tab` onto this page, and it transitions color, background-color and
 * border-color on `var(--dur)` directly rather than through the motion gate --
 * so `data-motion="off"` does not stop it. An axe pass that starts while one is
 * running samples a value part-way between two themes and reports a contrast
 * number that belongs to neither. Same suppression, for the same reason, as
 * tests/shared/a11y.spec.mjs applies to the component pages.
 */
const settleColors = (page) =>
  page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });

test('axe finds nothing on the home page', async ({ page }) => {
  await page.goto('./');
  await settleColors(page);

  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const failures = results.violations.flatMap((rule) =>
    rule.nodes.map((node) => `${rule.id}: ${node.target.at(-1)}`),
  );

  expect(failures, `home page:\n  ${failures.join('\n  ')}`).toEqual([]);
});

test('the home page holds its contrast in every theme', async ({ page }) => {
  // The promise titles carry h3's green and the bodies are --text-muted, and
  // both are values a light theme is free to break. Ten themes, one page load:
  // only the tokens change, so re-navigating between them buys nothing -- which
  // is exactly why the transitions have to go: this flips data-theme and calls
  // axe in the next statement, with no navigation in between to end them.
  await page.goto('./');
  await settleColors(page);

  const failures = [];
  for (const theme of THEMES) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    for (const node of results.violations.flatMap((rule) => rule.nodes)) {
      failures.push(`${theme}: ${node.target.at(-1)} — ${node.any[0]?.message}`);
    }
  }

  expect(failures, `home page contrast:\n  ${failures.join('\n  ')}`).toEqual([]);
});

/* --- The promise / card distinction ----------------------------------------
   The point of the promises leaving the card system, asserted as structure: a
   claim must not wear an entry's clothes. If someone reaches for .card again for
   something unclickable, this is what says no. */

test('the promises are not cards, and every card is a link', async ({ page }) => {
  await page.goto('./');

  const promises = page.locator('.promise');
  expect(await promises.count()).toBeGreaterThan(0);

  // No part of the navigable vocabulary: not a .card, and carrying no link.
  await expect(page.locator('.promise.card')).toHaveCount(0);
  await expect(promises.locator('a')).toHaveCount(0);

  // The mark is decoration -- the heading beside it is the whole accessible name.
  const marks = page.locator('.promise__mark');
  expect(await marks.count()).toBe(await promises.count());
  await expect(marks.first()).toHaveAttribute('aria-hidden', 'true');

  // The other half of the same claim: nothing on this page wears .card without
  // being somewhere you can go.
  const cards = page.locator('.card');
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThan(0);
  expect(await cards.locator('.card__link').count()).toBe(cardCount);
});

/* --- The hero's copy panel --------------------------------------------------
   CodePanel is shared with every component page, so neither of these is really a
   home page claim -- the hero is just the first place three tabs sit above the
   fold, and where both problems were seen. */

test('switching tabs and back leaves each one rendering its own code', async ({ page }) => {
  // The regression: the tabpanels and the note's filename span both carried
  // [data-filename], and the tabpanels come first, so a panel-wide query found
  // tabpanel 0 rather than the span. select() then wrote the filename into it as
  // textContent and erased the code it was rendering. Only visible after
  // switching away and back, which is why it survived on 30-odd pages.
  await page.goto('./');

  // One string per tab that appears in that excerpt and in no other.
  const marks = ['data-ac-field', 'forced-colors: active', 'described.join'];

  // Away and back, more than once: a single round trip clears the first tab, and
  // ending on 0 is what puts the damage on screen.
  for (const i of [1, 2, 0, 2, 1, 0]) {
    await page.locator(`#hero-peek-tab-${i}`).click();
  }

  for (const [i, mark] of marks.entries()) {
    const code = await page.locator(`#hero-peek-panel-${i}`).textContent();
    expect(code, `tab ${i} lost its code`).toContain(mark);
  }

  // Selected, visible, and showing markup rather than a filename.
  await expect(page.locator('#hero-peek-tab-0')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#hero-peek-panel-0')).toBeVisible();
});

test('the hero panel keeps one height across its tabs', async ({ page }) => {
  // A code block that resizes to its content makes every tab press shove the
  // page under the pointer. The block scrolls instead, which it can afford to:
  // it is focusable and labeled, so the overflow stays reachable (SC 2.1.1).
  await page.goto('./');

  const heights = [];
  for (const i of [0, 1, 2]) {
    await page.locator(`#hero-peek-tab-${i}`).click();
    const box = await page.locator(`#hero-peek-panel-${i}`).boundingBox();
    heights.push(Math.round(box.height));
  }

  expect(new Set(heights), `code block heights: ${heights.join(', ')}`).toHaveProperty('size', 1);
});

test('the code block is the scroller, not the pre inside it', async ({ page }) => {
  // Shiki writes `overflow-x: auto` and a tabindex onto its own <pre>, which
  // takes the scrolling off `.code-block` -- the only one of the two carrying an
  // accessible name. Reachable but unscrollable is the SC 2.1.1 failure the
  // wrapper's tabindex exists to prevent. The visible tell, and what put this
  // here: on a fixed-height block the pre's scrollbar floats part-way up the box.
  await page.goto('./');

  const measured = await page.locator('#hero-peek-panel-0').evaluate((block) => {
    const pre = block.querySelector('.astro-code');

    // Which one actually scrolls, asked by scrolling them. `scrollWidth >
    // clientWidth` would not answer it: that is true of any element wider than
    // its box, scrollable or not. Assigning scrollLeft to an overflow:visible
    // element is what gets ignored.
    block.scrollLeft = 999;
    pre.scrollLeft = 999;

    return {
      blockScrolled: block.scrollLeft > 0,
      preScrolled: pre.scrollLeft > 0,
      preTabindex: pre.getAttribute('tabindex'),
      // clientHeight is the padding box, so the pre clears it less the padding.
      shortBy: block.clientHeight - 32 - pre.getBoundingClientRect().height,
    };
  });

  expect(measured.preScrolled, 'the pre kept its own horizontal scroll').toBe(false);
  expect(measured.blockScrolled, 'the labeled block does not scroll').toBe(true);
  expect(measured.preTabindex, 'the pre is still a second tab stop').toBe(null);
  expect(measured.shortBy, 'the pre does not fill the block').toBeLessThanOrEqual(1);
});

test('the tick survives forced colors, which is why it is an SVG', async ({ browser }) => {
  // Windows High Contrast throws away backgrounds, so the lit-dot notation used
  // elsewhere on the site needs a patch to survive it. A stroked SVG does not:
  // currentColor resolves to CanvasText and it is drawn for free. That is half
  // the reason the mark is an SVG -- the other half is that generated *text*
  // would be announced -- so it is worth holding rather than assuming.
  const context = await browser.newContext({ forcedColors: 'active' });
  const page = await context.newPage();
  await page.goto('./');

  const mark = page.locator('.promise__mark').first();
  await expect(mark).toBeVisible();
  const box = await mark.boundingBox();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);

  // The promises must not grow a rule here either: the forced-colors block in
  // site.css hands .card a border to replace its gradient, and a claim picking
  // that up would put the card shape back exactly where it was removed.
  await expect(page.locator('.promise.card')).toHaveCount(0);

  await context.close();
});
