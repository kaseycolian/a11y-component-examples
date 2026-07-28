import { test, expect } from '@playwright/test';

const PAGE = 'components/input-group/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// Assert the ARIA contract from docs/component-specs.md -- not merely that the
// thing rendered. Most of what can go wrong here is the addon: its name, its
// size, and whether it sits beside the value or on top of it.

/* --- example 1 · submit ---------------------------------------------------- */

test('the addon is a real submit button inside a real form', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Search' });

  await expect(button).toHaveAttribute('type', 'submit');
  // Enter in the field has to work without the button, so the button cannot be
  // the only route to submitting.
  expect(await button.evaluate((el) => !!el.form)).toBe(true);
});

test('the field is labeled, and not by its placeholder or its button', async ({ page }) => {
  await expect(page.locator('#ac-ig-q')).toHaveAccessibleName('Search components');
  await expect(page.locator('#ac-ig-q')).toHaveAccessibleDescription(
    /Enter submits/,
  );
});

/* --- geometry · the addon is beside the value, not over it ----------------- */

test('the addon sits beside the input rather than on top of it', async ({ page }) => {
  const input = await page.locator('#ac-ig-q').boundingBox();
  const button = await page.getByRole('button', { name: 'Search' }).boundingBox();

  // Overlapping by more than the 1px shared border means it is an overlay, which
  // covers the value as the text grows and swallows clicks meant for the field.
  expect(button.x).toBeGreaterThanOrEqual(input.x + input.width - 2);
});

test('the row survives 200% zoom without the addon covering the text', async ({ page }) => {
  // Doubling the root font size is what a 200% text-size preference does, and it
  // is the case an absolutely-positioned addon fails (SC 1.4.4).
  await page.addStyleTag({ content: 'html { font-size: 200% }' });

  const input = await page.locator('#ac-ig-q').boundingBox();
  const button = await page.getByRole('button', { name: 'Search' }).boundingBox();

  expect(button.x).toBeGreaterThanOrEqual(input.x + input.width - 2);
  expect(input.width).toBeGreaterThan(40);
});

test('every addon clears the 24x24 target floor', async ({ page }) => {
  const buttons = page.locator('.ac-input-group__btn');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    expect(box.width, `addon ${i} width`).toBeGreaterThanOrEqual(24);
    expect(box.height, `addon ${i} height`).toBeGreaterThanOrEqual(24);
  }
});

/* --- example 2 · password reveal ------------------------------------------ */

test('the reveal button names the action, and carries no aria-pressed', async ({ page }) => {
  const input = page.locator('#ac-ig-pw');
  const button = page.getByRole('button', { name: 'Show password' });

  await expect(input).toHaveAttribute('type', 'password');
  await expect(button).toHaveAccessibleName('Show password');
  // "Show password, pressed" leaves the user deciding whether pressed describes
  // the field or the button. One channel, not two.
  expect(await button.getAttribute('aria-pressed')).toBeNull();

  await button.click();

  await expect(input).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'Hide password' })).toBeVisible();
});

test('the visible word starts the accessible name, so speech input reaches it', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Show password' });

  // SC 2.5.3: "Show" is what is on screen, so it has to be in the name -- and at
  // the start, or "click show" does not match.
  expect((await button.textContent()).trim()).toBe('Show');

  await button.click();
  expect((await page.getByRole('button', { name: 'Hide password' }).textContent()).trim()).toBe(
    'Hide',
  );
});

test('revealing keeps the value and the caret where they were', async ({ page }) => {
  const input = page.locator('#ac-ig-pw');

  await input.click();
  await input.evaluate((el) => el.setSelectionRange(3, 3));
  await page.getByRole('button', { name: 'Show password' }).click();

  expect(await input.inputValue()).toBe('TimeBomb462');
  // Changing `type` resets the selection in most browsers; the script puts it
  // back, because the user was probably mid-word.
  expect(await input.evaluate((el) => el.selectionStart)).toBe(3);
});

/* --- example 3 · copy ----------------------------------------------------- */

test('the copy confirmation goes to a live region that already exists', async ({ page }) => {
  const status = page.locator('[data-ac-copy-status]');

  // Present and empty before anything happens. Insert the element and its text
  // together and there is no change for a screen reader to notice.
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveText('');

  await page.getByRole('button', { name: 'Copy API key' }).click();

  await expect(status).toHaveText(/Copied|Control C/);
});

test('the copy button keeps its name instead of becoming "Copied"', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Copy API key' });

  await button.click();
  await expect(page.locator('[data-ac-copy-status]')).not.toHaveText('');
  // A name that changes under your finger reads as a different button.
  await expect(button).toHaveAccessibleName('Copy API key');
});

test('copy puts the field value on the clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only here');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.getByRole('button', { name: 'Copy API key' }).click();

  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe('sk_test_99RubySoho462Linoleum');
});

test('the copied value is read-only, not disabled, so it can still be selected', async ({
  page,
}) => {
  const input = page.locator('#ac-ig-key');

  await expect(input).toHaveAttribute('readonly', '');
  expect(await input.evaluate((el) => el.hasAttribute('disabled'))).toBe(false);

  await input.focus();
  await expect(input).toBeFocused();
});

/* --- example 4 · affixes -------------------------------------------------- */

test('the affix format is repeated in the described hint, not left on screen only', async ({
  page,
}) => {
  const input = page.locator('#ac-ig-sub');

  // Forms mode skips static text beside an input, so an affix alone is a format
  // requirement the user has to guess. It has to reach aria-describedby.
  await expect(input).toHaveAccessibleDescription(/example\.com/);
  await expect(page.locator('.ac-input-group__affix').first()).toHaveText('https://');
});

test('the affixes do not squeeze the field below a usable width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.reload();

  const box = await page.locator('#ac-ig-sub').boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(64);
});

/* --- example 5 · invalid -------------------------------------------------- */

test('invalid marks the input and describes both hint and error', async ({ page }) => {
  const input = page.locator('#ac-ig-coupon');

  await expect(input).toHaveAttribute('aria-invalid', 'true');
  // aria-describedby is a space-separated list: the user hears both, in order.
  await expect(input).toHaveAccessibleDescription(/Case-insensitive[\s\S]*expired/);

  // The button beside an invalid field is still a perfectly good button.
  const apply = page.getByRole('button', { name: 'Apply' });
  expect(await apply.evaluate((el) => el.hasAttribute('disabled'))).toBe(false);
  expect(await apply.getAttribute('aria-disabled')).toBeNull();
});

test('the error is not signaled by color alone', async ({ page }) => {
  const width = await page
    .locator('#ac-ig-coupon')
    .evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));
  expect(width).toBeGreaterThan(1);

  await expect(page.locator('#ac-ig-coupon-error')).toHaveAttribute('role', 'alert');
  await expect(page.locator('#ac-ig-coupon-error')).not.toHaveText('');
});

/* --- shared --------------------------------------------------------------- */

test('the group never clips the focus ring off its children', async ({ page }) => {
  const overflow = await page
    .locator('.ac-input-group')
    .first()
    .evaluate((el) => getComputedStyle(el).overflow);
  // overflow:hidden on the row is the standard way this component loses its
  // focus indicator, and an invisible focus ring is no focus ring (SC 2.4.11).
  expect(overflow).toBe('visible');
});

test('createInputGroup is idempotent and destroy undoes its wiring', async ({ page }) => {
  const result = await page.evaluate(() => {
    const root = document.querySelector('#ac-ig-pw').closest('[data-ac-input-group]');
    const input = document.querySelector('#ac-ig-pw');

    const same = window.AC.createInputGroup(root) === root._acInputGroup;
    root._acInputGroup.reveal(true);
    const revealed = input.type;
    root._acInputGroup.destroy();

    return { same, revealed, typeAfter: input.type, gone: !root._acInputGroup };
  });

  expect(result.same).toBe(true);
  expect(result.revealed).toBe('text');
  // destroy() is the inverse of create: the field goes back to being masked.
  expect(result.typeAfter).toBe('password');
  expect(result.gone).toBe(true);
});

test('motion is gated, so reduced motion means no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('.ac-input-group__btn')
    .first()
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(duration.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});

test('nothing overflows sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.reload();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
