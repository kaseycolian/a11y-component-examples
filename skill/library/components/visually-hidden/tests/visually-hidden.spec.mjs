import { test, expect } from '@playwright/test';

const PAGE = 'components/visually-hidden/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// The claim under test is one thing: gone from the screen, present in the
// accessibility tree. Everything else here proves the ways it is usually got
// wrong are absent.
//
// Locators are scoped to `.ac-demo-grid` throughout -- the site shell has its
// own unprefixed `.visually-hidden` utility and its own role="status", and the
// code panel below the demo repeats every string on this page as source text.
const demo = (page) => page.locator('.ac-demo-grid');

/* --- the class ------------------------------------------------------------ */

test('it is clipped to 1px and pulled back out of the line box', async ({ page }) => {
  const span = demo(page).locator('.ac-visually-hidden').first();

  const style = await span.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      position: s.position,
      width: parseFloat(s.width),
      height: parseFloat(s.height),
      margin: s.marginTop,
      padding: s.paddingTop,
      border: parseFloat(s.borderTopWidth),
      overflow: s.overflow,
      clip: s.clipPath,
      nowrap: s.whiteSpace,
    };
  });

  expect(style.position).toBe('absolute');
  // 1px, not 0 -- a zero-size box can be dropped from the accessibility tree.
  expect(style.width).toBeGreaterThan(0);
  expect(style.width).toBeLessThanOrEqual(1);
  expect(style.height).toBeLessThanOrEqual(1);
  expect(style.margin).toBe('-1px');
  expect(style.padding).toBe('0px');
  // border-box cannot shrink below its own borders, so a border makes the
  // "1px" box bigger than 1px.
  expect(style.border).toBe(0);
  expect(style.overflow).toBe('hidden');
  expect(style.clip).not.toBe('none');
  // Without it the text wraps inside the box and is read a letter at a time.
  expect(style.nowrap).toBe('nowrap');
});

test('it is not display:none, visibility:hidden, or aria-hidden', async ({ page }) => {
  const span = demo(page).locator('.ac-visually-hidden').first();

  const state = await span.evaluate((el) => {
    const s = getComputedStyle(el);
    return { display: s.display, visibility: s.visibility, hidden: el.closest('[aria-hidden="true"]') !== null };
  });

  // The three that would take the text out of the accessibility tree with it.
  expect(state.display).not.toBe('none');
  expect(state.visibility).toBe('visible');
  expect(state.hidden).toBe(false);
});

test('it takes no space in the line it sits in', async ({ page }) => {
  // The point of margin: -1px. A paragraph with hidden text in it is exactly
  // as tall as the same paragraph without.
  // Queried from the document rather than through demo(), which now matches two
  // grids -- the correct examples and the mistakes.
  const heights = await page.evaluate(() => {
    const p = [...document.querySelectorAll('.ac-demo-grid .ac-vh-body')].find((el) =>
      el.querySelector('.ac-visually-hidden'),
    );
    const before = p.getBoundingClientRect().height;
    p.querySelector('.ac-visually-hidden').remove();
    const after = p.getBoundingClientRect().height;
    return { before, after };
  });

  expect(heights.before).toBeCloseTo(heights.after, 1);
});

test('it occupies no visible area, which innerText will not tell you', async ({ page }) => {
  // Note for anyone extending this file: `innerText` includes clipped text --
  // it only drops display:none and visibility:hidden. Geometry is the
  // instrument for "off screen", and the accessibility name is the instrument
  // for "still announced".
  const box = await demo(page).locator('.ac-visually-hidden').first().boundingBox();
  expect(box.width).toBeLessThanOrEqual(1);
  expect(box.height).toBeLessThanOrEqual(1);
});

/* --- example 1 · finishing an accessible name ----------------------------- */

test('hidden text inside a link becomes part of the link name', async ({ page }) => {
  const links = demo(page).locator('.ac-vh-link');

  // Same visible text, different names -- which is the entire point.
  await expect(links.nth(0)).toHaveAccessibleName('Read more about Order 462');
  await expect(links.nth(1)).toHaveAccessibleName('Read more about Invoice 99');
});

test('the leading space is inside the span, not lost between the halves', async ({ page }) => {
  const name = await demo(page).locator('.ac-vh-link').first().evaluate((el) => el.textContent);
  // "Read moreabout Order 462" is what happens without it.
  expect(name.replace(/\s+/g, ' ')).toContain('Read more about');
});

test('the visible half is what a sighted user sees, and only that', async ({ page }) => {
  const link = demo(page).locator('.ac-vh-link').first();

  // The link is as wide as "Read more" alone: the hidden half is clipped to a
  // 1px box that is then pulled back out by margin: -1px.
  const widths = await link.evaluate((el) => {
    const before = el.getBoundingClientRect().width;
    el.querySelector('.ac-visually-hidden').remove();
    return { before, after: el.getBoundingClientRect().width };
  });
  expect(widths.before).toBeCloseTo(widths.after, 0);
});

/* --- example 2 · the focusable variant ------------------------------------ */

test('the focusable variant reveals what is inside it on focus', async ({ page }) => {
  const wrapper = demo(page).locator('.ac-visually-hidden--focusable');
  const link = wrapper.getByRole('link', { name: 'Edit this order' });

  expect(await wrapper.evaluate((el) => getComputedStyle(el).clipPath)).not.toBe('none');

  await link.focus();

  // :focus-within on the wrapper, because the focusable thing is inside it.
  const revealed = await wrapper.evaluate((el) => {
    const s = getComputedStyle(el);
    return { clip: s.clipPath, position: s.position, width: parseFloat(s.width) };
  });
  expect(revealed.clip).toBe('none');
  expect(revealed.position).toBe('static');
  expect(revealed.width).toBeGreaterThan(1);

  await expect(link).toBeVisible();
});

test('the revealed link is a real target once it appears', async ({ page }) => {
  const link = demo(page)
    .locator('.ac-visually-hidden--focusable')
    .getByRole('link', { name: 'Edit this order' });

  await link.focus();
  const box = await link.boundingBox();
  // SC 2.5.8.
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test('the reveal is not animated', async ({ page }) => {
  // Nothing to animate from, and an element still arriving is one the user is
  // already trying to press.
  const duration = await demo(page)
    .locator('.ac-visually-hidden--focusable')
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(duration).toBe('0s');
});

/* --- example 3 · the live region wrapper ---------------------------------- */

test('the live region is rendered before it has anything to say', async ({ page }) => {
  const region = demo(page).locator('.ac-visually-hidden[role="status"]');

  await expect(region).toBeAttached();
  await expect(region).toHaveAttribute('aria-live', 'polite');
  // Empty on purpose: injecting an already-populated live region announces
  // nothing, so the element has to exist first.
  expect((await region.textContent()).trim()).toBe('');
  // And it must not be display: none, which is the usual reason one is silent.
  expect(await region.evaluate((el) => getComputedStyle(el).display)).not.toBe('none');
});

/* --- example 4 · the four ways of hiding ---------------------------------- */

test('only the clipped label gives its button an accessible name', async ({ page }) => {
  const buttons = demo(page).locator('.ac-vh-btn');
  await expect(buttons).toHaveCount(4);

  // This is the whole component, asserted: identical markup, three of them
  // silent.
  await expect(buttons.nth(0)).toHaveAccessibleName('Add a customer');
  await expect(buttons.nth(1)).toHaveAccessibleName('');
  await expect(buttons.nth(2)).toHaveAccessibleName('');
  await expect(buttons.nth(3)).toHaveAccessibleName('');
});

test('the clipped, display:none and hidden versions are the same size on screen', async ({ page }) => {
  const boxes = await demo(page).locator('.ac-vh-btn').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }),
  );

  // 1 (clipped), 2 (display: none) and 4 (hidden attribute) are pixel-identical
  // and only the first has a name. Nothing on screen distinguishes them, which
  // is the failure this example exists to show.
  expect(new Set([boxes[0], boxes[1], boxes[3]].map((b) => `${b.w}x${b.h}`)).size).toBe(1);
});

test('visibility:hidden still reserves the space its text would take', async ({ page }) => {
  const boxes = await demo(page).locator('.ac-vh-btn').evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().width)),
  );

  // The second reason not to use it: the element is gone from the screen and
  // from the accessibility tree, but its layout box stays, so the button is
  // stretched by a label nobody can read.
  expect(boxes[2]).toBeGreaterThan(boxes[0]);
});

test('the icon is hidden from the accessibility tree, not from the screen', async ({ page }) => {
  const svg = demo(page).locator('.ac-vh-btn svg').first();
  // aria-hidden is the opposite tool: it keeps the pixels and drops the node.
  await expect(svg).toHaveAttribute('aria-hidden', 'true');
  await expect(svg).toHaveAttribute('focusable', 'false');
  await expect(svg).toBeVisible();
});

/* --- example 5 · aria-label is a different tool ---------------------------- */

test('hidden text is real text; an aria-label on a span is not', async ({ page }) => {
  const lines = demo(page).locator('.ac-vh-body');
  const total = lines.filter({ hasText: 'Total' }).first();
  const shipping = lines.filter({ hasText: 'Shipping' }).first();

  // Present in the page's text, and clipped to nothing on screen.
  expect(await total.textContent()).toContain(' for Order 462');
  const hidden = await total.locator('.ac-visually-hidden').boundingBox();
  expect(hidden.width).toBeLessThanOrEqual(1);

  // The aria-label version contributes nothing to the text at all -- find in
  // page and select-to-copy never see it, whatever a given AT does with it.
  const span = shipping.locator('.ac-vh-broken-arialabel');
  await expect(span).toHaveAttribute('aria-label', /Order 462/);
  expect((await span.textContent()).trim()).toBe('');
  expect(await shipping.textContent()).not.toContain(' for Order 462');
  // No role, which is why the label has nothing to attach to.
  await expect(span).not.toHaveAttribute('role', /.*/);
});

/* --- reflow --------------------------------------------------------------- */

test('nothing here widens the page at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  // SC 1.4.10. The risk is white-space: nowrap on an absolutely positioned
  // box -- it must stay clipped, not stretch the document.
  await demo(page)
    .locator('.ac-visually-hidden--focusable')
    .getByRole('link', { name: 'Edit this order' })
    .focus();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
