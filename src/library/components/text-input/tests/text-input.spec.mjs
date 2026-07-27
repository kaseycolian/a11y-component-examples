import { test, expect } from '@playwright/test';

const PAGE = 'components/text-input/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// Assert the ARIA contract and the keyboard map from docs/component-specs.md --
// not merely that the thing rendered. A test that only checks for presence
// would still pass if every attribute were wrong.

test('the page ships no JavaScript of its own', async ({ page }) => {
  // The claim in meta.json's demoNote. If a component.js ever appears, the
  // [slug] route would load it and this catches the drift.
  const srcs = await page.locator('script[src]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('src')),
  );
  expect(srcs.filter((s) => s.includes('/text-input/'))).toHaveLength(0);
});

test('every input is named by a real label, and the label focuses it', async ({ page }) => {
  const inputs = page.locator('.ac-input');
  expect(await inputs.count()).toBeGreaterThan(8);

  for (const input of await inputs.all()) {
    const id = await input.getAttribute('id');
    // A <label for> exists and resolves to this input...
    const labelText = await input.evaluate((el) => {
      const labels = el.labels;
      return labels && labels.length ? labels[0].textContent.trim() : null;
    });
    expect(labelText, id).toBeTruthy();
    // ...and it is the accessible name, not a placeholder standing in for one.
    await expect(input, id).toHaveAccessibleName(labelText);
  }

  await page.getByText('Full name', { exact: true }).click();
  await expect(page.locator('#ac-ti-name')).toBeFocused();
});

test('no input relies on a placeholder for its name', async ({ page }) => {
  const withPlaceholder = page.locator('.ac-input[placeholder]');

  for (const input of await withPlaceholder.all()) {
    const placeholder = await input.getAttribute('placeholder');
    const name = await input.evaluate((el) => el.labels[0].textContent.trim());
    // The placeholder is an example of the format, never the label.
    expect(name).not.toBe(placeholder);
    await expect(input).toHaveAccessibleName(name);
  }
});

test('autocomplete uses real tokens from the autofill field list', async ({ page }) => {
  // A guess does nothing at all and reports no error, so pin the exact values.
  const expected = {
    'ac-ti-name': 'name',
    'ac-ti-email': 'email',
    'ac-ti-tel': 'tel',
    'ac-ti-postcode': 'postal-code',
    'ac-ti-password': 'current-password',
    'ac-ti-url': 'url',
    'ac-ti-card': 'cc-number',
    'ac-ti-user': 'username',
  };

  for (const [id, token] of Object.entries(expected)) {
    await expect(page.locator(`#${id}`), id).toHaveAttribute('autocomplete', token);
  }
});

test('digit strings use type=text + inputmode, not type=number', async ({ page }) => {
  const card = page.locator('#ac-ti-card');
  const zip = page.locator('#ac-ti-postcode');

  // type="number" would drop a leading zero and spin on a mouse wheel.
  await expect(card).toHaveAttribute('type', 'text');
  await expect(card).toHaveAttribute('inputmode', 'numeric');
  await expect(zip).toHaveAttribute('type', 'text');
  await expect(zip).toHaveAttribute('inputmode', 'numeric');

  // Proof of the leading-zero problem this avoids.
  await zip.fill('01234');
  await expect(zip).toHaveValue('01234');

  // A real quantity keeps type="number" and its constraints.
  const qty = page.locator('#ac-ti-qty');
  await expect(qty).toHaveAttribute('type', 'number');
  await expect(qty).toHaveAttribute('min', '1');
});

test('each type picks the right keyboard and native validation', async ({ page }) => {
  await expect(page.locator('#ac-ti-email')).toHaveAttribute('type', 'email');
  await expect(page.locator('#ac-ti-tel')).toHaveAttribute('type', 'tel');
  await expect(page.locator('#ac-ti-url')).toHaveAttribute('type', 'url');

  // type="email" brings constraint validation for free.
  const email = page.locator('#ac-ti-email');
  await email.fill('nope');
  expect(await email.evaluate((el) => el.checkValidity())).toBe(false);
  await email.fill('someone@example.com');
  expect(await email.evaluate((el) => el.checkValidity())).toBe(true);
});

test('read-only stays focusable, copyable and submitted', async ({ page }) => {
  const key = page.locator('#ac-ti-key');

  await expect(key).toHaveAttribute('readonly', '');
  await key.focus();
  await expect(key).toBeFocused();

  // In the accessibility tree, with its value, unlike a disabled control.
  await expect(key).toHaveAccessibleName('API key');
  await expect(key).toHaveValue(/^sk_live_/);

  // The value can be selected, which is the whole reason it is readonly.
  const selected = await key.evaluate((el) => {
    el.select();
    return el.value.substring(el.selectionStart, el.selectionEnd);
  });
  expect(selected).toBe(await key.inputValue());

  // And a form would send it: readonly is submitted, disabled is not.
  const [readonlySubmitted, disabledSubmitted] = await page.evaluate(() => {
    const form = document.createElement('form');
    const ro = document.createElement('input');
    ro.name = 'ro';
    ro.value = 'x';
    ro.readOnly = true;
    const dis = document.createElement('input');
    dis.name = 'dis';
    dis.value = 'x';
    dis.disabled = true;
    form.append(ro, dis);
    document.body.append(form);
    const data = new FormData(form);
    form.remove();
    return [data.has('ro'), data.has('dis')];
  });
  expect(readonlySubmitted).toBe(true);
  expect(disabledSubmitted).toBe(false);
});

test('disabled is out of the tab order entirely', async ({ page }) => {
  const legacy = page.locator('#ac-ti-legacy');

  await expect(legacy).toBeDisabled();
  await page.locator('#ac-ti-key').focus();
  await page.keyboard.press('Tab');
  await expect(legacy).not.toBeFocused();
});

test('read-only is visually distinct from editable, in every theme', async ({ page }) => {
  const style = (sel) =>
    page.locator(sel).evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, border: s.borderTopStyle };
    });

  // Checked against a light theme AND a dark one: the first attempt used
  // --bg-elevated, which is the same white as --bg-panel in the light themes, so
  // read-only was styled identically to editable there.
  for (const theme of ['rink-classic-light', 'rink-classic-dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);

    const readOnly = await style('#ac-ti-key');
    const editable = await style('#ac-ti-name');

    expect(readOnly.bg, theme).not.toBe(editable.bg);
    // And a second, non-color cue.
    expect(readOnly.border, theme).not.toBe(editable.border);
  }
});

test('the invalid state is driven by aria-invalid and carries a message', async ({ page }) => {
  const user = page.locator('#ac-ti-user');
  const error = page.locator('#ac-ti-user-error');

  await expect(user).toHaveAttribute('aria-invalid', 'true');
  await expect(error).toHaveAttribute('role', 'alert');

  // Both hint and error are described, in DOM order -- the Field contract.
  const ids = (await user.getAttribute('aria-describedby')).split(/\s+/);
  expect(ids).toEqual(['ac-ti-user-hint', 'ac-ti-user-error']);
  await expect(user).toHaveAccessibleDescription(/Letters, numbers, underscores/);
  await expect(user).toHaveAccessibleDescription(/Remove the space/);
});

test('the invalid cue is not carried by color alone', async ({ page }) => {
  const width = (sel) =>
    page.locator(sel).evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));

  expect(await width('#ac-ti-user')).toBeGreaterThan(await width('#ac-ti-name'));
});

test('hints are descriptions, never part of the name', async ({ page }) => {
  const input = page.locator('#ac-ti-name');

  await expect(input).toHaveAccessibleName('Full name');
  await expect(input).toHaveAccessibleDescription('As it appears on your ID.');
});

test('the placeholder meets 4.5:1 rather than inheriting the UA fade', async ({ page }) => {
  const opacity = await page
    .locator('#ac-ti-url')
    .evaluate((el) => getComputedStyle(el, '::placeholder').opacity);

  // Firefox applies its own fade unless opacity is reset (SC 1.4.3).
  expect(parseFloat(opacity)).toBe(1);
});

test('the input inherits the page font rather than dropping to the UA default', async ({ page }) => {
  const [inputFont, bodyFont] = await page.evaluate(() => [
    getComputedStyle(document.querySelector('#ac-ti-name')).fontFamily,
    getComputedStyle(document.body).fontFamily,
  ]);
  // An unstyled input falls to ~13px monospace-ish defaults and also defeats a
  // page-level font-size preference.
  expect(inputFont).toBe(bodyFont);
});

test('--short narrows the input without breaking the target floor', async ({ page }) => {
  const short = await page.locator('#ac-ti-qty').boundingBox();
  const full = await page.locator('#ac-ti-card').boundingBox();

  // .ac-field is a flex column, so `width: auto` alone leaves an item stretched.
  expect(short.width).toBeLessThan(full.width);
  expect(short.width).toBeGreaterThanOrEqual(24);
});

test('a long value scrolls inside the input instead of widening it', async ({ page }) => {
  const long = page.locator('#ac-ti-long');
  const box = await long.boundingBox();
  const parent = await long.evaluate((el) => el.parentElement.clientWidth);

  expect(box.width).toBeLessThanOrEqual(parent + 1);
});

test('every input clears the 24x24 target floor', async ({ page }) => {
  for (const input of await page.locator('.ac-input').all()) {
    const box = await input.boundingBox();
    const id = await input.getAttribute('id');
    expect(box.width, id).toBeGreaterThanOrEqual(24);
    expect(box.height, id).toBeGreaterThanOrEqual(24);
  }
});

test('motion is gated, so reduced motion means no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('#ac-ti-name')
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
