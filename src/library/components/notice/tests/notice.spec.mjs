import { test, expect } from '@playwright/test';

const PAGE = 'components/notice/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* Every claim on this page is about which element carries the live role and
   what is left of a tone once the color is gone, so that is what is asserted
   here — the roles, the announced text, and the computed styles in both color
   modes. */

/* --- example 1 · the specimen --------------------------------------------- */

test('the static notices carry no live role at all', async ({ page }) => {
  const panel = page.locator('.ac-nc-panel').first();
  const notices = panel.locator('.ac-notice');
  await expect(notices).toHaveCount(4);

  // Nothing changed, so there is nothing to announce. A role here fires on
  // every render.
  const roles = await notices.evaluateAll((els) => els.map((el) => el.getAttribute('role')));
  expect(roles).toEqual([null, null, null, null]);
});

test('each tone names itself in a word, and the icon is hidden', async ({ page }) => {
  const panel = page.locator('.ac-nc-panel').first();

  await expect(panel.locator('.ac-notice__prefix')).toHaveText([
    'Note:',
    'Success:',
    'Warning:',
    'Error:',
  ]);

  // The icon is decoration. If it were the thing saying "error" it would need
  // a name, and then the word would be in the wrong place.
  const hidden = await panel
    .locator('.ac-notice__icon')
    .evaluateAll((els) => els.every((el) => el.getAttribute('aria-hidden') === 'true'));
  expect(hidden).toBe(true);
});

test('the four tones differ, and differ by one custom property', async ({ page }) => {
  const accents = await page
    .locator('.ac-nc-panel')
    .first()
    .locator('.ac-notice')
    .evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).getPropertyValue('--ac-notice-accent').trim()),
    );

  expect(new Set(accents).size).toBe(4);
});

/* --- example 2 · the icon is decoration, the word is the meaning ----------- */

test('without the prefix the two tones announce the identical string', async ({ page }) => {
  const spoken = (key) =>
    page.locator(`[data-ac-nc-mono-target="${key}"] .ac-notice`).evaluateAll((els) =>
      els.map((el) => {
        const copy = el.cloneNode(true);
        copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
        return copy.textContent.replace(/\s+/g, ' ').trim();
      }),
    );

  const bare = await spoken('bare');
  expect(bare[0]).toBe(bare[1]);

  const good = await spoken('good');
  expect(good[0]).not.toBe(good[1]);
  expect(good[1].startsWith('Error:')).toBe(true);
});

test('the readout says the bare pair is told apart by nothing', async ({ page }) => {
  await expect(page.locator('[data-ac-nc-out="bare-tells"]')).toHaveText('nothing');
  await expect(page.locator('[data-ac-nc-out="bare-tells"]')).toHaveAttribute(
    'data-ac-nc-bad',
    'true',
  );
  await expect(page.locator('[data-ac-nc-out="good-tells"]')).toHaveText('the first word');
});

test('taking the color away changes nothing about what is announced', async ({ page }) => {
  const errorText = page
    .locator('[data-ac-nc-mono-target="bare"] .ac-notice--error .ac-notice__text');
  const before = await errorText.textContent();

  await page.locator('[data-ac-nc-mono]').check();
  await expect(page.locator('[data-ac-nc-mono-panel]')).toHaveAttribute(
    'data-ac-nc-mono-on',
    'true',
  );

  expect(await errorText.textContent()).toBe(before);
  await expect(page.locator('[data-ac-nc-out="bare-tells"]')).toHaveText('nothing');
});

/* --- example 3 · static or announced -------------------------------------- */

test('the specimen region carries the role, is in the DOM from the start, and is empty', async ({
  page,
}) => {
  const slot = page.locator('[data-ac-nc-slot="good"]');
  await expect(slot).toHaveAttribute('role', 'status');
  await expect(slot).toBeEmpty();

  // Not display: none, not visibility: hidden, not [hidden] — a region nobody
  // is watching cannot change. toBeVisible() cannot be used for this: an empty
  // region is 0px tall and Playwright calls that hidden, which is exactly the
  // state a screen reader is happy with.
  const how = await slot.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      display: style.display,
      visibility: style.visibility,
      hidden: el.hasAttribute('hidden'),
      inTree: el.isConnected,
    };
  });
  expect(how).toEqual({ display: 'block', visibility: 'visible', hidden: false, inTree: true });
});

test('pressing the specimen puts the notice inside the region, roleless', async ({ page }) => {
  const slot = page.locator('[data-ac-nc-slot="good"]');
  await page.locator('[data-ac-nc-add="good"]').click();

  const notice = slot.locator('.ac-notice');
  await expect(notice).toHaveText(/Success:/);
  // The role stays on the container. Moving it onto the notice is the failure
  // in the case beside this one.
  await expect(notice).not.toHaveAttribute('role', /.+/);
});

test('the region is observed empty between two identical messages', async ({ page }) => {
  // Assigning a region the string it already holds is not a change, so the
  // second press would be silent without the clear. Counting mutations cannot
  // tell the two apart — the empty state in between is what can.
  const seenEmpty = await page.evaluate(async () => {
    const slot = document.querySelector('[data-ac-nc-slot="good"]');
    document.querySelector('[data-ac-nc-add="good"]').click();
    await new Promise((r) => setTimeout(r, 120));

    let empty = false;
    const observer = new MutationObserver(() => {
      if (!slot.textContent.trim()) empty = true;
    });
    observer.observe(slot, { childList: true, subtree: true, characterData: true });

    document.querySelector('[data-ac-nc-add="good"]').click();
    await new Promise((r) => setTimeout(r, 200));
    observer.disconnect();
    return empty;
  });

  expect(seenEmpty).toBe(true);
});

test('a role that rides in on the notice announces nothing', async ({ page }) => {
  const log = page.locator('[data-ac-nc-log="appear"]');

  await page.locator('[data-ac-nc-add="late"]').click();
  await expect(log.locator('li')).toHaveText([/silent/]);
  await expect(log.locator('li').first()).toHaveAttribute('data-ac-nc-bad', 'true');

  // And the DOM afterwards is exactly what the working version produces, plus
  // an attribute in the wrong place. That is why this survives review.
  await expect(page.locator('[data-ac-nc-slot="late"] .ac-notice')).toHaveAttribute(
    'role',
    'status',
  );
});

test('the specimen reaches the log and the roleless slot does not', async ({ page }) => {
  const log = page.locator('[data-ac-nc-log="appear"]');

  await page.locator('[data-ac-nc-add="good"]').click();
  await expect(log.locator('li')).toHaveCount(1);
  await expect(log.locator('li').first()).toContainText('polite');
  await expect(log.locator('li').first()).not.toHaveAttribute('data-ac-nc-bad', 'true');

  await page.locator('[data-ac-nc-add="mute"]').click();
  await expect(log.locator('li')).toHaveCount(2);
  await expect(log.locator('li').nth(1)).toContainText('no live role anywhere');
});

/* --- example 4 · role="alert" is for errors, and never at page load -------- */

test('the server-rendered alert has already fired before anyone did anything', async ({ page }) => {
  const log = page.locator('[data-ac-nc-log="alert"]');

  // Nothing was pressed. This entry is in the log because the page loaded.
  await expect(log.locator('li')).toHaveCount(1);
  await expect(log.locator('li').first()).toContainText('assertive');
  await expect(log.locator('li').first()).toContainText('at page load');
  await expect(log.locator('li').first()).toHaveAttribute('data-ac-nc-bad', 'true');
});

test('errors are assertive and everything else is polite', async ({ page }) => {
  await expect(page.locator('[data-ac-nc-slot="err"]')).toHaveAttribute('role', 'alert');
  await expect(page.locator('[data-ac-nc-slot="ok"]')).toHaveAttribute('role', 'status');

  // Both empty at load, so neither has fired yet.
  await expect(page.locator('[data-ac-nc-slot="err"]')).toBeEmpty();
  await expect(page.locator('[data-ac-nc-slot="ok"]')).toBeEmpty();
});

test('a failed payment lands in the alert region and a good one in the status region', async ({
  page,
}) => {
  await page.locator('[data-ac-nc-pay="fail"]').click();
  await expect(page.locator('[data-ac-nc-slot="err"] .ac-notice')).toHaveClass(/ac-notice--error/);
  await expect(page.locator('[data-ac-nc-slot="err"]')).toContainText('Error:');
  await expect(page.locator('[data-ac-nc-slot="ok"]')).toBeEmpty();

  await page.locator('[data-ac-nc-pay="ok"]').click();
  await expect(page.locator('[data-ac-nc-slot="ok"] .ac-notice')).toHaveClass(
    /ac-notice--success/,
  );
});

/* --- example 5 · dismissing one ------------------------------------------- */

test('the three add buttons have three different names', async ({ page }) => {
  // Same page, same visible word, three different controls. Each name starts
  // with the visible text, so SC 2.5.3 holds.
  const names = await page
    .locator('[data-ac-nc-add]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));

  expect(new Set(names).size).toBe(3);
  expect(names.every((n) => n.startsWith('Save the crate'))).toBe(true);
});

test('the close buttons are named, and only one of them names its notice', async ({ page }) => {
  await expect(page.locator('[data-ac-nc-close="drop"]')).toHaveAccessibleName('Close');
  await expect(page.locator('[data-ac-nc-close="keep"]')).toHaveAccessibleName(
    'Dismiss: the zine ships separately',
  );
});

test('dismissing the broken one drops focus to the body', async ({ page }) => {
  await page.locator('[data-ac-nc-close="drop"]').focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-ac-nc-out="drop-focus"]')).toHaveText('body');
  await expect
    .poll(() => page.evaluate(() => document.activeElement.tagName))
    .toBe('BODY');
});

test('dismissing the specimen leaves focus on the named region, which says what happened', async ({
  page,
}) => {
  const host = page.locator('[data-ac-nc-host="keep"]');
  await expect(host).toHaveAttribute('role', 'status');

  await page.locator('[data-ac-nc-close="keep"]').focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-ac-nc-out="keep-focus"]')).toContainText('Shipping notices');
  await expect(host).toHaveText(/Dismissed/);
  await expect
    .poll(() => page.evaluate(() => document.activeElement.getAttribute('data-ac-nc-host')))
    .toBe('keep');
});

test('both notices come back', async ({ page }) => {
  await page.locator('[data-ac-nc-close="drop"]').click();
  await page.locator('[data-ac-nc-close="keep"]').click();
  await page.locator('[data-ac-nc-reset]').click();

  await expect(page.locator('[data-ac-nc-close="drop"]')).toBeVisible();
  await expect(page.locator('[data-ac-nc-close="keep"]')).toBeVisible();
});

/* --- across the page ------------------------------------------------------ */

test('the close button clears the 24px floor', async ({ page }) => {
  // Polled: the notice's entrance is motion-gated, and a box read a frame after
  // it appears is the transition rather than the resting size.
  await expect
    .poll(async () => {
      const box = await page.locator('[data-ac-nc-close="keep"]').boundingBox();
      return Math.min(box.width, box.height);
    })
    .toBeGreaterThanOrEqual(24);
});

test('under forced colors all four tones collapse, and the word is what is left', async ({
  page,
}) => {
  // page.emulateMedia, not test.use({ forcedColors }) — the latter is accepted
  // and silently ignored in this setup, so every assertion passes for the
  // wrong reason.
  await page.emulateMedia({ forcedColors: 'active' });

  const panel = page.locator('.ac-nc-panel').first();
  const prefixColors = await panel
    .locator('.ac-notice__prefix')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).color));

  // Identical, deliberately. Nothing can put the difference back — the user
  // asked for two colors.
  expect(new Set(prefixColors).size).toBe(1);

  await expect(panel.locator('.ac-notice__prefix')).toHaveText([
    'Note:',
    'Success:',
    'Warning:',
    'Error:',
  ]);
});

test('reduced motion removes the close button transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('[data-ac-nc-close="keep"]')
    .evaluate((el) => getComputedStyle(el).transitionDuration);

  expect(duration.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});

test('nothing overflows sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
