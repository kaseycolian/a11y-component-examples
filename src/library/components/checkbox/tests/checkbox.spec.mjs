import { test, expect } from '@playwright/test';

const PAGE = 'components/checkbox/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// The interesting parts are the keyboard difference from radios and the mixed
// state, so that is where most of these go.

/* --- example 1 · one checkbox --------------------------------------------- */

test('a lone checkbox is named by its own label, with no fieldset', async ({ page }) => {
  const box = page.getByRole('checkbox', { name: 'Add me to the mailing list' });

  await expect(box).toBeVisible();
  // A single control needs no group; wrapping one checkbox in a fieldset just
  // adds a group announcement with nothing to group.
  expect(await box.evaluate((el) => !!el.closest('fieldset'))).toBe(false);
});

test('the label text is part of the target', async ({ page }) => {
  const row = page.locator('label[for="ac-cb-list"]');
  const box = await row.boundingBox();

  // A 1rem box is a 16px target and fails SC 2.5.8 on its own.
  expect(box.height).toBeGreaterThanOrEqual(24);

  await row.click();
  await expect(page.locator('#ac-cb-list')).toBeChecked();
});

test('Space toggles, and toggles back', async ({ page }) => {
  const box = page.locator('#ac-cb-list');

  await box.focus();
  await page.keyboard.press('Space');
  await expect(box).toBeChecked();
  await page.keyboard.press('Space');
  await expect(box).not.toBeChecked();
});

/* --- example 2 · a set in a fieldset -------------------------------------------- */

test('a set is a fieldset with a legend for its name', async ({ page }) => {
  await expect(page.getByRole('group', { name: 'Columns to export' })).toBeVisible();
});

test('every checkbox is its own tab stop, and arrows do nothing', async ({ page }) => {
  const order = page.locator('#ac-cb-order');

  await order.focus();
  await page.keyboard.press('Tab');
  // Unlike radios: any combination is allowed, so there is no "one of" for the
  // arrow keys to move between. A checkbox group that traps Tab is the bug.
  await expect(page.locator('#ac-cb-customer')).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#ac-cb-customer')).toBeFocused();
  await expect(page.locator('#ac-cb-customer')).not.toBeChecked();
});

test('a disabled option keeps its reason in its label', async ({ page }) => {
  const total = page.locator('#ac-cb-total');

  await expect(total).toBeDisabled();
  // A disabled control cannot explain itself, so the label does.
  await expect(total).toHaveAccessibleName(/not available on your plan/);
});

/* --- example 3 · the mixed state ------------------------------------------ */

test('the parent starts mixed, because some but not all children are checked', async ({ page }) => {
  const all = page.locator('#ac-cb-all');

  // indeterminate is a property; there is no attribute, so this state cannot be
  // server rendered and cannot be set in CSS.
  expect(await all.evaluate((el) => el.indeterminate)).toBe(true);
  await expect(all).not.toBeChecked();
  // The browser exposes "mixed" from the element itself.
  expect(await all.evaluate((el) => el.matches(':indeterminate'))).toBe(true);
});

test('no hand-written aria-checked competes with the native state', async ({ page }) => {
  const all = page.locator('#ac-cb-all');
  expect(await all.getAttribute('aria-checked')).toBeNull();
  expect(await all.getAttribute('role')).toBeNull();
});

test('checking every child resolves the parent to checked', async ({ page }) => {
  const all = page.locator('#ac-cb-all');

  for (const id of ['ac-cb-failed', 'ac-cb-summary', 'ac-cb-teammate']) {
    await page.locator(`label[for="${id}"]`).click();
  }

  await expect(all).toBeChecked();
  expect(await all.evaluate((el) => el.indeterminate)).toBe(false);
});

test('clearing every child resolves the parent to unchecked', async ({ page }) => {
  const all = page.locator('#ac-cb-all');

  await page.locator('label[for="ac-cb-shipped"]').click();

  await expect(all).not.toBeChecked();
  // Cleared explicitly: indeterminate survives a change to `checked` otherwise.
  expect(await all.evaluate((el) => el.indeterminate)).toBe(false);
});

test('clicking a mixed parent selects everything', async ({ page }) => {
  await page.locator('label[for="ac-cb-all"]').click();

  const states = await page
    .locator('[data-ac-check-item]')
    .evaluateAll((els) => els.map((el) => el.checked));
  expect(states.every(Boolean)).toBe(true);

  // And again clears it, so the control is a real toggle either way.
  await page.locator('label[for="ac-cb-all"]').click();
  const cleared = await page
    .locator('[data-ac-check-item]')
    .evaluateAll((els) => els.map((el) => el.checked));
  expect(cleared.some(Boolean)).toBe(false);
});

test('the count is announced through a polite live region, not the visible text', async ({
  page,
}) => {
  const status = page.locator('[data-ac-check-status]');
  const count = page.locator('[data-ac-check-count]');

  await expect(status).toHaveAttribute('role', 'status');
  // Visible count is decoration; the status is what is spoken, so the same number
  // is never read twice.
  await expect(count).toHaveAttribute('aria-hidden', 'true');
  await expect(count).toHaveText('1 of 4 selected');

  await page.locator('label[for="ac-cb-failed"]').click();
  await expect(status).toHaveText('2 of 4 selected.');
});

/* --- example 4 · required and invalid ------------------------------------- */

test('a required checkbox is invalid until checked, and says why', async ({ page }) => {
  const terms = page.locator('#ac-cb-terms');

  await expect(terms).toHaveAttribute('required', '');
  await expect(terms).toHaveAttribute('aria-invalid', 'true');
  await expect(terms).toHaveAccessibleDescription(/cannot be placed/);
  await expect(page.locator('#ac-cb-terms-error')).toHaveAttribute('role', 'alert');
  expect(await terms.evaluate((el) => el.checkValidity())).toBe(false);
});

test('invalid is not signaled by color alone', async ({ page }) => {
  const width = await page
    .locator('.ac-choice--invalid')
    .evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));
  expect(width).toBeGreaterThan(0);
  await expect(page.locator('#ac-cb-terms-error')).not.toHaveText('');
});

/* --- example 5 · drawn from scratch --------------------------------------- */

test('the drawn control keeps a real, focusable input underneath', async ({ page }) => {
  const input = page.locator('#ac-cb-drawn-off');

  const styles = await input.evaluate((el) => {
    const s = getComputedStyle(el);
    return { display: s.display, visibility: s.visibility, opacity: s.opacity };
  });

  // opacity: 0 only. display: none or visibility: hidden removes it from the
  // accessibility tree and takes the keyboard with it.
  expect(styles.opacity).toBe('0');
  expect(styles.display).not.toBe('none');
  expect(styles.visibility).toBe('visible');

  await input.focus();
  await page.keyboard.press('Space');
  await expect(input).toBeChecked();
});

test('the drawn box is decoration, so it adds nothing to the name', async ({ page }) => {
  await expect(page.locator('#ac-cb-drawn-on')).toHaveAccessibleName('Checked');
  await expect(page.locator('.ac-choice__box').first()).toHaveAttribute('aria-hidden', 'true');
});

test('the tick is drawn, not a glyph or an image', async ({ page }) => {
  const after = await page.locator('label[for="ac-cb-drawn-on"] .ac-choice__box').evaluate((el) => {
    const s = getComputedStyle(el, '::after');
    return { content: s.content, image: s.backgroundImage, border: s.borderBottomWidth };
  });

  // Two borders of an empty box, rotated: nothing to load, and no font to be
  // missing.
  expect(after.content).toBe('""');
  expect(after.image).toBe('none');
  expect(parseFloat(after.border)).toBeGreaterThan(0);
});

test('the focus ring appears on the drawn box, since the input is transparent', async ({ page }) => {
  await page.locator('#ac-cb-drawn-off').focus();

  const outline = await page
    .locator('label[for="ac-cb-drawn-off"] .ac-choice__box')
    .evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth));
  expect(outline).toBeGreaterThanOrEqual(3);
});

/* --- shared --------------------------------------------------------------- */

test('createCheckbox is idempotent and destroy undoes its wiring', async ({ page }) => {
  const result = await page.evaluate(() => {
    const root = document.querySelector('[data-ac-checkbox]');
    const all = document.querySelector('#ac-cb-all');

    const same = window.AC.createCheckbox(root) === root._acCheckbox;
    const state = root._acCheckbox.state();

    document.querySelector('#ac-cb-failed').checked = true;
    root._acCheckbox.refresh();
    const afterRefresh = root._acCheckbox.state().checked;

    root._acCheckbox.destroy();
    return {
      same,
      mixed: state.mixed,
      afterRefresh,
      indeterminateAfter: all.indeterminate,
      count: document.querySelector('[data-ac-check-count]').textContent,
      gone: !root._acCheckbox,
    };
  });

  expect(result.same).toBe(true);
  expect(result.mixed).toBe(true);
  // refresh() exists because setting .checked from code fires no change event.
  expect(result.afterRefresh).toBe(2);
  expect(result.indeterminateAfter).toBe(false);
  expect(result.count).toBe('');
  expect(result.gone).toBe(true);
});

test('every checkbox clears the 24px target floor', async ({ page }) => {
  const rows = page.locator('.ac-choice');
  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    const box = await rows.nth(i).boundingBox();
    expect(box.height, `row ${i}`).toBeGreaterThanOrEqual(24);
  }
});

test('motion is gated, so reduced motion means no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('.ac-choice__box')
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
