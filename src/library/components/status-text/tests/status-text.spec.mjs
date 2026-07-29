import { test, expect } from '@playwright/test';

const PAGE = 'components/status-text/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* Every claim on this page is about what a one-word label is read out as and
   which element carries the live region, so that is what is asserted here —
   the announced text, the announcement count, and the computed styles. */

/** What a screen reader is given: text minus aria-hidden and unrendered
    subtrees, plus generated content. The page's own [NAME] walk, re-derived
    here so the readouts are checked against something rather than themselves. */
const spoken = (page, selector) =>
  page.evaluate((sel) => {
    const generated = (el, which) => {
      const style = getComputedStyle(el, which);
      if (!style || style.content === 'none' || style.content === 'normal') return '';
      if (style.display === 'none' || style.visibility === 'hidden') return '';
      const quoted = style.content.match(/^"([\s\S]*)"$/);
      return quoted ? quoted[1] : '';
    };

    const walk = (el) => {
      const parts = [generated(el, '::before')];
      el.childNodes.forEach((node) => {
        if (node.nodeType === 3) {
          parts.push(node.nodeValue);
        } else if (node.nodeType === 1) {
          if (node.getAttribute('aria-hidden') === 'true') return;
          const style = getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') return;
          parts.push(walk(node));
        }
      });
      parts.push(generated(el, '::after'));
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    };

    return walk(document.querySelector(sel));
  }, selector);

/* --- example 1 · the specimen --------------------------------------------- */

test('the static labels carry no live role at all', async ({ page }) => {
  const labels = page.locator('.ac-st-panel').first().locator('.ac-status');
  await expect(labels).toHaveCount(3);

  // Nothing changes here, so there is nothing to announce.
  const roles = await labels.evaluateAll((els) => els.map((el) => el.getAttribute('role')));
  expect(roles).toEqual([null, null, null]);
});

test('every glyph is hidden and every label has a word', async ({ page }) => {
  const panel = page.locator('.ac-st-panel').first();

  await expect(panel.locator('.ac-status__text')).toHaveText(['Shipped', 'Failed', 'Waiting']);

  const hidden = await panel
    .locator('.ac-status__glyph')
    .evaluateAll((els) => els.every((el) => el.getAttribute('aria-hidden') === 'true'));
  expect(hidden).toBe(true);
});

test('the glyph is drawn, not typed — it contributes nothing to the text', async ({ page }) => {
  // content: "" plus borders. A character here would be folded into the name,
  // which is example 2's failure.
  const contents = await page
    .locator('.ac-st-panel')
    .first()
    .locator('.ac-status__glyph')
    .evaluateAll((els) =>
      els.flatMap((el) => [
        getComputedStyle(el, '::before').content,
        getComputedStyle(el, '::after').content,
      ]),
    );

  expect(contents.every((c) => c === '""' || c === 'none')).toBe(true);
});

test('the three tones differ, and differ by one custom property', async ({ page }) => {
  const accents = await page
    .locator('.ac-st-panel')
    .first()
    .locator('.ac-status')
    .evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).getPropertyValue('--ac-status-accent').trim()),
    );

  expect(new Set(accents).size).toBe(3);
});

/* --- example 2 · a tick is not a status ------------------------------------ */

test('a label with no word announces nothing', async ({ page }) => {
  expect(await spoken(page, '[data-ac-st-said="dot"]')).toBe('');
  await expect(page.locator('[data-ac-st-out="dot"]')).toHaveText('nothing');
  await expect(page.locator('[data-ac-st-out="dot"]')).toHaveAttribute('data-ac-st-bad', 'true');
});

test('a CSS tick is not silent — it puts a punctuation mark in the text', async ({ page }) => {
  // The finding: generated content is folded into the accessible name. The
  // element has no child nodes at all, and it still announces something.
  const children = await page
    .locator('[data-ac-st-said="css"]')
    .evaluate((el) => el.childNodes.length);
  expect(children).toBe(0);

  expect(await spoken(page, '[data-ac-st-said="css"]')).toBe('✓');
  await expect(page.locator('[data-ac-st-out="css"]')).toHaveText('"✓"');
});

test('the emoji label announces a character and the specimen announces a word', async ({ page }) => {
  expect(await spoken(page, '[data-ac-st-said="emoji"]')).toBe('✅');
  expect(await spoken(page, '[data-ac-st-said="good"]')).toBe('Shipped');

  await expect(page.locator('[data-ac-st-out="good"]')).toHaveText('"Shipped"');
  await expect(page.locator('[data-ac-st-out="good"]')).not.toHaveAttribute(
    'data-ac-st-bad',
    'true',
  );
});

/* --- example 3 · the detail that does not fit ------------------------------ */

test('the title attribute puts the reason nowhere the text can reach', async ({ page }) => {
  const label = page.locator('[data-ac-st-detail-case="title"]');
  await expect(label).toHaveAttribute('title', 'Card ending 4620 was declined');

  // The element already has text, so the title is not in the accessible name.
  expect(await spoken(page, '[data-ac-st-detail-case="title"]')).toBe('Failed');
  await expect(page.locator('[data-ac-st-out="title"]')).toHaveAttribute('data-ac-st-bad', 'true');
});

test('the hover bubble is in the stylesheet and not in the text', async ({ page }) => {
  // The content is declared — it is just visibility: hidden until a pointer
  // that a keyboard user does not have arrives.
  const declared = await page
    .locator('[data-ac-st-detail-case="tip"]')
    .evaluate((el) => getComputedStyle(el, '::after').content);
  expect(declared).toContain('4620');

  expect(await spoken(page, '[data-ac-st-detail-case="tip"]')).toBe('Failed');
});

test('the clipped detail is off screen and still announced', async ({ page }) => {
  const said = await spoken(page, '[data-ac-st-detail-case="good"]');
  expect(said).toContain('Failed');
  expect(said).toContain('4620');

  // Clipped, not removed: a 1px box that is still in the accessibility tree.
  const box = await page.locator('[data-ac-st-detail-case="good"] .ac-status__detail').boundingBox();
  expect(box.width).toBeLessThanOrEqual(2);
  expect(box.height).toBeLessThanOrEqual(2);

  await expect(page.locator('[data-ac-st-out="detail-good"]')).toContainText('4620');
});

/* --- example 4 · one region, not one per row ------------------------------- */

test('the broken list puts a live region on every label and the specimen on none', async ({
  page,
}) => {
  const many = page.locator('[data-ac-st-list="many"] .ac-status');
  await expect(many).toHaveCount(4);
  const manyRoles = await many.evaluateAll((els) => els.map((el) => el.getAttribute('role')));
  expect(manyRoles).toEqual(['status', 'status', 'status', 'status']);

  const one = page.locator('[data-ac-st-list="one"] .ac-status');
  const oneRoles = await one.evaluateAll((els) => els.map((el) => el.getAttribute('role')));
  expect(oneRoles).toEqual([null, null, null, null]);

  // The list's own region: in the markup from the start, and empty.
  const slot = page.locator('[data-ac-st-slot="one"]');
  await expect(slot).toHaveAttribute('role', 'status');
  await expect(slot).toBeEmpty();
});

test('a region per row produces one announcement per changed row', async ({ page }) => {
  const log = page.locator('[data-ac-st-log="change"]');
  await expect(log.locator('li')).toHaveCount(0);

  await page.locator('[data-ac-st-refresh="many"]').click();

  // Three of the four rows changed, so three things were queued.
  await expect(log.locator('li')).toHaveCount(3);
  await expect(log.locator('li').first()).toHaveAttribute('data-ac-st-bad', 'true');
});

test('one region produces one announcement, and it is a summary', async ({ page }) => {
  const log = page.locator('[data-ac-st-log="change"]');

  await page.locator('[data-ac-st-refresh="one"]').click();

  await expect(log.locator('li')).toHaveCount(1);
  await expect(log.locator('li').first()).toContainText('3 of 4 orders changed');
  await expect(log.locator('li').first()).not.toHaveAttribute('data-ac-st-bad', 'true');

  // Same four statuses on screen either way — the difference is only in what
  // was said about them.
  await expect(page.locator('[data-ac-st-list="one"] .ac-status__text')).toHaveText([
    'Shipped',
    'Failed',
    'Shipped',
    'Waiting',
  ]);
});

test('a row that did not change is not rewritten', async ({ page }) => {
  await page.locator('[data-ac-st-refresh="one"]').click();
  await expect(page.locator('[data-ac-st-slot="one"]')).toContainText('3 of 4');

  // The fourth row is Waiting in both states. Rewriting it would be a mutation
  // without being news.
  await expect(page.locator('[data-ac-st-cell="one-4"] .ac-status__text')).toHaveText('Waiting');
});

/* --- example 5 · when the column gets narrow ------------------------------- */

test('both labels say Shipped until the column is squeezed', async ({ page }) => {
  expect(await spoken(page, '[data-ac-st-narrow-case="gone"]')).toBe('Shipped');
  expect(await spoken(page, '[data-ac-st-narrow-case="keep"]')).toBe('Shipped');
});

test('squeezed, display:none loses the word and --compact keeps it', async ({ page }) => {
  await page.locator('[data-ac-st-narrow]').check();
  await expect(page.locator('[data-ac-st-narrow-panel]')).toHaveAttribute(
    'data-ac-st-narrow-on',
    'true',
  );

  expect(await spoken(page, '[data-ac-st-narrow-case="gone"]')).toBe('');
  expect(await spoken(page, '[data-ac-st-narrow-case="keep"]')).toBe('Shipped');

  await expect(page.locator('[data-ac-st-out="gone"]')).toHaveText('nothing');
  await expect(page.locator('[data-ac-st-out="keep"]')).toHaveText('"Shipped"');
});

test('squeezed, the two labels are the same width on screen', async ({ page }) => {
  await page.locator('[data-ac-st-narrow]').check();

  // Clipped text takes no room, so the honest version costs nothing visually.
  // This is the reason display: none looks like the reasonable choice.
  const gone = await page.locator('[data-ac-st-narrow-case="gone"]').boundingBox();
  const keep = await page.locator('[data-ac-st-narrow-case="keep"]').boundingBox();
  expect(Math.abs(gone.width - keep.width)).toBeLessThanOrEqual(1);
});

/* --- across the page ------------------------------------------------------ */

test('the refresh buttons have different names, both starting with the visible text', async ({
  page,
}) => {
  const names = await page
    .locator('[data-ac-st-refresh]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));

  expect(new Set(names).size).toBe(2);
  expect(names.every((n) => n.startsWith('Refresh'))).toBe(true);
});

test('under forced colors the tones collapse and the words are what is left', async ({ page }) => {
  // page.emulateMedia, not test.use({ forcedColors }) — the latter is accepted
  // and silently ignored in this setup, so every assertion passes for the
  // wrong reason.
  await page.emulateMedia({ forcedColors: 'active' });

  const panel = page.locator('.ac-st-panel').first();
  const colors = await panel
    .locator('.ac-status')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).color));

  expect(new Set(colors).size).toBe(1);
  await expect(panel.locator('.ac-status__text')).toHaveText(['Shipped', 'Failed', 'Waiting']);
});

test('reduced motion removes the refresh button transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('[data-ac-st-refresh="one"]')
    .evaluate((el) => getComputedStyle(el).transitionDuration);

  expect(duration.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});

test('the interactive controls clear the 24px floor', async ({ page }) => {
  // The checkbox's target is its label, which is what a pointer actually hits.
  for (const selector of ['[data-ac-st-refresh="one"]', '.ac-st-check']) {
    const box = await page.locator(selector).boundingBox();
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(24);
  }
});

test('nothing overflows sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
