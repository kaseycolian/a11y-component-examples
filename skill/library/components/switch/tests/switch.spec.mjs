import { test, expect } from '@playwright/test';

const PAGE = 'components/switch/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// The interesting parts are that state never rests on color alone, that the
// confirmation stays out of the accessible name, and that aria-disabled is
// actually enforced. That is where most of these go.

/* --- example 1 · baseline switch --------------------------------------------- */

test('a set of switches is a fieldset named by its legend', async ({ page }) => {
  await expect(page.getByRole('group', { name: 'Workspace defaults' })).toBeVisible();
});

test('the switch is a real checkbox named by the thing it switches', async ({ page }) => {
  const archive = page.getByRole('checkbox', { name: 'Auto-archive orders' });

  await expect(archive).toBeChecked();
  // Not "Turn on auto-archiving": state is what checked/unchecked is for, and a
  // label that restates it announces the state twice.
  await expect(archive).toHaveAccessibleName('Auto-archive orders');
});

test('the track and thumb are decoration, so they add nothing to the name', async ({ page }) => {
  await expect(page.locator('.ac-switch__track').first()).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('checkbox', { name: 'Require refund approval' })).toHaveAccessibleName(
    'Require refund approval',
  );
});

test('Space toggles, and toggles back', async ({ page }) => {
  const approval = page.locator('#ac-sw-approval');

  await approval.focus();
  await page.keyboard.press('Space');
  await expect(approval).toBeChecked();
  await page.keyboard.press('Space');
  await expect(approval).not.toBeChecked();
});

test('Enter does nothing, which is the native behavior', async ({ page }) => {
  const approval = page.locator('#ac-sw-approval');

  await approval.focus();
  await page.keyboard.press('Enter');
  await expect(approval).not.toBeChecked();
});

test('every switch is its own tab stop', async ({ page }) => {
  await page.locator('#ac-sw-archive').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#ac-sw-approval')).toBeFocused();
});

test('the label text is part of the target, and the row clears 44px', async ({ page }) => {
  const row = page.locator('label[for="ac-sw-approval"]');
  const box = await row.boundingBox();

  // A 1.35rem pill is a 22px-tall target and fails SC 2.5.8 on its own.
  expect(box.height).toBeGreaterThanOrEqual(44);

  await row.click();
  await expect(page.locator('#ac-sw-approval')).toBeChecked();
});

test('the real input stays in the accessibility tree under the paint', async ({ page }) => {
  const input = page.locator('#ac-sw-approval');

  const styles = await input.evaluate((el) => {
    const s = getComputedStyle(el);
    return { display: s.display, visibility: s.visibility, opacity: s.opacity };
  });

  // opacity: 0 only. display: none or visibility: hidden removes it from the
  // tree and takes the keyboard with it.
  expect(styles.opacity).toBe('0');
  expect(styles.display).not.toBe('none');
  expect(styles.visibility).toBe('visible');
});

test('the focus ring appears on the track, since the input is transparent', async ({ page }) => {
  await page.locator('#ac-sw-approval').focus();

  const outline = await page
    .locator('label[for="ac-sw-approval"] .ac-switch__track')
    .evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth));
  expect(outline).toBeGreaterThanOrEqual(3);
});

test('state is signaled by the thumb position as well as the fill', async ({ page }) => {
  const thumb = page.locator('label[for="ac-sw-approval"] .ac-switch__thumb');
  const read = () =>
    thumb.evaluate((el) => {
      const s = getComputedStyle(el);
      return { x: new DOMMatrixReadOnly(s.transform).m41, fill: s.backgroundColor };
    });

  const off = await read();
  await page.locator('label[for="ac-sw-approval"]').click();
  await expect(page.locator('#ac-sw-approval')).toBeChecked();

  // Poll: the thumb slides, so a read taken immediately would catch it mid-way.
  await expect.poll(async () => (await read()).x).toBeGreaterThan(off.x + 8);

  const on = await read();
  // Color alone would fail SC 1.4.1; position is the cue that survives when the
  // two fills are indistinguishable.
  expect(on.fill).not.toBe(off.fill);
});

/* --- example 2 · applied immediately -------------------------------------- */

test('the confirmation is a polite status that exists before it has anything to say', async ({
  page,
}) => {
  const status = page.locator('[data-ac-switch-status]');

  await expect(status).toHaveAttribute('role', 'status');
  // Clipped off screen rather than display: none, which would take it out of
  // the accessibility tree and stop it announcing at all.
  const styles = await status.evaluate((el) => {
    const s = getComputedStyle(el);
    return { display: s.display, clip: s.clipPath };
  });
  expect(styles.display).not.toBe('none');
  expect(styles.clip).not.toBe('none');
});

test('flipping it announces the state without renaming the control', async ({ page }) => {
  const notify = page.locator('#ac-sw-notify');
  const status = page.locator('[data-ac-switch-status]');

  await expect(status).toHaveText('Order alerts off.');
  await expect(notify).toHaveAccessibleName('Order alerts');

  await notify.focus();
  await page.keyboard.press('Space');

  await expect(status).toHaveText(/Order alerts on/);
  // The name is unchanged: renaming the control someone just operated means the
  // next thing they hear is a different control.
  await expect(notify).toHaveAccessibleName('Order alerts');
});

test('the visible line mirrors the status and is hidden from screen readers', async ({ page }) => {
  const note = page.locator('[data-ac-switch-note]');

  await expect(note).toHaveAttribute('aria-hidden', 'true');
  await expect(note).toHaveText('Order alerts off.');

  await page.locator('label[for="ac-sw-notify"]').click();
  await expect(note).toHaveText(/Order alerts on/);
  // Same words in both places, announced once.
  await expect(page.locator('[data-ac-switch-status]')).toHaveText(await note.textContent());
});

test('toggling moves no focus and navigates nowhere', async ({ page }) => {
  const url = page.url();
  const notify = page.locator('#ac-sw-notify');

  await notify.focus();
  await page.keyboard.press('Space');

  // SC 3.2.2: applying the setting is expected, rearranging the page is not.
  await expect(notify).toBeFocused();
  expect(page.url()).toBe(url);
});

/* --- example 3 · role="switch" -------------------------------------------- */

test('the role variant is exposed as a switch, still driven by checked', async ({ page }) => {
  const statusPage = page.getByRole('switch', { name: 'Public status page' });

  await expect(statusPage).toBeVisible();
  await expect(statusPage).toBeChecked();

  await statusPage.focus();
  await page.keyboard.press('Space');
  // The browser keeps every checkbox behavior; only the announced role changes.
  await expect(statusPage).not.toBeChecked();
});

test('no hand-written aria-checked competes with the native state', async ({ page }) => {
  expect(await page.locator('#ac-sw-role').getAttribute('aria-checked')).toBeNull();
});

/* --- example 4 · unavailable, two ways ------------------------------------ */

test('an aria-disabled switch is still focusable and still explains itself', async ({ page }) => {
  const locked = page.locator('#ac-sw-locked');

  await expect(locked).toHaveAttribute('aria-disabled', 'true');
  // Not `disabled`: a control the keyboard cannot reach cannot tell anyone why.
  // (Checked on the element rather than with toBeEnabled(), which treats
  // aria-disabled as unactionable -- correct for a test runner, and exactly the
  // behavior this example is asserting.)
  expect(await locked.evaluate((el) => el.disabled)).toBe(false);
  await expect(locked).toHaveAccessibleDescription(/plan requires this/);

  await locked.focus();
  await expect(locked).toBeFocused();
});

test('aria-disabled is enforced, by pointer and by Space', async ({ page }) => {
  const locked = page.locator('#ac-sw-locked');

  await expect(locked).toBeChecked();

  // force, because Playwright will not click through aria-disabled on its own --
  // it is still a real trusted click, which is what the guard has to survive.
  await page.locator('label[for="ac-sw-locked"]').click({ force: true });
  await expect(locked).toBeChecked();

  // Space fires a click on a checkbox, so the one click handler covers the
  // keyboard as well.
  await locked.focus();
  await page.keyboard.press('Space');
  await expect(locked).toBeChecked();
});

test('a truly disabled switch is skipped by Tab', async ({ page }) => {
  const dead = page.locator('#ac-sw-dead');

  await expect(dead).toBeDisabled();

  await page.locator('#ac-sw-locked').focus();
  await page.keyboard.press('Tab');
  await expect(dead).not.toBeFocused();
});

test('unavailable is not signaled by dimming alone', async ({ page }) => {
  const style = await page
    .locator('#ac-sw-dead + .ac-switch__track')
    .evaluate((el) => getComputedStyle(el).borderTopStyle);
  // Low opacity reads as "ignore this" rather than "you cannot change this", and
  // it is a contrast problem besides.
  expect(style).toBe('dashed');
});

/* --- shared --------------------------------------------------------------- */

test('createSwitch is idempotent, set() announces, and destroy undoes its wiring', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const root = document.querySelector('.ac-switch-field[data-ac-switch]');
    const status = root.querySelector('[data-ac-switch-status]');

    const same = window.AC.createSwitch(root) === root._acSwitch;

    // Assigning .checked fires no change event, which is why set() exists.
    root._acSwitch.set(true);
    const afterSet = { state: root._acSwitch.state(), said: status.textContent };

    root._acSwitch.destroy();
    return { same, afterSet, emptied: status.textContent, gone: !root._acSwitch };
  });

  expect(result.same).toBe(true);
  expect(result.afterSet.state).toBe(true);
  expect(result.afterSet.said).toMatch(/Order alerts on/);
  expect(result.emptied).toBe('');
  expect(result.gone).toBe(true);
});

test('motion is gated, so reduced motion means no slide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('.ac-switch__thumb')
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
