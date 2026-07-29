import { test, expect } from '@playwright/test';

const PAGE = 'components/badge/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* Every claim on this page is about what a small number is read out as and what
   it is attached to, so that is what is asserted here — announced text,
   accessible names, and the announcement count. */

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
      if (!el) return '';
      if (el.getAttribute('aria-hidden') === 'true') return '';
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return '';

      const parts = [generated(el, '::before')];
      el.childNodes.forEach((node) => {
        if (node.nodeType === 3) parts.push(node.nodeValue);
        else if (node.nodeType === 1) parts.push(walk(node));
      });
      parts.push(generated(el, '::after'));
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    };

    return walk(document.querySelector(sel));
  }, selector);

/* --- example 1 · the specimen --------------------------------------------- */

test('every badge has both halves, and only the words are in the tree', async ({ page }) => {
  const panel = page.locator('.ac-bdg-panel').first();

  const digits = await panel
    .locator('.ac-badge__num')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-hidden')));
  expect(digits).toEqual(['true', 'true', 'true', 'true']);

  await expect(panel.locator('.ac-badge__name')).toHaveText([
    '3 unread messages',
    '12 new replies',
    'New',
    '99 replies',
  ]);
});

test('a nested badge is part of the button it is pinned to', async ({ page }) => {
  const buttons = page.locator('.ac-bdg-bar .ac-btn');

  await expect(buttons.first()).toHaveAccessibleName('Inbox 3 unread messages');
  await expect(buttons.nth(1)).toHaveAccessibleName('Replies 12 new replies');
});

test('the words are clipped, not hidden — off screen and still announced', async ({ page }) => {
  const box = await page.locator('.ac-bdg-bar .ac-badge__name').first().boundingBox();
  expect(box.width).toBeLessThanOrEqual(2);
  expect(box.height).toBeLessThanOrEqual(2);
});

test('the static badges carry no live role at all', async ({ page }) => {
  const roles = await page
    .locator('.ac-bdg-panel')
    .first()
    .locator('.ac-badge')
    .evaluateAll((els) => els.map((el) => el.getAttribute('role')));

  expect(roles).toEqual([null, null, null, null]);
});

test('the accents differ, and differ by one custom property', async ({ page }) => {
  const accents = await page
    .locator('.ac-bdg-panel')
    .first()
    .locator('.ac-badge')
    .evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).getPropertyValue('--ac-badge-accent').trim()),
    );

  // pink, green, pink (solid), blue — the solid weight is not an accent.
  expect(new Set(accents).size).toBe(3);
});

/* --- example 2 · three is not a name -------------------------------------- */

test('digits alone announce a character', async ({ page }) => {
  expect(await spoken(page, '[data-ac-bdg-said="bare"]')).toBe('3');
  await expect(page.locator('[data-ac-bdg-out="bare"]')).toHaveText('"3"');
  await expect(page.locator('[data-ac-bdg-out="bare"]')).toHaveAttribute('data-ac-bdg-bad', 'true');
});

test('a badge hidden outright announces nothing at all', async ({ page }) => {
  // The over-correction. The digits are still on screen and still in the DOM.
  await expect(page.locator('[data-ac-bdg-said="mute"] .ac-badge__num')).toHaveText('3');
  expect(await spoken(page, '[data-ac-bdg-said="mute"]')).toBe('');
  await expect(page.locator('[data-ac-bdg-out="mute"]')).toHaveText('nothing');
});

test('words added with the digits left visible announce the count twice', async ({ page }) => {
  const said = await spoken(page, '[data-ac-bdg-said="twice"]');
  expect(said).toBe('3 3 unread messages');
  await expect(page.locator('[data-ac-bdg-out="twice"]')).toHaveAttribute(
    'data-ac-bdg-bad',
    'true',
  );
});

test('the specimen announces the count and its subject, once', async ({ page }) => {
  expect(await spoken(page, '[data-ac-bdg-said="good"]')).toBe('3 unread messages');
  await expect(page.locator('[data-ac-bdg-out="good"]')).toHaveText('"3 unread messages"');
  await expect(page.locator('[data-ac-bdg-out="good"]')).not.toHaveAttribute(
    'data-ac-bdg-bad',
    'true',
  );
});

test('all four badges show the same digits', async ({ page }) => {
  await expect(page.locator('[data-ac-bdg-cases] .ac-badge__num')).toHaveText(['3', '3', '3', '3']);
});

/* --- example 3 · attached, or merely nearby -------------------------------- */

test('a badge beside the button is missing from its name', async ({ page }) => {
  const button = page.locator('[data-ac-bdg-btn="loose"]');
  await expect(button).toHaveAccessibleName('Inbox');

  // The badge is in the tree, correctly named, and joined to the button by
  // nothing but a position: absolute.
  expect(await spoken(page, '[data-ac-bdg-said="loose"]')).toBe('3 unread messages');
  const outside = await button.evaluate((el) => el.contains(
    el.parentElement.querySelector('.ac-badge'),
  ));
  expect(outside).toBe(false);

  await expect(page.locator('[data-ac-bdg-out="loose-btn"]')).toHaveAttribute(
    'data-ac-bdg-bad',
    'true',
  );
});

test('a badge nested in the button is part of its name', async ({ page }) => {
  await expect(page.locator('[data-ac-bdg-btn="nested"]')).toHaveAccessibleName(
    'Inbox 3 unread messages',
  );
  await expect(page.locator('[data-ac-bdg-out="nested-btn"]')).toHaveText(
    '"Inbox 3 unread messages"',
  );
});

test('the two buttons are the same size and in the same place on screen', async ({ page }) => {
  // This is why the failure survives review: nesting changes the tree and
  // nothing else.
  const loose = await page.locator('[data-ac-bdg-btn="loose"]').boundingBox();
  const nested = await page.locator('[data-ac-bdg-btn="nested"]').boundingBox();

  expect(Math.abs(loose.width - nested.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(loose.height - nested.height)).toBeLessThanOrEqual(1);
});

test('a corner badge does not swallow the click aimed at its button', async ({ page }) => {
  await expect(page.locator('.ac-badge--corner').first()).toHaveCSS('pointer-events', 'none');
});

/* --- example 4 · when the digits stop counting ----------------------------- */

test('the abbreviation is drawn short and announced long', async ({ page }) => {
  const badge = page.locator('[data-ac-bdg-shape="over"]');
  await expect(badge.locator('.ac-badge__num')).toHaveText('99+');
  expect(await spoken(page, '[data-ac-bdg-shape="over"]')).toBe('99 or more unread messages');
});

test('a bare dot announces nothing and a named dot announces its words', async ({ page }) => {
  expect(await spoken(page, '[data-ac-bdg-shape="dot"]')).toBe('');
  await expect(page.locator('[data-ac-bdg-out="dot"]')).toHaveText('nothing');
  await expect(page.locator('[data-ac-bdg-out="dot"]')).toHaveAttribute('data-ac-bdg-bad', 'true');

  expect(await spoken(page, '[data-ac-bdg-shape="named"]')).toBe('New replies');

  // Same drawing either way: the failing dot is not smaller or paler.
  const bare = await page.locator('[data-ac-bdg-shape="dot"]').boundingBox();
  const named = await page.locator('[data-ac-bdg-shape="named"]').boundingBox();
  expect(Math.abs(bare.width - named.width)).toBeLessThanOrEqual(1);
});

test('a count of zero is removed, words and all', async ({ page }) => {
  const badge = page.locator('[data-ac-bdg-shape="zero"]');
  await expect(badge).toHaveAttribute('hidden', '');

  // The explicit .ac-badge[hidden] rule: an author display would otherwise beat
  // the UA's [hidden] and leave the badge on screen.
  await expect(badge).toHaveCSS('display', 'none');
  expect(await spoken(page, '[data-ac-bdg-shape="zero"]')).toBe('');
});

/* --- example 5 · when the count changes ------------------------------------ */

test('the broken badge carries the live role and the specimen carries none', async ({ page }) => {
  await expect(page.locator('[data-ac-bdg-badge="live"]')).toHaveAttribute('role', 'status');
  await expect(page.locator('[data-ac-bdg-badge="quiet"]')).not.toHaveAttribute('role', 'status');

  // The inbox's own region: in the markup from the start, and empty.
  const slot = page.locator('[data-ac-bdg-slot]');
  await expect(slot).toHaveAttribute('role', 'status');
  await expect(slot).toBeEmpty();
});

test('one message announces a fragment from the badge and a sentence from the region', async ({
  page,
}) => {
  const log = page.locator('[data-ac-bdg-log]');
  await expect(log.locator('li')).toHaveCount(0);

  await page.locator('[data-ac-bdg-add]').click();

  await expect(log.locator('li')).toHaveCount(2);
  await expect(log.locator('li').first()).toHaveText(/99 unread messages/);
  await expect(log.locator('li').first()).toHaveAttribute('data-ac-bdg-bad', 'true');

  await expect(log.locator('li').nth(1)).toHaveText(/1 new message\. 99 unread\./);
  await expect(log.locator('li').nth(1)).not.toHaveAttribute('data-ac-bdg-bad', 'true');
});

test('both badges show the same digits whichever one announces', async ({ page }) => {
  await page.locator('[data-ac-bdg-add]').click();

  await expect(page.locator('[data-ac-bdg-badge="live"] .ac-badge__num')).toHaveText('99');
  await expect(page.locator('[data-ac-bdg-badge="quiet"] .ac-badge__num')).toHaveText('99');
});

test('the live role takes the count out of the button name entirely', async ({ page }) => {
  // The finding. Naming from contents only folds in a child whose own role
  // takes a name from its contents, and role="status" does not — so the badge
  // that announces is missing from the control it is pinned to. Asserted
  // against the real accessibility tree, not against the page's own walk.
  await expect(page.locator('[data-ac-bdg-btn="live"]')).toHaveAccessibleName('Inbox');
  await expect(page.locator('[data-ac-bdg-btn="quiet"]')).toHaveAccessibleName(
    'Inbox 98 unread messages',
  );

  // Identical on screen: the same digits, in the same place, in both.
  await expect(page.locator('[data-ac-bdg-badge="live"] .ac-badge__num')).toHaveText('98');
  await expect(page.locator('[data-ac-bdg-out="live-btn"]')).toHaveAttribute(
    'data-ac-bdg-bad',
    'true',
  );
});

test('the specimen button is renamed by the count, which is the unavoidable part', async ({
  page,
}) => {
  await page.locator('[data-ac-bdg-add]').click();

  await expect(page.locator('[data-ac-bdg-btn="quiet"]')).toHaveAccessibleName(
    'Inbox 99 unread messages',
  );
  await expect(page.locator('[data-ac-bdg-btn="live"]')).toHaveAccessibleName('Inbox');
});

test('past the maximum the digits stop and the words keep counting', async ({ page }) => {
  await page.locator('[data-ac-bdg-add]').click();
  await page.locator('[data-ac-bdg-add]').click();

  await expect(page.locator('[data-ac-bdg-badge="quiet"] .ac-badge__num')).toHaveText('99+');
  await expect(page.locator('[data-ac-bdg-btn="quiet"]')).toHaveAccessibleName(
    'Inbox 99 or more unread messages',
  );
  await expect(page.locator('[data-ac-bdg-verdict]')).toContainText('stopped counting');
});

test('reset puts the count back and empties the log', async ({ page }) => {
  await page.locator('[data-ac-bdg-add]').click();
  await expect(page.locator('[data-ac-bdg-log] li')).toHaveCount(2);

  await page.locator('[data-ac-bdg-reset]').click();

  // The log is cleared a frame later, so the reset's own mutations land in it
  // first and are then swept — assert the settled state, not the tick after.
  await expect(page.locator('[data-ac-bdg-log] li')).toHaveCount(0);
  await expect(page.locator('[data-ac-bdg-badge="quiet"] .ac-badge__num')).toHaveText('98');
  await expect(page.locator('[data-ac-bdg-slot]')).toBeEmpty();
});

/* --- across the page ------------------------------------------------------- */

test('setBadge writes the digits and the words in one call', async ({ page }) => {
  const result = await page.evaluate(() => {
    const el = document.querySelector('[data-ac-bdg-badge="quiet"]');
    AC.setBadge(el, 1, { subject: 'unread messages', max: 99 });
    const one = {
      num: el.querySelector('.ac-badge__num').textContent,
      name: el.querySelector('.ac-badge__name').textContent,
    };

    AC.setBadge(el, 0, { subject: 'unread messages', max: 99 });
    const zero = { hidden: el.hidden };

    // A function subject is the escape hatch for plurals and for every language
    // a template cannot serve.
    AC.setBadge(el, 1, { subject: (n) => n + ' unread message' });
    const plural = el.querySelector('.ac-badge__name').textContent;

    return { one, zero, plural };
  });

  expect(result.one).toEqual({ num: '1', name: '1 unread messages' });
  expect(result.zero.hidden).toBe(true);
  expect(result.plural).toBe('1 unread message');
});

test('under forced colors the accents collapse and the words are what is left', async ({
  page,
}) => {
  // page.emulateMedia, not test.use({ forcedColors }) — the latter is accepted
  // and silently ignored in this setup, so every assertion passes for the
  // wrong reason.
  await page.emulateMedia({ forcedColors: 'active' });

  const colors = await page
    .locator('.ac-bdg-panel')
    .first()
    .locator('.ac-badge')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderTopColor));
  expect(new Set(colors).size).toBe(1);

  // The solid weight is still a filled pill rather than collapsing into the
  // outlined one.
  const [outlined, solid] = await page.evaluate(() => [
    getComputedStyle(document.querySelector('.ac-bdg-bar .ac-badge')).backgroundColor,
    getComputedStyle(document.querySelector('.ac-badge--solid')).backgroundColor,
  ]);
  expect(outlined).not.toBe(solid);

  await expect(page.locator('.ac-bdg-bar .ac-btn').first()).toHaveAccessibleName(
    'Inbox 3 unread messages',
  );
});

test('reduced motion removes the button transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('[data-ac-bdg-add]')
    .evaluate((el) => getComputedStyle(el).transitionDuration);

  expect(duration.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});

test('the interactive controls clear the 24px floor', async ({ page }) => {
  for (const selector of ['[data-ac-bdg-add]', '[data-ac-bdg-reset]', '[data-ac-bdg-btn="nested"]']) {
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
