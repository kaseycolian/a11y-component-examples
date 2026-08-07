import { test, expect } from '@playwright/test';

const PAGE = 'components/drawer/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// Assert the ARIA contract and the keyboard map from docs/component-specs.md --
// not merely that the thing rendered. This component is almost entirely focus
// management, so that is what most of these cover.

/**
 * Wait out the slide before measuring. The panel animates in over --dur-slow, so
 * a boundingBox read straight after the click is a frame of the transition, not
 * the resting geometry.
 */
async function settled(page, selector) {
  const panel = page.locator(selector);
  await expect(panel).toBeVisible();
  await expect
    .poll(() => panel.evaluate((el) => getComputedStyle(el).transform))
    .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  return panel;
}

/** The modal bottom drawer (example 1). */
function filters(page) {
  return {
    trigger: page.getByRole('button', { name: 'Filters', exact: true }),
    drawer: page.locator('#ac-demo-filters'),
    close: page.getByRole('button', { name: 'Close filters' }),
  };
}

test('a modal drawer declares itself a modal dialog and names itself', async ({ page }) => {
  const { trigger, drawer } = filters(page);

  await expect(drawer).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveAttribute('aria-controls', 'ac-demo-filters');

  await trigger.click();

  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveAttribute('role', 'dialog');
  await expect(drawer).toHaveAttribute('aria-modal', 'true');
  // Named by its visible title, not an invented aria-label that can drift from it.
  await expect(drawer).toHaveAccessibleName('Filters');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
});

test('opening moves focus inside the drawer', async ({ page }) => {
  const { trigger, drawer } = filters(page);

  await trigger.click();
  // Anything else and the user is told a panel opened, then left outside it.
  const active = await page.evaluate(() => document.activeElement.closest('.ac-drawer')?.id);
  expect(active).toBe('ac-demo-filters');
  await expect(drawer).toContainText('Focus is trapped here');
});

test('focus is trapped while a modal drawer is open', async ({ page }) => {
  const { trigger } = filters(page);
  await trigger.click();

  // Tab far more times than there are focusable elements inside.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(
      () => !!document.activeElement.closest('#ac-demo-filters'),
    );
    expect(inside, `escaped on Tab ${i + 1}`).toBe(true);
  }

  // And backwards, the direction implementations usually forget.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Shift+Tab');
    const inside = await page.evaluate(
      () => !!document.activeElement.closest('#ac-demo-filters'),
    );
    expect(inside, `escaped on Shift+Tab ${i + 1}`).toBe(true);
  }
});

test('Escape closes and focus returns to the trigger', async ({ page }) => {
  const { trigger, drawer } = filters(page);

  await trigger.click();
  await page.keyboard.press('Escape');

  await expect(drawer).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  // Never dumped at <body>: that loses the user's place in the page entirely.
  await expect(trigger).toBeFocused();
});

test('the close button closes and returns focus', async ({ page }) => {
  const { trigger, drawer, close } = filters(page);

  await trigger.click();
  await close.click();

  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('the close button has a real accessible name and a 44px target', async ({ page }) => {
  const { trigger, close } = filters(page);
  await trigger.click();

  // A bare X button announces as "button" and nothing more.
  await expect(close).toHaveAccessibleName('Close filters');
  const box = await close.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test('clicking the backdrop closes it', async ({ page }) => {
  const { trigger, drawer } = filters(page);
  await trigger.click();

  // Top left, well clear of a bottom-edge drawer.
  await page.mouse.click(8, 8);
  await expect(drawer).toBeHidden();
});

test('the backdrop is a click target, not content', async ({ page }) => {
  const { trigger } = filters(page);
  await trigger.click();

  await expect(page.locator('.ac-drawer__backdrop:not([hidden])')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  // Built by the script, not authored, so the non-modal drawer has none: three
  // modal drawers on this page, three backdrops.
  expect(await page.locator('.ac-drawer__backdrop').count()).toBe(3);
});

test('a modal drawer locks page scroll without shifting the layout', async ({ page }) => {
  const { trigger, close } = filters(page);

  const widthBefore = await page.evaluate(() => document.documentElement.clientWidth);

  await trigger.click();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
    'hidden',
  );
  // scrollbar-gutter reserves the space the scrollbar had, so nothing jumps sideways.
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(widthBefore);

  await close.click();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
    'hidden',
  );
});

test('a non-modal drawer does not claim to be modal, and does not trap', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Help', exact: true });
  const drawer = page.locator('#ac-demo-help');

  await trigger.click();
  await expect(drawer).toBeVisible();

  // role="region", and crucially NO aria-modal: claiming it while the page stays
  // operable makes a screen reader stop announcing everything outside the panel.
  await expect(drawer).toHaveAttribute('role', 'region');
  expect(await drawer.getAttribute('aria-modal')).toBeNull();

  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
    'hidden',
  );

  // Tab out of it and keep going: nothing is trapped.
  let escaped = false;
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    if (!(await page.evaluate(() => !!document.activeElement.closest('#ac-demo-help')))) {
      escaped = true;
      break;
    }
  }
  expect(escaped).toBe(true);
});

test('a non-modal drawer leaves Escape alone when focus is elsewhere', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Help', exact: true });
  const drawer = page.locator('#ac-demo-help');

  await trigger.click();
  await expect(drawer).toBeVisible();

  // Focus something well outside it, then press Escape. The drawer must not
  // swallow a key the user aimed at something else.
  await page.locator('h1').click();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeVisible();
});

test('the edge is a data attribute, and the geometry follows it', async ({ page }) => {
  // Bottom: full width, pinned to the bottom edge.
  await page.getByRole('button', { name: 'Filters', exact: true }).click();

  // The backdrop is fixed with inset:0, so its rect is exactly what "the full
  // viewport" means here -- scrollbar and scroll lock already accounted for.
  const box = await page.locator('.ac-drawer__backdrop:not([hidden])').boundingBox();
  const bottom = await (await settled(page, '#ac-demo-filters')).boundingBox();
  expect(bottom.width).toBeCloseTo(box.width, 0);
  expect(bottom.y + bottom.height).toBeCloseTo(box.y + box.height, 0);
  await page.keyboard.press('Escape');

  // Right: full height, pinned to the right edge, narrower than the page.
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const right = await (await settled(page, '#ac-demo-nav')).boundingBox();
  expect(right.x + right.width).toBeCloseTo(box.x + box.width, 0);
  expect(right.height).toBeCloseTo(box.height, 0);

  expect(right.width).toBeLessThan(box.width);
});

test('content inside keeps its own semantics', async ({ page }) => {
  await page.getByRole('button', { name: 'Menu', exact: true }).click();

  // The drawer is a container; it does not flatten what it holds.
  await expect(page.locator('#ac-demo-nav').getByRole('navigation')).toHaveAccessibleName(
    'Sections',
  );
  await expect(page.locator('#ac-demo-nav').getByRole('list')).toBeVisible();
});

test('the body scrolls while the header stays put', async ({ page }) => {
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  await settled(page, '#ac-demo-activity');

  const body = page.locator('#ac-demo-activity .ac-drawer__body');
  const head = page.locator('#ac-demo-activity .ac-drawer__head');

  const headBefore = await head.boundingBox();
  const scrolled = await body.evaluate((el) => {
    el.scrollTop = 400;
    return el.scrollTop;
  });

  expect(scrolled).toBeGreaterThan(0);
  // The close button has not moved, so it stays reachable however far down you are.
  expect((await head.boundingBox()).y).toBeCloseTo(headBefore.y, 0);
});

test('the trigger toggles rather than only opening', async ({ page }) => {
  // The non-modal one, because a modal drawer's backdrop covers its own trigger
  // by design -- there the second click is Escape, the close button, or the
  // backdrop, all covered above.
  const trigger = page.getByRole('button', { name: 'Help', exact: true });
  const drawer = page.locator('#ac-demo-help');

  await trigger.click();
  await expect(drawer).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await trigger.click();
  await expect(drawer).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('the slide is motion-gated', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const drawer = page.locator('#ac-demo-filters');

  // With --motion at 0 the off-screen transform collapses to none, so the panel
  // appears rather than slides. That is correct, not degraded.
  const closedTransform = await drawer.evaluate((el) => getComputedStyle(el).transform);
  expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(closedTransform);

  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const duration = await drawer.evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(duration.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});

test('createDrawer is idempotent and destroy undoes its wiring', async ({ page }) => {
  const result = await page.evaluate(() => {
    const root = document.querySelector('#ac-demo-filters');
    const trigger = document.querySelector('[data-ac-drawer-open="ac-demo-filters"]');

    const same = window.AC.createDrawer(root) === root._acDrawer;
    root._acDrawer.open();
    const openedModal = root._acDrawer.isModal;
    root._acDrawer.destroy();

    return {
      same,
      openedModal,
      expandedAfter: trigger.getAttribute('aria-expanded'),
      backdrops: document.querySelectorAll('.ac-drawer__backdrop').length,
      locked: document.documentElement.hasAttribute('data-ac-drawer-lock'),
    };
  });

  expect(result.same).toBe(true);
  expect(result.openedModal).toBe(true);
  // destroy() closes, unlocks the page, drops the backdrop it created, and strips
  // the aria-expanded it added.
  expect(result.expandedAfter).toBeNull();
  expect(result.backdrops).toBe(2);
  expect(result.locked).toBe(false);
});

test('nothing overflows sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.reload();

  await page.getByRole('button', { name: 'Menu', exact: true }).click();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
