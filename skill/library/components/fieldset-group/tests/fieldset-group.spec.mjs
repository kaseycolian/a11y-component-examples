import { test, expect } from '@playwright/test';

const PAGE = 'components/fieldset-group/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// The interesting parts are that the legend really is the group's name, that the
// two fieldset quirks are handled, that a group error reaches the control the
// person is standing on, and that only one of the two locks cascades.

/* --- example 1 · baseline group --------------------------------------------- */

test('the legend names the group', async ({ page }) => {
  await expect(page.getByRole('group', { name: 'Delivery instructions', exact: true })).toBeVisible();
});

test('the legend is the first child, or it names nothing', async ({ page }) => {
  const tag = await page
    .getByRole('group', { name: 'Delivery instructions', exact: true })
    .evaluate((el) => el.firstElementChild.tagName);
  expect(tag).toBe('LEGEND');
});

test('each control keeps its own name and its own tab stop', async ({ page }) => {
  const signature = page.getByRole('checkbox', { name: 'Signature required' });

  // The legend is the subject, not part of the name: "Delivery instructions
  // Signature required" would be read on every box.
  await expect(signature).toHaveAccessibleName('Signature required');

  await page.locator('#ac-fg-desk').focus();
  await page.keyboard.press('Tab');
  await expect(signature).toBeFocused();
});

test('the row is the target, and it clears 44px', async ({ page }) => {
  const row = page.locator('label[for="ac-fg-signature"]');
  const box = await row.boundingBox();

  // A 1.15rem square is an 18px target and fails SC 2.5.8 on its own.
  expect(box.height).toBeGreaterThanOrEqual(44);

  await row.click();
  await expect(page.locator('#ac-fg-signature')).toBeChecked();
});

test('Space toggles, since the group adds no keys of its own', async ({ page }) => {
  const signature = page.locator('#ac-fg-signature');

  await signature.focus();
  await page.keyboard.press('Space');
  await expect(signature).toBeChecked();
});

/* --- the two fieldset quirks ---------------------------------------------- */

test('the fieldset is allowed to shrink', async ({ page }) => {
  const min = await page
    .getByRole('group', { name: 'Delivery instructions', exact: true })
    .evaluate((el) => getComputedStyle(el).minInlineSize);

  // A fieldset defaults to min-content, which is the one box on a page that
  // refuses to shrink -- and the usual cause of sideways scroll at 320px.
  expect(min).toBe('0px');
});

test('the layout is on the body div, not on the fieldset', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Delivery instructions', exact: true });

  // A <legend> cannot be a flex item, and older Safari will not make a fieldset
  // a flex container at all.
  expect(await group.evaluate((el) => getComputedStyle(el).display)).not.toBe('flex');
  expect(
    await group.locator('.ac-group__body').evaluate((el) => getComputedStyle(el).display),
  ).toBe('flex');
});

/* --- example 2 · one answer, several inputs -------------------------------- */

test('parts of one answer share the question and keep their own labels', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Pickup time' });

  await expect(group).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Hour' })).toHaveValue('09');
  await expect(page.getByRole('textbox', { name: 'Minute' })).toHaveValue('30');
});

test('the separator is decoration and is not announced', async ({ page }) => {
  await expect(page.locator('.ac-group__sep')).toHaveAttribute('aria-hidden', 'true');
});

test('the group hint describes the group', async ({ page }) => {
  await expect(page.getByRole('group', { name: 'Pickup time' })).toHaveAccessibleDescription(
    /closes at 17:00/,
  );
});

/* --- example 3 · role="group" named by a heading --------------------------- */

test('a role="group" is named by the heading it points at', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Invoice options' });

  await expect(group).toBeVisible();
  // The point of the variant: the name is a real heading, so it lands in the
  // heading list a screen reader user navigates a long form with.
  await expect(page.getByRole('heading', { name: 'Invoice options' })).toBeVisible();
});

/* --- example 4 · pick at least one ---------------------------------------- */

test('the error region exists, empty, before it has anything to say', async ({ page }) => {
  const error = page.locator('[data-ac-group-error]');

  await expect(error).toHaveAttribute('role', 'alert');
  await expect(error).toHaveText('');
  // A live region inserted along with its text is no change to notice.
  expect(await error.evaluate((el) => getComputedStyle(el).display)).not.toBe('none');
});

test('nothing is invalid before the group has been touched', async ({ page }) => {
  await expect(page.locator('#ac-fg-pay-card')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.ac-group--invalid')).toHaveCount(0);
});

test('emptying the group is reported, and the message reaches every control', async ({ page }) => {
  const card = page.locator('#ac-fg-pay-card');
  const error = page.locator('[data-ac-group-error]');

  await card.uncheck();

  await expect(error).toHaveText(/Pick at least one/);
  await expect(card).toHaveAttribute('aria-invalid', 'true');

  // Every checkbox, not just the fieldset: a fieldset's own description is read
  // inconsistently, and never again once focus is on the third box.
  for (const id of ['ac-fg-pay-card', 'ac-fg-pay-bank', 'ac-fg-pay-invoice', 'ac-fg-pay-credit']) {
    await expect(page.locator(`#${id}`)).toHaveAccessibleDescription(/Pick at least one/);
  }
});

test('the group is not signaled as invalid by color alone', async ({ page }) => {
  await page.locator('#ac-fg-pay-card').uncheck();

  const group = page.locator('.ac-group--invalid');
  const width = await group.evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));
  const marker = await page
    .locator('[data-ac-group-error]')
    .evaluate((el) => getComputedStyle(el, '::before').clipPath);

  expect(width).toBeGreaterThanOrEqual(2);
  expect(marker).not.toBe('none');
});

test('answering the question clears the error and the invalid state', async ({ page }) => {
  const card = page.locator('#ac-fg-pay-card');

  await card.uncheck();
  await page.locator('#ac-fg-pay-credit').check();

  await expect(page.locator('[data-ac-group-error]')).toHaveText('');
  await expect(card).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.ac-group--invalid')).toHaveCount(0);
});

test('validate(false) answers without touching the page', async ({ page }) => {
  const result = await page.evaluate(() => {
    const el = document.querySelector('[data-ac-min="1"]');
    el.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      box.checked = false;
    });

    const quiet = el._acFieldsetGroup.validate(false);
    return { quiet, said: el.querySelector('[data-ac-group-error]').textContent };
  });

  // For enabling a submit button without shouting at someone mid-form.
  expect(result.quiet).toBe(false);
  expect(result.said).toBe('');
});

/* --- example 5 · locked, two ways ----------------------------------------- */

test('disabled on the fieldset cascades and takes the keyboard with it', async ({ page }) => {
  const vat = page.locator('#ac-fg-vat');

  await expect(vat).toBeDisabled();

  // The IDL property reflects only the input's own attribute, which is why this
  // has to be styled and tested on :disabled.
  expect(await vat.evaluate((el) => el.disabled)).toBe(false);

  await page.locator('#ac-fg-billing').focus();
  await page.keyboard.press('Tab');
  await expect(vat).not.toBeFocused();
});

test('a locked group keeps its legend readable', async ({ page }) => {
  // It is what tells someone what the locked group was for.
  await expect(page.getByRole('group', { name: 'Tax settings' })).toBeVisible();
});

test('aria-disabled cascades to nothing, so the controls carry it themselves', async ({ page }) => {
  const partial = page.locator('#ac-fg-partial');

  await expect(page.locator('fieldset[aria-disabled="true"]')).toHaveCount(1);
  await expect(partial).toHaveAttribute('aria-disabled', 'true');

  // Still reachable, and still able to say why -- the whole reason to prefer it.
  expect(await partial.evaluate((el) => el.disabled)).toBe(false);
  await expect(partial).toHaveAccessibleDescription(/Finance locks this/);

  await partial.focus();
  await expect(partial).toBeFocused();
});

test('aria-disabled is enforced, by pointer and by Space', async ({ page }) => {
  const partial = page.locator('#ac-fg-partial');

  await expect(partial).toBeChecked();

  // force, because Playwright will not click through aria-disabled on its own --
  // it is still a real trusted click, which is what the guard has to survive.
  await page.locator('label[for="ac-fg-partial"]').click({ force: true });
  await expect(partial).toBeChecked();

  await partial.focus();
  await page.keyboard.press('Space');
  await expect(partial).toBeChecked();
});

test('unavailable is not signaled by dimming alone', async ({ page }) => {
  for (const selector of ['fieldset[disabled]', 'fieldset[aria-disabled="true"]']) {
    const style = await page
      .locator(selector)
      .evaluate((el) => getComputedStyle(el).borderTopStyle);
    expect(style).toBe('dashed');
  }
});

/* --- shared --------------------------------------------------------------- */

test('createFieldsetGroup is idempotent and destroy undoes its wiring', async ({ page }) => {
  const result = await page.evaluate(() => {
    const el = document.querySelector('[data-ac-min="1"]');
    const first = el.querySelector('input[type="checkbox"]');

    const same = window.AC.createFieldsetGroup(el) === el._acFieldsetGroup;

    first.checked = false;
    el._acFieldsetGroup.validate();
    const shouted = el.querySelector('[data-ac-group-error]').textContent;

    el._acFieldsetGroup.destroy();
    return {
      same,
      shouted,
      quieted: el.querySelector('[data-ac-group-error]').textContent,
      describedby: first.getAttribute('aria-describedby'),
      invalid: first.getAttribute('aria-invalid'),
      gone: !el._acFieldsetGroup,
    };
  });

  expect(result.same).toBe(true);
  expect(result.shouted).toMatch(/Pick at least one/);
  expect(result.quieted).toBe('');
  // The ids it added, and only those.
  expect(result.describedby).toBeNull();
  expect(result.invalid).toBeNull();
  expect(result.gone).toBe(true);
});

test('motion is gated, so reduced motion means no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('.ac-group')
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
