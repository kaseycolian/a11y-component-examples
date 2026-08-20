import { test, expect } from '@playwright/test';

const PAGE = 'components/radio-group/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// The browser supplies the behavior, so these assert that it has not been taken
// away: the group name, the single tab stop, arrows that select, and the states.

test('the page ships no JavaScript for this component', async ({ page }) => {
  const scripts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]'))
      .map((s) => s.src)
      .filter((src) => src.includes('/radio-group/')),
  );
  expect(scripts).toEqual([]);
});

/* --- example 1 · baseline group -------------------------------------------- */

test('the legend is the group name, and there is no invented role', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Refund method' });
  await expect(group).toBeVisible();

  // A fieldset with a legend already is a radio group. role="radiogroup" on top
  // replaces working semantics with hand-written ones.
  const roles = await page.locator('fieldset').evaluateAll((els) =>
    els.map((el) => el.getAttribute('role')),
  );
  expect(roles.every((r) => r === null)).toBe(true);

  // And the name comes from a real <legend>, first child of the fieldset.
  expect(
    await group.evaluate((el) => el.firstElementChild.tagName + '|' + el.firstElementChild.textContent.trim()),
  ).toBe('LEGEND|Refund method');
});

test('every radio in a group shares one name, or it is not a group', async ({ page }) => {
  const names = await page.locator('#ac-rg-refund-card, #ac-rg-refund-credit, #ac-rg-refund-bank').evaluateAll(
    (els) => els.map((el) => el.name),
  );
  expect(new Set(names).size).toBe(1);
});

test('nothing is checked to start with', async ({ page }) => {
  // A pre-checked default is an answer the user did not give.
  const checked = await page
    .locator('input[name="ac-rg-refund"]')
    .evaluateAll((els) => els.filter((el) => el.checked).length);
  expect(checked).toBe(0);
});

test('the whole group is one tab stop', async ({ page }) => {
  await page.locator('#ac-rg-refund-card').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#ac-rg-refund-credit')).toBeFocused();

  // Tab leaves the group entirely rather than walking the remaining options.
  await page.keyboard.press('Tab');
  const stillInside = await page.evaluate(
    () => document.activeElement.name === 'ac-rg-refund',
  );
  expect(stillInside).toBe(false);
});

test('arrows move and select in one action, and wrap', async ({ page }) => {
  const first = page.locator('#ac-rg-refund-card');
  const last = page.locator('#ac-rg-refund-bank');

  await first.focus();
  await page.keyboard.press('ArrowDown');
  // Native radio behavior: moving *is* choosing. This is the whole reason not to
  // reimplement it.
  await expect(page.locator('#ac-rg-refund-credit')).toBeChecked();

  await page.keyboard.press('ArrowDown');
  await expect(last).toBeChecked();
  await page.keyboard.press('ArrowDown');
  await expect(first).toBeChecked();

  await page.keyboard.press('ArrowUp');
  await expect(last).toBeChecked();
});

test('the label row is the target, not just the dot', async ({ page }) => {
  const row = page.locator('label[for="ac-rg-refund-bank"]');
  const box = await row.boundingBox();

  // A 1rem circle is a 16px target and fails SC 2.5.8 on its own.
  expect(box.height).toBeGreaterThanOrEqual(24);
  expect(box.width).toBeGreaterThan(60);

  // Clicking the text checks the radio, which is what a real <label for> buys.
  await row.click();
  await expect(page.locator('#ac-rg-refund-bank')).toBeChecked();
});

/* --- example 2 · required and invalid ------------------------------------- */

test('the error is described by every radio, not only by the fieldset', async ({ page }) => {
  const radios = page.locator('input[name="ac-rg-invoice"]');
  const count = await radios.count();
  expect(count).toBe(3);

  for (let i = 0; i < count; i++) {
    // A fieldset's own description is announced inconsistently, and never again
    // once focus is on the third option. Per-input is the version that speaks.
    await expect(radios.nth(i)).toHaveAccessibleDescription(/cannot be sent/);
    await expect(radios.nth(i)).toHaveAttribute('aria-invalid', 'true');
    await expect(radios.nth(i)).toHaveAttribute('required', '');
  }

  await expect(page.locator('#ac-rg-invoice-error')).toHaveAttribute('role', 'alert');
});

test('an unanswered required group is invalid to the browser too', async ({ page }) => {
  const valid = await page
    .locator('#ac-rg-invoice-email')
    .evaluate((el) => el.checkValidity());
  expect(valid).toBe(false);
});

test('invalid is not signaled by color alone', async ({ page }) => {
  const [invalid, plain] = await Promise.all([
    page.locator('.ac-group--invalid').evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth)),
    page
      .getByRole('group', { name: 'Refund method' })
      .evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth)),
  ]);
  expect(invalid).toBeGreaterThan(plain);
  await expect(page.locator('#ac-rg-invoice-error')).not.toHaveText('');
});

/* --- example 3 · per-option text ------------------------------------------ */

test('a per-option note is part of that radio accessible name', async ({ page }) => {
  // Inside the label, so it is read in one go and cannot be skipped the way a
  // separate description can.
  await expect(page.locator('#ac-rg-plan-growth')).toHaveAccessibleName(/Growth[\s\S]*462 orders/);
  await expect(page.locator('#ac-rg-plan-enterprise')).toHaveAccessibleName(
    /Enterprise[\s\S]*named contact/,
  );
});

/* --- example 4 · unavailable and locked ----------------------------------- */

test('a disabled radio stays in the group, with its reason in the label', async ({ page }) => {
  const taken = page.locator('#ac-rg-pickup-dock');

  await expect(taken).toBeDisabled();
  // Kept rather than removed, so the user learns the option exists -- and a
  // disabled control cannot explain itself, so the label does.
  await expect(taken).toHaveAccessibleName(/closed this week/);
});

test('a disabled fieldset disables every control inside it and keeps its legend', async ({
  page,
}) => {
  const group = page.getByRole('group', { name: 'Billing cycle' });

  // :disabled, not el.disabled -- the IDL property only reflects the control's
  // own attribute, while the fieldset's disabling is inherited. Same distinction
  // your CSS has to make.
  const states = await group
    .locator('input')
    .evaluateAll((els) => els.map((el) => el.matches(':disabled')));
  expect(states).toEqual([true, true]);

  // The legend is what tells someone what the locked group was for.
  await expect(group.locator('legend')).toBeVisible();
});

/* --- example 5 · drawn from scratch --------------------------------------- */

test('the drawn control keeps a real, focusable input underneath', async ({ page }) => {
  const input = page.locator('#ac-rg-freq-daily');

  const styles = await input.evaluate((el) => {
    const s = getComputedStyle(el);
    return { display: s.display, visibility: s.visibility, opacity: s.opacity };
  });

  // opacity: 0 only. display: none or visibility: hidden would take it out of
  // the accessibility tree and out of the tab order with it.
  expect(styles.opacity).toBe('0');
  expect(styles.display).not.toBe('none');
  expect(styles.visibility).toBe('visible');

  await page.locator('#ac-rg-freq-all').focus();
  await page.keyboard.press('ArrowDown');
  await expect(input).toBeChecked();
  await expect(input).toBeFocused();
});

test('the drawn dot is decoration, so it adds nothing to the name', async ({ page }) => {
  await expect(page.locator('#ac-rg-freq-all')).toHaveAccessibleName('Every change');
  await expect(page.locator('.ac-choice__dot').first()).toHaveAttribute('aria-hidden', 'true');
});

test('the focus ring appears on the drawn control, since the input is transparent', async ({
  page,
}) => {
  await page.locator('#ac-rg-freq-all').focus();
  // Keyboard focus, so :focus-visible applies.
  const outline = await page
    .locator('label[for="ac-rg-freq-all"] .ac-choice__dot')
    .evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth));
  expect(outline).toBeGreaterThanOrEqual(3);
});

/* --- shared --------------------------------------------------------------- */

test('a fieldset does not push the page sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.reload();

  // A fieldset's default min-inline-size is min-content, which is exactly how
  // this overflows if min-width: 0 is missing.
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

test('motion is gated, so reduced motion means no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('.ac-choice__dot')
    .first()
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(duration.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});
