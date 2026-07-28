import { test, expect } from '@playwright/test';

const PAGE = 'components/focus-ring/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// This component has no ARIA and no keyboard map of its own -- what it claims is
// that a ring is *drawn* at the right moments, at the right size, and that it is
// not hidden by anything. So every assertion here is on computed style or on
// geometry, and every one of them is reached the way a person would reach it: by
// clicking, or by pressing Tab.
//
// Locators are scoped to `.ac-demo-grid` throughout -- the site shell has its own
// global :focus-visible rule and its own focusable chrome, and the code panel
// below the demo repeats every class name on this page as source text.
const demo = (page) => page.locator('.ac-demo-grid');

/** Computed ring for whatever currently has focus. */
const ring = (locator) =>
  locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      style: s.outlineStyle,
      width: parseFloat(s.outlineWidth),
      offset: parseFloat(s.outlineOffset),
      color: s.outlineColor,
      shadow: s.boxShadow,
    };
  });

/* --- example 1 · :focus-visible vs :focus ---------------------------------- */

test('the default ring is 3px, solid, and offset by 2px when reached by keyboard', async ({ page }) => {
  const tabTo = demo(page).getByRole('button', { name: 'Tab to me' });
  const always = demo(page).getByRole('button', { name: 'Click me' });

  // Arrive by keyboard: click the button after it, then Shift+Tab back. A
  // keyboard-initiated focus move is what :focus-visible is for.
  await always.click();
  await page.keyboard.press('Shift+Tab');
  await expect(tabTo).toBeFocused();

  const r = await ring(tabTo);
  expect(r.style).toBe('solid');
  // A hairline against a busy surface is not an indicator.
  expect(r.width).toBeGreaterThanOrEqual(3);
  expect(r.offset).toBe(2);
});

test('the default ring stays away after a mouse click', async ({ page }) => {
  const tabTo = demo(page).getByRole('button', { name: 'Tab to me' });

  await tabTo.click();
  await expect(tabTo).toBeFocused();

  // Focused, and deliberately unringed: you know where you clicked, because you
  // clicked it. This is the whole reason :focus-visible exists, and the reason
  // people who use :focus end up reaching for `outline: none`.
  const r = await ring(tabTo);
  expect(r.style).toBe('none');
});

test('--always rings on a click as well, which is what a skip link needs', async ({ page }) => {
  const always = demo(page).getByRole('button', { name: 'Click me' });

  await always.click();
  await expect(always).toBeFocused();

  const r = await ring(always);
  expect(r.style).toBe('solid');
  expect(r.width).toBeGreaterThanOrEqual(3);
});

test('--always survives the site-wide :focus:not(:focus-visible) reset', async ({ page }) => {
  // The doubled selector in [ALWAYS] exists only for this. The shell ships
  // `:focus:not(:focus-visible) { outline: none }`, which is exactly as specific
  // as `.ac-focus-ring--always:focus` and loads after it. If the second selector
  // is ever removed as redundant, this fails.
  const reset = await page.evaluate(() =>
    [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some((r) => r.selectorText === ':focus:not(:focus-visible)');
      } catch {
        return false;
      }
    }),
  );
  expect(reset).toBe(true);

  const always = demo(page).getByRole('button', { name: 'Click me' });
  await always.click();
  expect((await ring(always)).width).toBeGreaterThanOrEqual(3);
});

test('a text field rings on a click, because a caret needs a home', async ({ page }) => {
  const input = demo(page).getByLabel('Set length');

  await input.click();
  await expect(input).toBeFocused();

  // Same class as the first button, opposite outcome, and neither is a rule we
  // wrote -- the browser draws the distinction.
  expect((await ring(input)).style).toBe('solid');
});

/* --- example 2 · offset, and the clipped ring ------------------------------ */

test('--flush draws the ring at zero offset and --inset draws it inside', async ({ page }) => {
  const flush = demo(page).getByRole('button', { name: 'Offset 0' });
  const inset = demo(page).getByRole('button', { name: 'Inset' });

  await flush.focus();
  const f = await ring(flush);
  expect(f.style).toBe('solid');
  expect(f.offset).toBe(0);

  await inset.focus();
  const i = await ring(inset);
  expect(i.style).toBe('solid');
  // Negative, so nothing is painted outside the border box for an ancestor to
  // clip. It costs 3px of the element's own area.
  expect(i.offset).toBeLessThan(0);
  expect(i.offset).toBe(-3);
});

test('the clipping ancestor in example 2 really does clip', async ({ page }) => {
  // If this container ever loses `overflow: hidden` the example silently stops
  // demonstrating anything, and the third button's ring quietly starts working.
  const clip = demo(page).locator('.ac-fr-clip');
  expect(await clip.evaluate((el) => getComputedStyle(el).overflow)).toBe('hidden');

  const clipped = demo(page).getByRole('button', { name: 'Clipped' });
  await clipped.focus();
  // The ring is drawn correctly. It is painted outside a box that clips it,
  // which is the failure -- nothing about the button says so.
  const r = await ring(clipped);
  expect(r.style).toBe('solid');
  expect(r.offset).toBeGreaterThan(0);
});

/* --- example 3 · the two-tone ring ----------------------------------------- */

test('the two-tone ring draws two contiguous rings of opposite lightness', async ({ page }) => {
  const twoTone = demo(page).getByRole('button', { name: 'Two tone' }).first();
  await twoTone.focus();

  const r = await ring(twoTone);
  expect(r.style).toBe('solid');
  // The box-shadow's spread fills exactly the gap the outline's offset opens,
  // so the two tones touch rather than leaving a halo.
  expect(r.offset).toBe(3);
  expect(r.shadow).toMatch(/\b3px\b/);
  expect(r.shadow).not.toBe('none');

  const lightness = (css) => {
    const [r_, g, b] = css.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    return 0.2126 * r_ + 0.7152 * g + 0.0722 * b;
  };
  const inner = lightness(r.shadow);
  const outer = lightness(r.color);
  // Opposite ends, or the ring is one tone drawn twice. The theme guarantees
  // this pair contrasts, because it is its own text and background.
  expect(Math.abs(inner - outer)).toBeGreaterThan(100);
});

test('the single-tone ring is one color, so it can only contrast with one thing', async ({ page }) => {
  const oneTone = demo(page).getByRole('button', { name: 'One tone' }).first();
  await oneTone.focus();

  const r = await ring(oneTone);
  expect(r.style).toBe('solid');
  // No second tone -- which is the claim example 3 argues against, and the
  // reason the swatches sit underneath three different backgrounds.
  expect(r.shadow).toBe('none');
  await expect(demo(page).locator('.ac-fr-swatch')).toHaveCount(3);
});

/* --- example 4 · outline: none, live --------------------------------------- */

test('the broken button draws nothing at all when it has focus', async ({ page }) => {
  const broken = demo(page).getByRole('button', { name: 'Nothing' });

  await broken.focus();
  await expect(broken).toBeFocused();

  const r = await ring(broken);
  // SC 2.4.7, live on the page: focused, and untraceable.
  expect(r.style).toBe('none');
  expect(r.shadow).toBe('none');
});

test('the tint-only button changes color and nothing else', async ({ page }) => {
  const tint = demo(page).getByRole('button', { name: 'Tint only' });

  const before = await tint.evaluate((el) => getComputedStyle(el).backgroundColor);
  await tint.focus();
  const after = await tint.evaluate((el) => getComputedStyle(el).backgroundColor);

  // It *looks* handled, which is what makes it the interesting failure: the
  // button visibly changes, but the change is a difference of two colors and
  // nothing else. SC 1.4.1.
  expect(after).not.toBe(before);
  const r = await ring(tint);
  expect(r.style).toBe('none');
  expect(r.shadow).toBe('none');
});

test('the box-shadow replacement is a real ring', async ({ page }) => {
  const shadow = demo(page).getByRole('button', { name: 'Shadow ring' });
  await shadow.focus();

  const r = await ring(shadow);
  // The legitimate use of `outline: none`: something equal took its place.
  expect(r.style).toBe('none');
  expect(r.shadow).not.toBe('none');
  expect(r.shadow).toMatch(/\b3px\b/);
});

/* --- example 5 · focus not obscured (SC 2.4.11) ---------------------------- */

/** Walk to the bottom of one scroll frame, then back up, and report where the
 *  focused track came to rest relative to that frame's sticky bar. */
async function focusUpwards(page, frameIndex) {
  const frame = demo(page).locator('.ac-fr-scroll').nth(frameIndex);
  await frame.locator('.ac-fr-track').last().focus();
  // Backwards is the direction that breaks it: the target is above the
  // scrollport, so the browser lines its top edge up with the scrollport's.
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+Tab');

  return page.evaluate(() => {
    const el = document.activeElement;
    const bar = el.closest('.ac-fr-scroll').querySelector('.ac-fr-sticky');
    return {
      label: el.textContent.trim(),
      top: el.getBoundingClientRect().top,
      barBottom: bar.getBoundingClientRect().bottom,
    };
  });
}

test('without scroll-margin-top the sticky bar covers the focused track', async ({ page }) => {
  const { label, top, barBottom } = await focusUpwards(page, 0);

  expect(label).toBe('Basket Case');
  // Its top edge is above the bottom of the bar, so part of it -- and part of
  // its ring -- is behind the bar. This is the SC 2.4.11 failure.
  expect(top).toBeLessThan(barBottom);
});

test('scroll-margin-top brings the focused track to rest below the bar', async ({ page }) => {
  const { label, top, barBottom } = await focusUpwards(page, 1);

  expect(label).toBe('Basket Case');
  // Same list, same keys, one declaration different.
  expect(top).toBeGreaterThanOrEqual(barBottom);
});

test('the fix is on the focusable element, not on the bar', async ({ page }) => {
  const cleared = demo(page).locator('.ac-fr-cleared').first();
  const margin = await cleared.evaluate((el) => parseFloat(getComputedStyle(el).scrollMarginTop));
  const bar = await demo(page).locator('.ac-fr-sticky').first().boundingBox();

  expect(margin).toBeGreaterThan(0);
  // Less than the bar's height and the track still lands underneath it.
  expect(margin).toBeGreaterThanOrEqual(bar.height);
});

/* --- forced colors --------------------------------------------------------- */

test.describe('in forced colors', () => {
  // page.emulateMedia, not `test.use({ forcedColors: 'active' })`. The context
  // option is accepted and silently does nothing here -- `(forced-colors:
  // active)` still reports false inside the page, so every assertion below
  // would be made against the ordinary stylesheet and would pass for the wrong
  // reason. This is the same API the reduced-motion tests use.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
  });

  test('the two-tone ring falls back to a single 3px outline', async ({ page }) => {
    const twoTone = demo(page).getByRole('button', { name: 'Two tone' }).first();
    await twoTone.focus();

    const r = await ring(twoTone);
    // box-shadow is dropped here, so the inner tone is gone and the outline has
    // to carry the whole indicator on its own: back to 3px, back to the offset
    // the single-tone version uses.
    expect(r.shadow).toBe('none');
    expect(r.width).toBe(3);
    expect(r.offset).toBe(2);
    expect(r.style).toBe('solid');
  });

  test('the box-shadow replacement gets a real outline back', async ({ page }) => {
    const shadow = demo(page).getByRole('button', { name: 'Shadow ring' });
    await shadow.focus();

    const r = await ring(shadow);
    // Without the [FORCED] block this button is as broken as the two beside it,
    // because the shadow it relies on does not survive.
    expect(r.style).toBe('solid');
    expect(r.width).toBe(3);
  });

  test('the default ring is drawn in a system color, not the theme accent', async ({ page }) => {
    const tabTo = demo(page).getByRole('button', { name: 'Tab to me' });
    await tabTo.focus();

    const r = await ring(tabTo);
    expect(r.width).toBeGreaterThanOrEqual(3);

    // The [FORCED] block sets outline-color: CanvasText. Nothing else on the
    // page is CanvasText at a known selector except the example-4 key, so read
    // the resolved value from there rather than hard-coding a color the OS
    // theme chooses.
    const canvasText = await demo(page)
      .locator('.ac-fr-key')
      .evaluate((el) => getComputedStyle(el).color);
    expect(r.color).toBe(canvasText);
  });
});

/* --- motion, targets, reflow ----------------------------------------------- */

test('the ring itself is never animated', async ({ page }) => {
  // An indicator that fades in is an indicator that is not there yet.
  const props = await demo(page)
    .locator('.ac-fr-btn')
    .first()
    .evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(props).not.toContain('outline');
  expect(props).not.toContain('box-shadow');
  expect(props).not.toContain('all');
});

test('what motion there is goes to zero under data-motion="off"', async ({ page }) => {
  const btn = demo(page).locator('.ac-fr-btn').first();
  expect(await btn.evaluate((el) => getComputedStyle(el).transitionDuration)).not.toBe('0s');

  await page.evaluate(() => document.documentElement.setAttribute('data-motion', 'off'));
  expect(await btn.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
});

test('every focusable thing on the page is a real target', async ({ page }) => {
  // SC 2.5.8 asks for 24x24.
  const small = await demo(page).evaluate((grid) =>
    [...grid.querySelectorAll('button, input')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { name: el.textContent.trim() || el.id, w: r.width, h: r.height };
      })
      .filter((b) => b.w < 24 || b.h < 24),
  );
  expect(small).toEqual([]);
});

test('nothing here widens the page at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  // SC 1.4.10. The risk is the three-swatch stack and the two-column pair in
  // example 5, plus an outline offset painting past the viewport edge.
  await demo(page).getByRole('button', { name: 'Two tone' }).first().focus();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
