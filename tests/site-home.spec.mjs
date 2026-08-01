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

test('axe finds nothing on the home page', async ({ page }) => {
  await page.goto('./');

  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const failures = results.violations.flatMap((rule) =>
    rule.nodes.map((node) => `${rule.id}: ${node.target.at(-1)}`),
  );

  expect(failures, `home page:\n  ${failures.join('\n  ')}`).toEqual([]);
});

test('the home page holds its contrast in every theme', async ({ page }) => {
  // The promise titles carry h3's green and the bodies are --text-muted, and
  // both are values a light theme is free to break. Ten themes, one page load:
  // only the tokens change, so re-navigating between them buys nothing.
  await page.goto('./');

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
