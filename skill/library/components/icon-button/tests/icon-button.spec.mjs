import { test, expect } from '@playwright/test';

const PAGE = 'components/icon-button/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* The claims worth testing here are the ones about the name, because the name
   is the only thing an icon button has and every failure on this page is
   invisible: two buttons in example 3 announce as "button" and look finished,
   example 4's second button cannot be reached by the word printed under it, and
   example 5's third is under the target floor. Each of those is a sentence in
   docs.md that would otherwise be a promise. */

/* --- example 1 · weights, accents and sizes ------------------------------- */

test('every specimen has a name, and the glyph is hidden from the name', async ({ page }) => {
  for (const name of ['Play', 'Search projects', 'Bookmark project', 'Close panel']) {
    const btn = page.getByRole('button', { name, exact: true });
    await expect(btn).toHaveAccessibleName(name);
    // No ARIA role anywhere. A <button> already has one.
    await expect(btn).not.toHaveAttribute('role', /.*/);

    const glyph = btn.locator('.ac-btn-icon__glyph');
    await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    await expect(glyph).toHaveAttribute('focusable', 'false');
  }
});

test('the glyph is an inline SVG stroked with the button own text color', async ({ page }) => {
  const read = (name) =>
    page
      .getByRole('button', { name, exact: true })
      .locator('.ac-btn-icon__glyph')
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { stroke: s.stroke, fill: s.fill, color: getComputedStyle(el.parentElement).color };
      });

  // currentColor resolves to whatever the button's color is, which is what makes
  // the glyph follow every state without a rule of its own. Solid and ghost
  // resolve to different colors, so equality here is the whole claim.
  const solid = await read('Play');
  expect(solid.stroke).toBe(solid.color);
  expect(solid.fill).toBe('none');

  const ghost = await read('Search projects');
  expect(ghost.stroke).toBe(ghost.color);
  expect(ghost.color).not.toBe(solid.color);
});

test('the icon button is square, and --sm lands on the 24px floor exactly', async ({ page }) => {
  const box = async (name) =>
    page.getByRole('button', { name, exact: true }).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });

  // The default: 44 in both directions. min-width is doing the work an absent
  // label would otherwise do.
  expect(await box('Play')).toEqual({ w: 44, h: 44 });
  expect(await box('Close panel')).toEqual({ w: 24, h: 24 });
});

/* --- example 2 · aria-label, or clipped real text ------------------------- */

test('all three variants announce the same name, and only two contain the words', async ({
  page,
}) => {
  const byLabel = page.locator('[data-ac-ib-find="label"]');
  const clipped = page.locator('[data-ac-ib-find="clipped"]');
  const labeled = page.locator('[data-ac-ib-find="labeled"]');

  for (const btn of [byLabel, clipped, labeled]) {
    await expect(btn).toHaveAccessibleName('Add teammate');
  }

  // innerText includes clipped text — it only drops display:none and
  // visibility:hidden — which is exactly the property find-in-page and a
  // translation tool rely on. The aria-label version has nothing to find.
  expect((await byLabel.innerText()).trim()).toBe('');
  expect(await clipped.innerText()).toContain('Add teammate');
  expect(await labeled.innerText()).toContain('Add teammate');
});

test('--labeled un-clips the same markup rather than replacing it', async ({ page }) => {
  const width = (sel) =>
    page.locator(`${sel} .ac-btn-icon__label`).evaluate((el) => Math.round(el.getBoundingClientRect().width));

  expect(await width('[data-ac-ib-find="clipped"]')).toBe(1);
  expect(await width('[data-ac-ib-find="labeled"]')).toBeGreaterThan(50);

  // And the button grew with it, so the clipped label was never holding the box
  // open — the min-width was.
  const boxes = await page
    .locator('[data-ac-ib-find="clipped"], [data-ac-ib-find="labeled"]')
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)));
  expect(boxes[1]).toBeGreaterThan(boxes[0]);
});

/* --- example 3 · buttons with no accessible name -------------------------- */

test('two of the four have no accessible name at all', async ({ page }) => {
  // Nothing on it.
  await expect(page.locator('[data-ac-ib-name="bare"]')).toHaveAccessibleName('');
  // The label is on the wrapping <span>. A generic element cannot be named, and
  // a name on a parent is never inherited by a child.
  await expect(page.locator('[data-ac-ib-name="wrapped"]')).toHaveAccessibleName('');

  // These two do have one, from different sources.
  await expect(page.locator('[data-ac-ib-name="title"]')).toHaveAccessibleName('Delete project');
  await expect(page.locator('[data-ac-ib-name="fixed"]')).toHaveAccessibleName('Delete project');
});

test('the readout names the source each name came from', async ({ page }) => {
  const out = (key) => page.locator(`[data-ac-ib-out="${key}"]`);

  await expect(out('bare')).toHaveText(/no name/);
  await expect(out('wrapped')).toHaveText(/no name/);
  await expect(out('title')).toHaveText(/from title/);
  await expect(out('fixed')).toHaveText(/from aria-label/);

  // The failure is written as well as colored — the color is gone under forced
  // colors, and it was never what carried the meaning.
  await expect(out('bare')).toHaveAttribute('data-ac-ib-bad', 'true');
  await expect(out('fixed')).not.toHaveAttribute('data-ac-ib-bad', /.*/);

  await expect(page.locator('[data-ac-ib-names-verdict]')).toHaveText(/^2 of these four/);
});

/* --- example 4 · a visible word missing from the name (SC 2.5.3) ---------- */

test('the visible caption is in one name and not the other', async ({ page }) => {
  const items = page.locator('.ac-ib-rail__item');

  for (const [index, expected] of [
    [0, true],
    [1, false],
  ]) {
    const word = (await items.nth(index).locator('.ac-ib-rail__word').innerText()).trim();
    const name = await items.nth(index).getByRole('button').getAttribute('aria-label');
    expect(name.toLowerCase().includes(word.toLowerCase())).toBe(expected);
  }

  // The captions are aria-hidden, so each control announces once.
  await expect(items.nth(0).locator('.ac-ib-rail__word')).toHaveAttribute('aria-hidden', 'true');
});

test('the voice lookup finds one button by its caption and not the other', async ({ page }) => {
  const field = page.getByLabel('Say a command');
  const log = page.locator('[data-ac-ib-voice-log]');

  // The field ships holding the failing command.
  await page.getByRole('button', { name: 'Match it' }).click();
  await expect(log).toHaveText(/Nothing is named "share"/);
  await expect(log).toHaveAttribute('data-ac-ib-bad', 'true');

  await field.fill('click Archive');
  await field.press('Enter');
  await expect(log).toHaveText(/"Archive project" matched "archive"/);
  await expect(log).not.toHaveAttribute('data-ac-ib-bad', /.*/);
});

/* --- example 5 · a target shrink-wrapped to its glyph --------------------- */

test('the readout measures the target and the glyph separately', async ({ page }) => {
  const text = (key) => page.locator(`[data-ac-ib-out="${key}"]`).innerText();

  expect(await text('default')).toBe('44 × 44');
  expect(await text('sm')).toBe('24 × 24');
  expect(await text('tiny')).toBe('20 × 20');

  // The point of the second column: the glyph barely moves while the target
  // more than doubles. The padding is the target.
  const defaultGlyph = Number((await text('default-glyph')).split('×')[0].trim());
  const tinyGlyph = Number((await text('tiny-glyph')).split('×')[0].trim());
  expect(defaultGlyph).toBe(tinyGlyph);
});

test('the undersized target is reported, by name and in the readout', async ({ page }) => {
  await expect(page.locator('[data-ac-ib-out="tiny"]')).toHaveAttribute('data-ac-ib-bad', 'true');
  await expect(page.locator('[data-ac-ib-out="default"]')).not.toHaveAttribute(
    'data-ac-ib-bad',
    /.*/,
  );

  const verdict = page.locator('[data-ac-ib-sizes-verdict]');
  await expect(verdict).toHaveText(/"Stop export" is under 24×24/);
});

test('every icon button on the page clears 24×24 except the one that is meant not to', async ({
  page,
}) => {
  const short = await page.locator('.ac-btn-icon').evaluateAll((els) =>
    els
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return Math.round(r.width) < 24 || Math.round(r.height) < 24;
      })
      .map((el) => el.getAttribute('aria-label')),
  );
  expect(short).toEqual(['Stop export']);
});

/* --- the shared obligations ----------------------------------------------- */

test('the transition is gated on the motion token', async ({ page }) => {
  // emulateMedia, never test.use({ reducedMotion }) — the latter is accepted
  // and ignored in this setup, and the test then passes against a page that is
  // still animating.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const durations = await page
    .getByRole('button', { name: 'Play', exact: true })
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(durations.split(',').every((d) => d.trim() === '0s')).toBe(true);
});

test('under forced colors the ghost weight gets a border it does not otherwise have', async ({
  page,
}) => {
  const ghost = page.getByRole('button', { name: 'Search projects', exact: true });

  const before = await ghost.evaluate((el) => getComputedStyle(el).borderTopColor);
  expect(before).toBe('rgba(0, 0, 0, 0)');

  await page.emulateMedia({ forcedColors: 'active' });
  const after = await ghost.evaluate((el) => getComputedStyle(el).borderTopColor);
  expect(after).not.toBe('rgba(0, 0, 0, 0)');

  // The glyph needs no rule there: currentColor follows the system color the
  // button was just given.
  const glyph = await ghost
    .locator('.ac-btn-icon__glyph')
    .evaluate((el) => ({ stroke: getComputedStyle(el).stroke, color: getComputedStyle(el.parentElement).color }));
  expect(glyph.stroke).toBe(glyph.color);
});

test('nothing overflows sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the factory is idempotent and destroy clears what it wrote', async ({ page }) => {
  const verdict = page.locator('[data-ac-ib-names-verdict]');
  await expect(verdict).not.toHaveText('');

  const same = await page.evaluate(() => {
    const root = document.querySelector('[data-ac-icon-button]');
    return window.AC.createIconButton(root) === window.AC.createIconButton(root);
  });
  expect(same).toBe(true);

  await page.evaluate(() => {
    window.AC.createIconButton(document.querySelector('[data-ac-icon-button]')).destroy();
  });
  await expect(verdict).toHaveText('');
});
