import { test, expect } from '@playwright/test';

const PAGE = 'components/dropdown/';

/**
 * Everything is authored markup now, so a demo is reachable by the ids in
 * component.html rather than by filtering a runtime-generated wrapper.
 */
function dd(page, name) {
  const root = page.locator(`.ac-dropdown:has(#ac-dd-${name}-toggle)`);
  return {
    root,
    toggle: page.locator(`#ac-dd-${name}-toggle`),
    panel: page.locator(`#ac-dd-${name}-panel`),
    // No includeHidden, and none is needed: a closed panel has the `hidden`
    // attribute, so this counts exactly what assistive tech can reach.
    options: root.getByRole('option'),
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

test('the contract is in the markup, and the script only wires it', async ({ page }) => {
  const { root, toggle, panel } = dd(page, 'env');

  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-haspopup', 'listbox');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  // aria-controls resolves to a real element, which is the half of this pattern
  // that silently does nothing when it does not.
  await expect(toggle).toHaveAttribute('aria-controls', 'ac-dd-env-panel');
  await expect(panel).toHaveAttribute('role', 'listbox');
  await expect(panel).toBeHidden();
  await expect(root).toHaveAttribute('data-value', 'prod');
});

test('the trigger is named by its label and its current value', async ({ page }) => {
  const { toggle } = dd(page, 'env');
  // Native selects announce "<label>, <value>"; this must match.
  await expect(toggle).toHaveAccessibleName(/Deploy target.*Production/s);
});

test('clicking the label reaches the trigger', async ({ page }) => {
  const { toggle } = dd(page, 'env');

  // <button> is a labelable element, so `for` forwards the click. The old
  // arrangement pointed the label at a hidden <select> and lost this.
  await page.locator('label[for="ac-dd-env-toggle"]').click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('opens on click and moves focus onto the selected option', async ({ page }) => {
  const { toggle, panel, options } = dd(page, 'env');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();

  // Real DOM focus, not aria-activedescendant -- that is the whole point.
  await expect(options.filter({ hasText: 'Production' })).toBeFocused();
});

test('arrow keys move focus and wrap at both ends', async ({ page }) => {
  const { toggle, options } = dd(page, 'env');

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

test('choosing an option moves the value and fires exactly one event', async ({ page }) => {
  const { root, toggle } = dd(page, 'env');

  // Bound on document, because the point of the event is that it bubbles.
  await page.evaluate(() => {
    window.__changes = [];
    document.addEventListener('ac:dropdown:change', (event) => {
      window.__changes.push(event.detail.value);
    });
  });

  await toggle.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect(root).toHaveAttribute('data-value', 'staging');
  expect(await page.evaluate(() => window.__changes)).toEqual(['staging']);
  await expect(toggle).toHaveAccessibleName(/Deploy target.*Staging/s);
  // Focus must come back to the trigger -- never left on a hidden element.
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('aria-selected moves with the choice and stays on exactly one option', async ({ page }) => {
  const { toggle, options } = dd(page, 'env');

  await toggle.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await toggle.press('Enter');

  // The same attribute the CSS draws the row with, so a row cannot look chosen
  // without saying it is.
  await expect(options.nth(0)).toHaveAttribute('aria-selected', 'false');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(options.nth(2)).toHaveAttribute('aria-selected', 'false');
});

test('Escape closes without changing the value and restores focus', async ({ page }) => {
  const { root, toggle, panel } = dd(page, 'env');

  await toggle.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');

  await expect(panel).toBeHidden();
  await expect(root).toHaveAttribute('data-value', 'prod');
  await expect(toggle).toBeFocused();
});

test('Space opens the panel, and chooses the focused option', async ({ page }) => {
  const { root, toggle, panel } = dd(page, 'env');

  await toggle.press(' ');
  await expect(panel).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');

  await expect(panel).toBeHidden();
  await expect(root).toHaveAttribute('data-value', 'staging');
});

test('Tab closes the panel and carries on from the trigger', async ({ page }) => {
  const { root, toggle, panel } = dd(page, 'env');

  await toggle.press('Enter');
  await expect(panel).toBeVisible();

  // Focus is on an option inside a panel that is about to be hidden, so the
  // component moves it back to the trigger first and lets the browser tab on
  // from there. Landing on <body> instead is the bug this asserts against.
  await page.keyboard.press('Tab');
  await expect(panel).toBeHidden();
  await expect(root).toHaveAttribute('data-value', 'prod');
  await expect(page.locator('body')).not.toBeFocused();
});

test('Any letter jumps to the first option that starts with it', async ({ page }) => {
  const { toggle, options } = dd(page, 'env');

  await toggle.press('Enter');
  await page.keyboard.press('l');
  await expect(options.filter({ hasText: 'Local' })).toBeFocused();

  // Keystrokes inside the window accumulate -- that is what makes "st" land on
  // Staging rather than the first "s" and then the first "t" -- so the buffer
  // has to time out, or this second letter would extend "l" into "ls" and match
  // nothing. A real wait, because the window is the thing being asserted.
  await page.waitForTimeout(900);
  await page.keyboard.press('s');
  await expect(options.filter({ hasText: 'Staging' })).toBeFocused();
});

test('clicking outside closes the panel', async ({ page }) => {
  const { toggle, panel } = dd(page, 'env');

  await toggle.click();
  await expect(panel).toBeVisible();

  await page.locator('h1').click();
  await expect(panel).toBeHidden();
});

test('groups are named once, not twice', async ({ page }) => {
  const { root, toggle } = dd(page, 'region');
  await toggle.click();

  const groups = root.getByRole('group');
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(0)).toHaveAccessibleName('Americas');

  // The visible heading is aria-hidden, or the name is read twice: once as the
  // group, once as text inside it.
  await expect(root.locator('.ac-dropdown__group-label').first()).toHaveAttribute(
    'aria-hidden',
    'true',
  );
});

test('disabled options are announced but not choosable', async ({ page }) => {
  const { root, toggle } = dd(page, 'region');
  const disabled = root.getByRole('option').filter({ hasText: 'South America' });

  await toggle.click();

  // Present in the list, so a screen reader user learns it exists...
  await expect(disabled).toHaveAttribute('aria-disabled', 'true');
  // ...with no tabindex, which is what makes the arrows skip it.
  expect(await disabled.getAttribute('tabindex')).toBeNull();

  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(disabled).not.toBeFocused();
});

test('a disabled dropdown stays focusable and does not open', async ({ page }) => {
  const { toggle } = dd(page, 'locked');

  // aria-disabled rather than the disabled attribute, so it is still reachable.
  await expect(toggle).toHaveAttribute('aria-disabled', 'true');
  await toggle.focus();
  await expect(toggle).toBeFocused();

  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('an empty listbox explains itself and still takes focus', async ({ page }) => {
  const { toggle, panel } = dd(page, 'empty');

  await toggle.click();
  await expect(panel).toBeVisible();
  // Focus has to land somewhere inside, or the message is never read out.
  await expect(panel).toBeFocused();
  await expect(panel.locator('.ac-dropdown__empty')).toHaveText('Save a filter and it shows up here.');
});

test('icons and swatches are decoration; secondary text is content', async ({ page }) => {
  const { toggle, options } = dd(page, 'env');
  await toggle.click();

  // The icon adds nothing a screen reader needs -- it is aria-hidden, so no
  // "graphic" or symbol name leaks into the option's name.
  const name = await options.nth(0).ariaSnapshot();
  expect(name).not.toMatch(/img|graphic/i);

  // The secondary line, though, is real information about which host this
  // deploys to, so it SHOULD be announced. Hiding it would lose content.
  await expect(options.nth(0)).toHaveAccessibleName('Production app.example.com');

  // The swatch demo carries no text beyond the label, so its name stays clean --
  // and neither does the tick, which is a real character but aria-hidden. A
  // palette named only by its colors would be unusable here, which is the point.
  await page.keyboard.press('Escape');
  const palette = dd(page, 'palette');
  await palette.toggle.click();
  await expect(palette.options.nth(0)).toHaveAccessibleName('Standard');
});

test('the form example submits the chosen value', async ({ page }) => {
  const { toggle, options } = dd(page, 'ship');
  const readout = page.locator('[data-ac-dd-out="form"]');

  await expect(readout).toHaveText('speed=next-day');

  await toggle.click();
  await options.filter({ hasText: 'Ground' }).click();

  // The hidden input is the whole of form participation: FormData reads it like
  // any other field, with nothing else to keep in sync.
  await expect(readout).toHaveText('speed=ground');
  await expect(page.locator('input[data-ac-dropdown-input]')).toHaveValue('ground');
});

test('refresh() picks up an option added while the panel is open', async ({ page }) => {
  const { toggle, options } = dd(page, 'env');
  await toggle.click();
  await expect(options).toHaveCount(3);

  await page.evaluate(() => {
    const root = document.querySelector('#ac-dd-env-toggle').closest('.ac-dropdown');
    const row = document.createElement('div');
    row.className = 'ac-dropdown__option';
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', 'false');
    row.setAttribute('tabindex', '-1');
    row.dataset.value = 'edge';
    row.innerHTML = '<span class="ac-dropdown__primary">Edge</span>';
    root.querySelector('.ac-dropdown__list').appendChild(row);
    root._acDropdown.refresh();
  });

  await page.keyboard.press('End');
  await expect(options.filter({ hasText: 'Edge' })).toBeFocused();
});

test('destroy() unbinds and leaves the markup as it found it', async ({ page }) => {
  const { toggle, panel } = dd(page, 'env');

  await page.evaluate(() => {
    document.querySelector('#ac-dd-env-toggle').closest('.ac-dropdown')._acDropdown.destroy();
  });

  await toggle.click();
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  // Nothing to unwrap, because nothing was wrapped. The options are still there,
  // just in a panel nothing opens any more.
  await expect(page.locator('#ac-dd-env-panel [role="option"]')).toHaveCount(3);
  await expect(toggle).toHaveAttribute('aria-controls', 'ac-dd-env-panel');
});

test('stays anchored to its trigger on a narrow viewport', async ({ page }) => {
  // Deliberately NOT a bottom sheet. That is the `drawer` component, which has a
  // different focus and dismissal model. A dropdown anchors at every width.
  await page.setViewportSize({ width: 375, height: 720 });
  await page.reload();

  const { toggle, panel } = dd(page, 'env');
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

  const { root, toggle, panel } = dd(page, 'env');
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
  await expect(root).toHaveClass(/ac-dropdown--up/);
});

test('the panel fits inside a narrow viewport rather than hanging off an edge', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.reload();

  const { toggle, panel } = dd(page, 'env');
  await toggle.click();

  const box = await panel.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
});

test('the panel is not clipped by an overflow:hidden ancestor', async ({ page }) => {
  // The failure mode this component exists to avoid.
  await page.evaluate(() => {
    const field = document.querySelector('#ac-dd-env-toggle').closest('.ac-field');
    field.style.overflow = 'hidden';
    field.style.height = '80px';
  });

  const { toggle, panel } = dd(page, 'env');
  await toggle.click();

  const box = await panel.boundingBox();
  expect(box.height).toBeGreaterThan(80);
});
