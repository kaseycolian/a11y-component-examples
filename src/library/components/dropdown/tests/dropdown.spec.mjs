import { test, expect } from '@playwright/test';

const PAGE = 'components/dropdown/';

/** The first demo: a labeled select with icons and secondary text. */
function env(page) {
  const wrap = page.locator('.ac-dropdown').filter({ has: page.locator('#ac-demo-env') });
  return {
    native: page.locator('#ac-demo-env'),
    toggle: wrap.getByRole('button', { expanded: false }).or(wrap.locator('.ac-dropdown__toggle')),
    panel: wrap.locator('.ac-dropdown__panel'),
    options: wrap.getByRole('option'),
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

test('enhances the native select while keeping it as the value store', async ({ page }) => {
  const { native, toggle } = env(page);

  await expect(native).toBeHidden();
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-haspopup', 'listbox');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(native).toHaveValue('prod');
});

test('the trigger is named by its label and its current value', async ({ page }) => {
  const { toggle } = env(page);
  // Native selects announce "<label>, <value>"; this must match.
  await expect(toggle).toHaveAccessibleName(/Deploy target.*Production/s);
});

test('opens on click and moves focus onto the selected option', async ({ page }) => {
  const { toggle, panel, options } = env(page);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();

  // Real DOM focus, not aria-activedescendant -- that is the whole point.
  await expect(options.filter({ hasText: 'Production' })).toBeFocused();
});

test('arrow keys move focus and wrap at both ends', async ({ page }) => {
  const { toggle, options } = env(page);

  await toggle.press('Enter');
  await expect(options.nth(0)).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toBeFocused();

  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(options.nth(2)).toBeFocused();

  await page.keyboard.press('End');
  await expect(options.nth(2)).toBeFocused();

  await page.keyboard.press('Home');
  await expect(options.nth(0)).toBeFocused();
});

test('choosing an option updates the native value and fires exactly one change', async ({ page }) => {
  const { native, toggle } = env(page);

  await page.evaluate(() => {
    window.__changes = 0;
    document.querySelector('#ac-demo-env').addEventListener('change', () => {
      window.__changes++;
    });
  });

  await toggle.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect(native).toHaveValue('staging');
  expect(await page.evaluate(() => window.__changes)).toBe(1);
  // Focus must come back to the trigger -- never left on a hidden element.
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('Escape closes without changing the value and restores focus', async ({ page }) => {
  const { native, toggle, panel } = env(page);

  await toggle.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');

  await expect(panel).toBeHidden();
  await expect(native).toHaveValue('prod');
  await expect(toggle).toBeFocused();
});

test('Space opens the panel, and chooses the focused option', async ({ page }) => {
  const { native, toggle, panel } = env(page);

  await toggle.press(' ');
  await expect(panel).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');

  await expect(panel).toBeHidden();
  await expect(native).not.toHaveValue('prod');
});

test('Tab closes the panel and carries on from the trigger', async ({ page }) => {
  const { native, toggle, panel } = env(page);

  await toggle.press('Enter');
  await expect(panel).toBeVisible();

  // Focus is on an option inside a panel that is about to be hidden, so the
  // component moves it back to the trigger first and lets the browser tab on
  // from there. Landing on <body> instead is the bug this asserts against.
  await page.keyboard.press('Tab');
  await expect(panel).toBeHidden();
  await expect(native).toHaveValue('prod');
  await expect(page.locator('body')).not.toBeFocused();
});

test('type-ahead jumps to a matching option', async ({ page }) => {
  const { toggle, options } = env(page);

  await toggle.press('Enter');
  await page.keyboard.press('l');
  await expect(options.filter({ hasText: 'Local' })).toBeFocused();
});

test('clicking outside closes the panel', async ({ page }) => {
  const { toggle, panel } = env(page);

  await toggle.click();
  await expect(panel).toBeVisible();

  await page.locator('h1').click();
  await expect(panel).toBeHidden();
});

test('disabled options are announced but not choosable', async ({ page }) => {
  const wrap = page.locator('.ac-dropdown').filter({ has: page.locator('#ac-demo-region') });
  // No includeHidden: that would also match the hidden native <select>'s own
  // <option> elements. This asserts against what assistive tech actually sees.
  const disabled = wrap.getByRole('option').filter({ hasText: 'South America' });

  await wrap.locator('.ac-dropdown__toggle').click();

  // Present in the list, so a screen reader user learns it exists...
  await expect(disabled).toHaveAttribute('aria-disabled', 'true');
  // ...but arrows skip straight past it.
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(disabled).not.toBeFocused();
});

test('a disabled select stays focusable and does not open', async ({ page }) => {
  const wrap = page.locator('.ac-dropdown').filter({ has: page.locator('#ac-demo-locked') });
  const toggle = wrap.locator('.ac-dropdown__toggle');

  // aria-disabled rather than the disabled attribute, so it is still reachable.
  await expect(toggle).toHaveAttribute('aria-disabled', 'true');
  await toggle.focus();
  await expect(toggle).toBeFocused();

  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('an empty select explains itself', async ({ page }) => {
  const wrap = page.locator('.ac-dropdown').filter({ has: page.locator('#ac-demo-empty') });

  await wrap.locator('.ac-dropdown__toggle').click();
  await expect(wrap.locator('.ac-dropdown__empty')).toHaveText('No saved filters yet');
});

test('icons and swatches are decoration; secondary text is content', async ({ page }) => {
  const { toggle, options } = env(page);
  await toggle.click();

  // The icon adds nothing a screen reader needs -- it is aria-hidden, so no
  // "graphic" or symbol name leaks into the option's name.
  const name = await options.nth(0).ariaSnapshot();
  expect(name).not.toMatch(/img|graphic/i);

  // The secondary line, though, is real information about which host this
  // deploys to, so it SHOULD be announced. Hiding it would lose content.
  await expect(options.nth(0)).toHaveAccessibleName('Production app.example.com');

  // The swatch demo carries no text beyond the label, so its name stays clean.
  const palette = page.locator('.ac-dropdown').filter({ has: page.locator('#ac-demo-theme') });
  await page.keyboard.press('Escape');
  await palette.locator('.ac-dropdown__toggle').click();
  await expect(palette.getByRole('option').nth(0)).toHaveAccessibleName('Rink Classic');
});

test('stays anchored to its trigger on a narrow viewport', async ({ page }) => {
  // Deliberately NOT a bottom sheet. That is the `drawer` component, which has a
  // different focus and dismissal model. A dropdown anchors at every width.
  await page.setViewportSize({ width: 375, height: 720 });
  await page.reload();

  const { toggle, panel } = env(page);
  await toggle.click();

  const panelBox = await panel.boundingBox();
  const toggleBox = await toggle.boundingBox();
  const viewport = page.viewportSize();

  // Same width as the trigger, and starting at the same left edge.
  expect(panelBox.width).toBeCloseTo(toggleBox.width, 0);
  expect(panelBox.x).toBeCloseTo(toggleBox.x, 0);
  // Directly below it, not pinned to the bottom of the screen.
  expect(panelBox.y).toBeGreaterThanOrEqual(toggleBox.y + toggleBox.height);
  expect(panelBox.y + panelBox.height).toBeLessThan(viewport.height - 1);
});

test('flips above the trigger when there is no room below', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 400 });
  await page.reload();

  const { toggle, panel } = env(page);
  // Push the trigger to the bottom of the viewport. behavior: 'instant' opts out
  // of the site's `html { scroll-behavior: smooth }`, which otherwise animates
  // this over ~300px: the click below then lands mid-scroll, the trigger still
  // has room under it, and the panel correctly does not flip -- a race that
  // reads exactly like a broken component.
  await toggle.evaluate((el) => el.scrollIntoView({ block: 'end', behavior: 'instant' }));
  await toggle.click();

  const panelBox = await panel.boundingBox();
  const toggleBox = await toggle.boundingBox();

  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(toggleBox.y + 1);
  await expect(page.locator('.ac-dropdown--up')).toHaveCount(1);
});

test('the panel fits inside a narrow viewport rather than hanging off an edge', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.reload();

  const { toggle, panel } = env(page);
  await toggle.click();

  const box = await panel.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
});

test('the panel is not clipped by an overflow:hidden ancestor', async ({ page }) => {
  // The failure mode this component exists to avoid.
  await page.evaluate(() => {
    const wrap = document.querySelector('#ac-demo-env').closest('.ac-dropdown').parentElement;
    wrap.style.overflow = 'hidden';
    wrap.style.height = '80px';
  });

  const { toggle, panel } = env(page);
  await toggle.click();

  const box = await panel.boundingBox();
  expect(box.height).toBeGreaterThan(80);
});
