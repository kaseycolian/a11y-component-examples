import { test, expect } from '@playwright/test';

const PAGE = 'components/tooltip/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// The interesting parts are the three halves of SC 1.4.13 -- dismissible,
// hoverable, persistent -- and the fact that the description is readable while
// the bubble is still hidden.

const host = (page, n) => page.locator('[data-ac-tooltip]').nth(n);

/* --- example 1 · the baseline --------------------------------------------- */

test('the bubble is a tooltip that describes its trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Advance the show' });
  const tip = page.locator('#ac-tip-advance');

  await expect(tip).toHaveAttribute('role', 'tooltip');
  await expect(trigger).toHaveAttribute('aria-describedby', 'ac-tip-advance');
  await expect(tip).toBeHidden();
});

test('the description is announced while the bubble is still hidden', async ({ page }) => {
  // The reason aria-describedby is never toggled: an element referenced
  // directly is folded into the description even when it is hidden, so a screen
  // reader user does not wait for the bubble to appear.
  const trigger = page.getByRole('button', { name: 'Advance the show' });

  await expect(page.locator('#ac-tip-advance')).toBeHidden();
  await expect(trigger).toHaveAccessibleDescription(
    'Confirms load-in, curfew and the guest list with the venue.',
  );
});

test('hover shows it, and leaving hides it', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Advance the show' });
  const tip = page.locator('#ac-tip-advance');

  await trigger.hover();
  await expect(tip).toBeVisible();

  // Somewhere with no trigger under it.
  await page.mouse.move(4, 4);
  await expect(tip).toBeHidden();
});

test('keyboard focus shows it — SC 1.4.13 is not satisfied by hover alone', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Advance the show' });
  const tip = page.locator('#ac-tip-advance');

  // Focused from the keyboard, so :focus-visible matches and the bubble opens.
  await trigger.focus();
  await expect(tip).toBeVisible();
});

test('a mouse click does not fire a tooltip at the person who clicked', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Advance the show' });
  const tip = page.locator('#ac-tip-advance');

  // Click leaves the button focused but not focus-visible. Move the pointer away
  // afterwards, or the hover would be doing the work instead of the focus.
  await trigger.click();
  await page.mouse.move(4, 4);
  await expect(tip).toBeHidden();
});

test('the tooltip is persistent — it does not time out', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Advance the show' });
  const tip = page.locator('#ac-tip-advance');

  await trigger.hover();
  await expect(tip).toBeVisible();
  await page.waitForTimeout(1500);
  // Native `title` would have gone by now.
  await expect(tip).toBeVisible();
});

test('Esc dismisses it with the pointer still on the trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Advance the show' });
  const tip = page.locator('#ac-tip-advance');

  await trigger.hover();
  await expect(tip).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();

  // And it stays dismissed: re-showing under an unmoved pointer would make Esc
  // useless.
  await page.waitForTimeout(300);
  await expect(tip).toBeHidden();
});

test('leaving re-arms Esc, so the tooltip is not dismissed forever', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Advance the show' });
  const tip = page.locator('#ac-tip-advance');

  await trigger.hover();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();

  await page.mouse.move(4, 4);
  await trigger.hover();
  await expect(tip).toBeVisible();
});

test('the pointer can travel from the trigger onto the bubble', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Advance the show' });
  const tip = page.locator('#ac-tip-advance');

  await trigger.hover();
  await expect(tip).toBeVisible();

  // The hoverable half of SC 1.4.13. This is what pointer-events: none breaks.
  await tip.hover();
  await page.waitForTimeout(400);
  await expect(tip).toBeVisible();

  const events = await tip.evaluate((el) => getComputedStyle(el).pointerEvents);
  expect(events).not.toBe('none');
});

test('the bubble is not a tab stop', async ({ page }) => {
  await expect(page.locator('#ac-tip-advance')).not.toHaveAttribute('tabindex', /.*/);
});

/* --- example 2 · the bubble as the name ----------------------------------- */

test('an icon-only trigger takes its name from the bubble', async ({ page }) => {
  const trigger = page.locator('[aria-labelledby="ac-tip-print"]');

  // aria-labelledby, not describedby: a description cannot supply a missing name.
  await expect(trigger).toHaveAccessibleName('Print the run sheet');
  await expect(trigger).not.toHaveAttribute('aria-label', /.*/);
  // The factory must not add a second relationship on top of the authored one.
  await expect(trigger).not.toHaveAttribute('aria-describedby', /.*/);
});

test('the glyph contributes nothing to the name', async ({ page }) => {
  const svg = page.locator('[aria-labelledby="ac-tip-print"] svg');
  await expect(svg).toHaveAttribute('aria-hidden', 'true');
  await expect(svg).toHaveAttribute('focusable', 'false');
});

/* --- example 4 · the toggletip -------------------------------------------- */

test('the toggletip opens on click and announces through a live region', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'What is a load-out?' });
  const live = page.locator('[data-ac-toggletip-live]');

  // Present and empty before the click, so the insertion is a change.
  await expect(live).toBeAttached();
  await expect(live).toHaveAttribute('role', 'status');
  expect((await live.innerHTML()).trim()).toBe('');

  await trigger.click();
  await expect(live.locator('.ac-tooltip')).toHaveText(/Striking the stage/);
});

test('the toggletip is not a disclosure', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'What is a load-out?' });

  // The content is a message, not a region the button controls -- and the button
  // is not *described by* what it reveals.
  await expect(trigger).not.toHaveAttribute('aria-expanded', /.*/);
  await expect(trigger).not.toHaveAttribute('aria-describedby', /.*/);

  await trigger.click();
  await expect(trigger).not.toHaveAttribute('aria-expanded', /.*/);
});

test('clicking the toggletip trigger again closes it, and focus never moves', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'What is a load-out?' });
  const bubble = page.locator('[data-ac-toggletip-live] .ac-tooltip');

  await trigger.click();
  await expect(bubble).toBeVisible();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(bubble).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('Esc and an outside click both close the toggletip', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'What is a load-out?' });
  const bubble = page.locator('[data-ac-toggletip-live] .ac-tooltip');

  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(bubble).toHaveCount(0);
  // Focus never moved, so there is nothing to restore.
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(bubble).toBeVisible();
  await page.locator('h1').click();
  await expect(bubble).toHaveCount(0);
});

/* --- example 5 · essential information stays visible ---------------------- */

test('the input keeps the requirement visible and the tooltip only adds to it', async ({
  page,
}) => {
  const input = page.locator('#ac-tip-set');

  // Two ids, hint first: the requirement is heard before the story.
  await expect(input).toHaveAttribute('aria-describedby', 'ac-tip-set-hint ac-tip-curfew');
  await expect(page.locator('#ac-tip-set-hint')).toBeVisible();
  await expect(input).toHaveAccessibleDescription(/99 is the most the room allows[\s\S]*curfew/);
});

test('the help trigger is named by aria-label, not by its sentence-long bubble', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Why 99 minutes' });

  await expect(trigger).toHaveAccessibleName('Why 99 minutes');
  await expect(trigger).toHaveAttribute('aria-describedby', 'ac-tip-curfew');
});

/* --- positioning ---------------------------------------------------------- */

test('the bubble escapes overflow clipping by being fixed', async ({ page }) => {
  const tip = page.locator('#ac-tip-advance');

  await page.getByRole('button', { name: 'Advance the show' }).hover();
  await expect(tip).toBeVisible();

  expect(await tip.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
});

test('the arrow still points at the trigger after the bubble is clamped', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const tip = page.locator('#ac-tip-advance');

  await page.getByRole('button', { name: 'Advance the show' }).hover();
  await expect(tip).toBeVisible();

  const { arrowX, width } = await tip.evaluate((el) => ({
    arrowX: parseFloat(getComputedStyle(el).getPropertyValue('--ac-tooltip-arrow-x')),
    width: el.getBoundingClientRect().width,
  }));
  expect(arrowX).toBeGreaterThanOrEqual(12);
  expect(arrowX).toBeLessThanOrEqual(width - 12);
});

test('a wide bubble does not widen the page at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole('button', { name: 'Why 99 minutes' }).hover();
  await expect(page.locator('#ac-tip-curfew')).toBeVisible();

  // SC 1.4.10: no horizontal scroll, from the tooltip or anything else.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

/* --- targets and the factory contract ------------------------------------- */

test('every trigger clears the 24px minimum target', async ({ page }) => {
  // SC 2.5.8. The icon triggers are the ones at risk -- a bare glyph would be a
  // 16px hit area.
  const triggers = page.locator('.ac-tooltip-btn, .ac-tooltip-icon');
  const count = await triggers.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i += 1) {
    const box = await triggers.nth(i).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
  }
});

test('the factory is idempotent and destroy() puts the DOM back', async ({ page }) => {
  const result = await host(page, 0).evaluate((el) => {
    const a = window.AC.createTooltip(el);
    const b = window.AC.createTooltip(el);
    a.show();
    const openWhileShown = a.isOpen();
    a.destroy();
    return {
      same: a === b,
      openWhileShown,
      // Authored in the markup, so destroy() must leave it alone.
      describedby: el.querySelector('button').getAttribute('aria-describedby'),
      hidden: el.querySelector('[role="tooltip"]').hidden,
    };
  });

  expect(result.same).toBe(true);
  expect(result.openWhileShown).toBe(true);
  expect(result.describedby).toBe('ac-tip-advance');
  expect(result.hidden).toBe(true);
});

test('a bubble with no id gets one, and destroy() removes the wiring it added', async ({ page }) => {
  const result = await page.evaluate(() => {
    const wrap = document.createElement('span');
    wrap.className = 'ac-tooltip-host';
    wrap.innerHTML =
      '<button type="button">Sound check</button>' +
      '<span class="ac-tooltip" role="tooltip" hidden>Doors at 19:30</span>';
    document.body.appendChild(wrap);

    const api = window.AC.createTooltip(wrap);
    const button = wrap.querySelector('button');
    const minted = wrap.querySelector('[role="tooltip"]').id;
    const wired = button.getAttribute('aria-describedby');
    api.destroy();
    const after = button.getAttribute('aria-describedby');
    wrap.remove();
    return { minted, wired, after };
  });

  expect(result.minted).toMatch(/^ac-tooltip-\d+$/);
  expect(result.wired).toBe(result.minted);
  expect(result.after).toBeNull();
});

/* --- reduced motion ------------------------------------------------------- */

test('reduced motion zeroes the fade, by either route', async ({ page }) => {
  const tip = page.locator('#ac-tip-advance');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.getByRole('button', { name: 'Advance the show' }).hover();
  await expect(tip).toBeVisible();
  expect(await tip.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await page.evaluate(() => document.documentElement.setAttribute('data-motion', 'off'));
  await page.getByRole('button', { name: 'Advance the show' }).hover();
  await expect(tip).toBeVisible();
  expect(await tip.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
});
