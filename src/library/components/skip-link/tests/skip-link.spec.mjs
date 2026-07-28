import { test, expect } from '@playwright/test';

const PAGE = 'components/skip-link/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// The only thing this component does is be reachable and actually move focus,
// so those are the assertions. Everything else here exists to prove the four
// ways it is usually broken are not present.

// By href, not by name: the site shell has its own skip link reading "Skip to
// main content", and it is the first one in the document.
const link1 = (page) => page.locator('a.ac-skip-link[href="#sl-main-1"]');

/* --- example 1 · the baseline --------------------------------------------- */

test('it is a plain link to a fragment, with no ARIA at all', async ({ page }) => {
  const link = link1(page);

  await expect(link).toHaveAttribute('href', '#sl-main-1');
  await expect(link).not.toHaveAttribute('role', /.*/);
  await expect(link).not.toHaveAttribute('aria-label', /.*/);
  // The name comes from the text, and it names the destination.
  await expect(link).toHaveAccessibleName('Skip to main content');
});

test('it is clipped rather than hidden, so it stays in the tab order', async ({ page }) => {
  const link = link1(page);

  const style = await link.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      display: s.display,
      visibility: s.visibility,
      width: parseFloat(s.width),
      height: parseFloat(s.height),
      overflow: s.overflow,
      nowrap: s.whiteSpace,
    };
  });

  // The three that would take it out of the tab order.
  expect(style.display).not.toBe('none');
  expect(style.visibility).toBe('visible');
  // 1px, not 0 -- some browsers treat a zero-size box as not rendered.
  expect(style.width).toBeGreaterThan(0);
  expect(style.width).toBeLessThanOrEqual(2);
  expect(style.height).toBeLessThanOrEqual(2);
  expect(style.overflow).toBe('hidden');
  // Without it the text wraps inside the 1px box and is read a letter at a time.
  expect(style.nowrap).toBe('nowrap');
});

test('focus reveals it as a real, clickable target', async ({ page }) => {
  const link = link1(page);

  await link.focus();
  await expect(link).toBeFocused();

  const box = await link.boundingBox();
  // SC 2.5.8: once it is there, it is a target you can hit.
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(44);

  // Revealed by :focus, not :focus-visible -- a programmatic focus has to show
  // it too, or the failure is silent.
  expect(await link.evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');
});

test('following it really moves focus, which is what tabindex="-1" buys', async ({ page }) => {
  const target = page.locator('#sl-main-1');

  await expect(target).toHaveAttribute('tabindex', '-1');

  await link1(page).focus();
  await page.keyboard.press('Enter');

  // Not "the page scrolled" -- focus is on the target itself, so the next Tab
  // continues from here instead of from the top of the document.
  await expect(target).toBeFocused();
});

test('the target keeps a focus ring, because it is the only confirmation', async ({ page }) => {
  const target = page.locator('#sl-main-1');

  await link1(page).focus();
  await page.keyboard.press('Enter');

  const outline = await target.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThanOrEqual(2);
});

test('the target clears a sticky header when jumped to', async ({ page }) => {
  // SC 2.4.11. Without it the heading you landed on is underneath the chrome.
  const margin = await page
    .locator('#sl-main-1')
    .evaluate((el) => parseFloat(getComputedStyle(el).scrollMarginTop));
  expect(margin).toBeGreaterThan(0);
});

test('the link outranks the sticky header it has to appear over', async ({ page }) => {
  const z = await link1(page).evaluate((el) => parseInt(getComputedStyle(el).zIndex, 10));
  // This site's header is 900.
  expect(z).toBeGreaterThan(900);
});

/* --- example 2 · more than one destination -------------------------------- */

test('the group reveals together, and only the focused link takes the ring', async ({ page }) => {
  const list = page.locator('.ac-skip-list');
  const toMain = list.getByRole('link', { name: 'Skip to main content' });
  const toSearch = list.getByRole('link', { name: 'Skip to search' });

  expect(await list.evaluate((el) => getComputedStyle(el).clipPath)).not.toBe('none');

  await toMain.focus();
  // :focus-within, so arriving at the first one shows the set.
  expect(await list.evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');
  await expect(toSearch).toBeVisible();

  const rings = await list.evaluate((el) => {
    const links = [...el.querySelectorAll('.ac-skip-link')];
    return links.map((a) => getComputedStyle(a).outlineStyle);
  });
  expect(rings.filter((s) => s !== 'none')).toHaveLength(1);
});

test('there is no landmark wrapped around the skip links', async ({ page }) => {
  // A <nav> here would add a region to the landmark list for two links nobody
  // reaches by landmark.
  const list = page.locator('.ac-skip-list');
  expect(await list.evaluate((el) => el.tagName)).toBe('UL');
  expect(await list.evaluate((el) => !!el.closest('nav'))).toBe(false);
});

test('a link pointing at a form control needs no tabindex', async ({ page }) => {
  const search = page.locator('#sl-search-2');

  await expect(search).not.toHaveAttribute('tabindex', /.*/);

  await page.locator('.ac-skip-list').getByRole('link', { name: 'Skip to search' }).focus();
  await page.keyboard.press('Enter');
  // Already focusable on its own, so the fragment is enough.
  await expect(search).toBeFocused();
});

/* --- examples 3 and 4 · always visible ------------------------------------ */

test('the visible modifier is never clipped and needs no focus', async ({ page }) => {
  const link = page.locator('a.ac-skip-link[href="#sl-main-3"]');

  await expect(link).toBeVisible();
  const style = await link.evaluate((el) => {
    const s = getComputedStyle(el);
    return { clip: s.clipPath, position: s.position, outline: s.outlineStyle };
  });
  expect(style.clip).toBe('none');
  expect(style.position).toBe('static');
  // No ring until it is actually focused.
  expect(style.outline).toBe('none');

  const box = await link.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test('a mid-page link can skip a block rather than jump to main', async ({ page }) => {
  const link = page.getByRole('link', { name: 'Skip the lineup' });
  const after = page.locator('#sl-after-4');

  // SC 2.4.1 is about blocks; "main content" is only the commonest one.
  await expect(link).toBeVisible();
  await expect(after).toHaveAttribute('tabindex', '-1');

  await link.focus();
  await page.keyboard.press('Enter');
  await expect(after).toBeFocused();
});

/* --- example 5 · the two failures, live ----------------------------------- */

test('a display:none skip link cannot be focused, which is the whole failure', async ({ page }) => {
  const broken = page.locator('.ac-skip-link--broken');

  await expect(broken).toBeAttached();
  expect(await broken.evaluate((el) => getComputedStyle(el).display)).toBe('none');

  // Not merely invisible -- unreachable. focus() on it is a no-op.
  await broken.evaluate((el) => el.focus());
  const landed = await page.evaluate(
    () => document.activeElement && document.activeElement.classList.contains('ac-skip-link--broken'),
  );
  expect(landed).toBe(false);
});

test('a target with no tabindex scrolls without moving focus', async ({ page }) => {
  const link = page.getByRole('link', { name: 'Try the second failure' });
  const target = page.locator('#sl-main-5');

  await expect(target).not.toHaveAttribute('tabindex', /.*/);

  await link.focus();
  await page.keyboard.press('Enter');

  // The page moved and the user did not. This is the failure example 5 exists
  // to make visible.
  await expect(target).not.toBeFocused();
});

/* --- reflow --------------------------------------------------------------- */

test('nothing here widens the page at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await link1(page).focus();

  // SC 1.4.10, and the revealed link is the risk: it is absolutely positioned
  // and its text does not wrap.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('the reveal is not animated', async ({ page }) => {
  // There is nothing to animate from -- it was 1px a moment ago -- and an
  // animated skip link is one that is still arriving when Enter is pressed.
  const duration = await link1(page).evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(duration).toBe('0s');
});
