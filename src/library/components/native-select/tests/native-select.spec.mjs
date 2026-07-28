import { test, expect } from '@playwright/test';

const PAGE = 'components/native-select/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// The browser supplies the behavior here, so these tests are about not having
// broken it: the name, the caret, the keyboard, the states, and the promise that
// no script is involved.

test('the page ships no JavaScript for this component', async ({ page }) => {
  // The whole argument for this component is that there is nothing to run.
  const scripts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]'))
      .map((s) => s.src)
      .filter((src) => src.includes('/native-select/')),
  );
  expect(scripts).toEqual([]);
  expect(await page.evaluate(() => !!(window.AC && window.AC.createNativeSelect))).toBe(false);
});

/* --- example 1 · the baseline --------------------------------------------- */

test('every select is labeled by its label, not by its first option', async ({ page }) => {
  await expect(page.locator('#ac-ns-venue')).toHaveAccessibleName('Venue');
  await expect(page.locator('#ac-ns-venue')).toHaveAccessibleDescription(/OS picker/);

  const selects = page.locator('.ac-select');
  const count = await selects.count();
  for (let i = 0; i < count; i++) {
    const name = await selects.nth(i).evaluate((el) => {
      const label = el.labels && el.labels[0];
      return label ? label.textContent.trim() : el.getAttribute('aria-label');
    });
    expect(name, `select ${i} has no label`).toBeTruthy();
  }
});

test('it is a real combobox to assistive technology', async ({ page }) => {
  // appearance: none is a paint change. The role, the value and the keyboard all
  // stay the browser's.
  await expect(page.getByRole('combobox', { name: 'Venue' })).toBeVisible();
  await expect(page.locator('#ac-ns-venue')).toHaveValue('olympia');
});

test('the keyboard is the browser own, and untouched', async ({ page }) => {
  const select = page.locator('#ac-ns-venue');

  await select.focus();
  await page.keyboard.press('Home');
  expect(await select.inputValue()).toBe('brixton');

  await page.keyboard.press('ArrowDown');
  expect(await select.inputValue()).toBe('olympia');

  // Type-ahead, for free, in every browser.
  await page.keyboard.press('g');
  expect(await select.inputValue()).toBe('gilman');
});

test('the caret is drawn, and the text never runs under it', async ({ page }) => {
  const styles = await page.locator('#ac-ns-venue').evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      appearance: s.appearance,
      image: s.backgroundImage,
      padRight: parseFloat(s.paddingRight),
      padLeft: parseFloat(s.paddingLeft),
    };
  });

  expect(styles.appearance).toBe('none');
  expect(styles.image).toContain('gradient');
  // Right padding has to clear the caret, or a long option collides with it.
  expect(styles.padRight).toBeGreaterThan(styles.padLeft * 2);
});

test('the font is inherited rather than dropping to the UA default', async ({ page }) => {
  const size = await page
    .locator('#ac-ns-venue')
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThan(13);
});

/* --- example 2 · groups and the placeholder ------------------------------- */

test('optgroups are real groups, with their labels', async ({ page }) => {
  const select = page.getByRole('combobox', { name: 'Tour leg' });

  // Native grouping, announced by every screen reader that matters. Nothing to
  // build, nothing to keep in sync.
  const groups = await select.evaluate((el) =>
    Array.from(el.querySelectorAll('optgroup')).map((g) => g.label),
  );
  expect(groups).toEqual(['Spring', 'Summer']);
});

test('the placeholder option is empty-valued so required can reject it', async ({ page }) => {
  const select = page.locator('#ac-ns-tour');

  await expect(select).toHaveAttribute('required', '');
  expect(await select.inputValue()).toBe('');
  // A prompt, not a label: the <label> is still what names the control, so the
  // name does not vanish the moment something is chosen.
  await expect(select).toHaveAccessibleName('Tour leg');
  expect(await select.evaluate((el) => el.checkValidity())).toBe(false);
});

/* --- example 3 · unavailable ---------------------------------------------- */

test('an unavailable option stays in the list', async ({ page }) => {
  const select = page.locator('#ac-ns-slot');

  const taken = select.locator('option[value="support"]');
  await expect(taken).toHaveAttribute('disabled', '');
  // Kept rather than removed, so the user can learn the option exists.
  await expect(taken).toHaveText(/taken/);

  // And it cannot be chosen with the keyboard either -- the browser skips it.
  await select.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  expect(await select.inputValue()).toBe('headline');
});

test('a disabled select is skipped by Tab and not submitted', async ({ page }) => {
  const select = page.locator('#ac-ns-label');

  await expect(select).toBeDisabled();
  // The tradeoff worth knowing: this control can no longer explain itself, which
  // is why the hint beside it does.
  expect(await select.evaluate((el) => el.disabled && !el.willValidate)).toBe(true);
  await expect(select).toHaveAccessibleDescription(/not submitted/);
});

/* --- example 4 · invalid -------------------------------------------------- */

test('invalid is aria-driven, described, and not color alone', async ({ page }) => {
  const select = page.locator('#ac-ns-merch');

  await expect(select).toHaveAttribute('aria-invalid', 'true');
  // aria-describedby is a space-separated list: hint then error, in order.
  await expect(select).toHaveAccessibleDescription(/Runs small[\s\S]*cannot ship/);
  await expect(page.locator('#ac-ns-merch-error')).toHaveAttribute('role', 'alert');

  const width = await select.evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));
  const plain = await page
    .locator('#ac-ns-venue')
    .evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));
  expect(width).toBeGreaterThan(plain);
});

/* --- example 5 · multiple ------------------------------------------------- */

test('multiple is left native, sized, and reports every selection', async ({ page }) => {
  const select = page.locator('#ac-ns-riders');

  await expect(select).toHaveAttribute('multiple', '');
  // Without `size` a multiple select is a four-row box that reads as a bug.
  await expect(select).toHaveAttribute('size', '5');
  // A listbox, not a combobox: the role changes with `multiple`, and so does the
  // keyboard model -- which is why the Dropdown refuses to enhance it.
  await expect(page.getByRole('listbox', { name: 'Rider' })).toBeVisible();

  expect(await select.evaluate((el) => Array.from(el.selectedOptions).map((o) => o.value))).toEqual([
    'water',
    'strings',
  ]);
});

test('multiple rows clear the 24px target floor', async ({ page }) => {
  const rows = await page
    .locator('#ac-ns-riders option')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));

  expect(rows.length).toBe(5);
  for (const [i, h] of rows.entries()) {
    expect(h, `row ${i}`).toBeGreaterThanOrEqual(24);
  }
});

/* --- shared --------------------------------------------------------------- */

test('every select clears the 24x24 target floor', async ({ page }) => {
  const selects = page.locator('.ac-select');
  const count = await selects.count();

  for (let i = 0; i < count; i++) {
    const box = await selects.nth(i).boundingBox();
    expect(box.width, `select ${i} width`).toBeGreaterThanOrEqual(24);
    expect(box.height, `select ${i} height`).toBeGreaterThanOrEqual(24);
  }
});

test('options carry their own colors, not just the control surface', async ({ page }) => {
  // Windows and some Linux builds inherit the control's colors into the dropped
  // list, which is how light text on a light background happens.
  const option = await page.locator('#ac-ns-venue option').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, color: s.color };
  });

  expect(option.bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(option.color).toBeTruthy();
});

test('motion is gated, so reduced motion means no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('#ac-ns-venue')
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
