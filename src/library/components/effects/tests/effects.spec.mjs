import { test, expect } from '@playwright/test';

const PAGE = 'components/effects/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// This page has no ARIA of its own and no JavaScript. What it claims is that
// five theme-service classes behave in five specific ways, that two of the
// examples are really failing, and that the numbers quoted in the docs are the
// numbers the browser computes. So every assertion here is on computed style, on
// the accessibility tree, or on a contrast ratio measured live.
//
// Locators are scoped to `.ac-demo-grid`: the code panel below the demo repeats
// every class name on this page as source text. There are two grids -- correct
// examples and mistakes -- so this matches twice, which is fine to chain from
// and never safe to act on directly.
const demo = (page) => page.locator('.ac-demo-grid');

/** WCAG 2.x contrast ratio between two colors, each `[r, g, b]`. */
function ratio(a, b) {
  const lum = (rgb) => {
    const lin = (c) => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Every color in a computed value, as `{ rgb, a }`. Chromium resolves a
 * color-mix() to `color(srgb …)` in the 0–1 range rather than to rgb(), so a
 * gradient built from tokens comes back in both syntaxes at once.
 */
function colors(css) {
  return (css.match(/rgba?\([^)]+\)|color\(srgb [^)]+\)/g) || []).map((s) => {
    const n = s.match(/[\d.]+/g).map(Number);
    return s.startsWith('color(')
      ? { rgb: [n[0] * 255, n[1] * 255, n[2] * 255].map(Math.round), a: n[3] ?? 1 }
      : { rgb: n.slice(0, 3), a: n[3] ?? 1 };
  });
}

/** `color` composited over `base` at its own alpha, times an extra `opacity`. */
const over = (color, base, opacity = 1) => {
  const a = color.a * opacity;
  return color.rgb.map((v, i) => Math.round(v * a + base[i] * (1 - a)));
};

/** The gradient stops of `locator`, as contrast ratios against its own text. */
const gradientRatios = async (locator) => {
  const { image, color } = await locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return { image: s.backgroundImage, color: s.color };
  });
  const text = colors(color)[0].rgb;
  return colors(image).map((stop) => ratio(text, stop.rgb));
};

/* --- example 1 · the backdrop ---------------------------------------------- */

test('the backdrop is decoration: no element, no role, no pointer target', async ({ page }) => {
  const panel = demo(page).locator('.fx-grid').first();

  const before = await panel.evaluate((el) => {
    const s = getComputedStyle(el, '::before');
    return {
      content: s.content,
      pointerEvents: s.pointerEvents,
      zIndex: s.zIndex,
      position: s.position,
    };
  });

  // It exists, it is painted behind, and it cannot be clicked. An overlay that
  // forgets pointer-events: none swallows every click underneath it.
  expect(before.content).toBe('""');
  expect(before.pointerEvents).toBe('none');
  expect(before.zIndex).toBe('-1');
  expect(before.position).toBe('absolute');

  // And it contributes nothing to the accessibility tree -- the panel's whole
  // content is the paragraph inside it.
  const tree = await panel.ariaSnapshot();
  expect(tree.split('\n').filter((line) => line.trim()).length).toBe(1);
  expect(tree).toContain('paragraph');
});

test('text on the backdrop clears 4.5:1 over the surface and over a grid line', async ({ page }) => {
  const prose = demo(page).locator('.ac-fx-prose');

  const measured = await prose.evaluate((el) => {
    const panel = el.closest('.fx-grid');
    const before = getComputedStyle(panel, '::before');
    return {
      text: getComputedStyle(el).color,
      surface: getComputedStyle(panel).backgroundColor,
      lines: before.backgroundImage,
      layerOpacity: Number(before.opacity),
    };
  });

  const surface = colors(measured.surface)[0].rgb;
  const text = colors(measured.text)[0].rgb;

  // Each grid line is a translucent color inside a gradient, and the whole
  // ::before then carries its own opacity. Composite both onto the surface to
  // get what the text is really sitting on where a line crosses it.
  const lines = colors(measured.lines)
    .filter((c) => c.a > 0)
    .map((c) => over(c, surface, measured.layerOpacity));

  // SC 1.4.3, measured against every background the same text can land on. The
  // docs quote 16.79:1 and 15.72:1 for the theme the site loads.
  expect(ratio(text, surface)).toBeGreaterThanOrEqual(4.5);
  expect(lines.length).toBeGreaterThan(0);
  for (const line of lines) expect(ratio(text, line)).toBeGreaterThanOrEqual(4.5);
});

/* --- example 2 · the stacking context --------------------------------------- */

test('the two grid panels differ by isolation and by nothing else', async ({ page }) => {
  // Anchored on the pair wrapper rather than by position: example 1 also has an
  // .fx-grid panel, and picking example 2's by index across two grids is a
  // selection any later split can silently move.
  const good = demo(page).locator('.ac-fx-pair .fx-grid:not(.ac-fx-broken-grid)');
  const broken = demo(page).locator('.ac-fx-broken-grid');

  // The failure is paint order, so the whole point is that the pseudo-elements
  // are identical. If these ever diverge the example stops making its argument:
  // a reader could then say the two panels were simply styled differently.
  const readBefore = (l) =>
    l.evaluate((el) => {
      const s = getComputedStyle(el, '::before');
      return [
        s.backgroundImage,
        s.backgroundSize,
        s.inset,
        s.opacity,
        s.zIndex,
        s.pointerEvents,
      ].join('|');
    });

  expect(await readBefore(broken)).toBe(await readBefore(good));

  await expect(good).toHaveCSS('isolation', 'isolate');
  await expect(broken).toHaveCSS('isolation', 'auto');
  // Still positioned, so the ::before is still inset to the panel. Only the
  // stacking context is missing.
  await expect(broken).toHaveCSS('position', 'relative');
});

/* --- example 3 · text on a gradient (SC 1.4.3) ------------------------------ */

test('both shipped bars clear 4.5:1 at every stop, not just at the ends', async ({ page }) => {
  for (const cls of ['fx-bar-top', 'fx-bar-bottom']) {
    const ratios = await gradientRatios(demo(page).locator(`.${cls}`));
    // Three stops, and the docs quote 16.79:1 at the ends against 11.35:1 and
    // 10:1 in the middle. The ends are what a color picker on the edge of the
    // element reports; the middle is the one that has to pass.
    expect(ratios.length, cls).toBe(3);
    expect(Math.min(...ratios), cls).toBeGreaterThanOrEqual(4.5);
  }
});

test('the over-tinted bar passes at both ends and fails in the middle', async ({ page }) => {
  const ratios = await gradientRatios(demo(page).locator('.ac-fx-broken-bar'));

  // Live SC 1.4.3 failure: 2.18:1 at the 55% stop in the theme the site loads.
  expect(Math.min(...ratios)).toBeLessThan(4.5);
  // And the reason it survives review -- the ends are 16.79:1.
  expect(Math.max(...ratios)).toBeGreaterThan(4.5);
});

/* --- example 4 · the scroll region ------------------------------------------ */

test('both scroll regions really scroll, and only one of them has a name', async ({ page }) => {
  const regions = demo(page).locator('.fx-scroll');
  await expect(regions).toHaveCount(2);

  for (let i = 0; i < 2; i++) {
    const overflows = await regions.nth(i).evaluate((el) => el.scrollHeight > el.clientHeight + 1);
    expect(overflows, `region ${i}`).toBe(true);
  }

  // SC 4.1.2. The first is a plain div: reachable in Chromium and announced as
  // nothing, which is the failure example 4 exists to show.
  await expect(demo(page).getByRole('region', { name: 'Recent orders' })).toHaveCount(1);
  await expect(regions.first()).not.toHaveAttribute('role', /.+/);
  await expect(regions.first()).not.toHaveAttribute('aria-label', /.+/);
});

test('the named region is keyboard reachable and scrolls from the keyboard', async ({ page }) => {
  const named = demo(page).getByRole('region', { name: 'Recent orders' });

  await named.focus();
  await expect(named).toBeFocused();

  // SC 2.1.1: reaching it is not enough if the keys do nothing once you are
  // there.
  await page.keyboard.press('End');
  await expect.poll(() => named.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});

test('a focused scroll region gets a real ring, not the 1px UA hairline', async ({ page }) => {
  const named = demo(page).getByRole('region', { name: 'Recent orders' });

  // Reached by keyboard, because the rule is :focus-visible -- a click into the
  // region to scroll it must not draw a ring at a mouse user.
  await demo(page).locator('.fx-scroll').first().focus();
  await page.keyboard.press('Tab');
  await expect(named).toBeFocused();

  const ring = await named.evaluate((el) => {
    const s = getComputedStyle(el);
    return { width: parseFloat(s.outlineWidth), style: s.outlineStyle };
  });

  // SC 2.4.7. effects.css draws no indicator, and the UA one on an
  // auto-focusable scroller computes to a 1px near-black hairline.
  expect(ring.width).toBeGreaterThanOrEqual(3);
  expect(ring.style).toBe('solid');
});

test('the scrollbar thumb clears 3:1 against its track', async ({ page }) => {
  const measured = await demo(page)
    .locator('.fx-scroll')
    .first()
    .evaluate((el) => ({
      thumb: getComputedStyle(el, '::-webkit-scrollbar-thumb').backgroundImage,
      track: getComputedStyle(el, '::-webkit-scrollbar-track').backgroundColor,
      surface: getComputedStyle(el).backgroundColor,
    }));

  const surface = colors(measured.surface)[0].rgb;
  const track = over(colors(measured.track)[0], surface);

  // SC 1.4.11: a scrollbar the author recolored is a control the author
  // recolored. Every stop of the thumb gradient has to clear 3:1, and the docs
  // quote 5.2:1 for the dimmest of them.
  const stops = colors(measured.thumb);
  expect(stops.length).toBe(3);
  for (const stop of stops) expect(ratio(stop.rgb, track)).toBeGreaterThanOrEqual(3);
});

/* --- example 5 · the two motion gates --------------------------------------- */

test('the token gate stops the element that sets the attribute; the selector gate does not', async ({
  page,
}) => {
  // page.evaluate, not demo(page).evaluate: the page has two .ac-demo-grid
  // elements and acting on the locator directly is a strict-mode failure. Both
  // selectors below are unique in the document -- the code panel repeats the
  // class names as source text, never as elements.
  const state = await page.evaluate(() => {
    const read = (sel) => {
      const el = document.querySelector(sel);
      const s = getComputedStyle(el);
      return {
        // --ac-motion, not --motion: tokens.css is an optional layer the site
        // deliberately does not load, so on this page the chain falls through to
        // theme-service's own token. That is the standalone case, which is the
        // one worth asserting.
        motion: s.getPropertyValue('--motion').trim(),
        duration: s.animationDuration,
        name: s.animationName,
        running: el.getAnimations().length,
      };
    };
    return { selector: read('.fx-pulse'), token: read('.ac-fx-pulse-token') };
  });

  // Both boxes carry data-motion="off" on themselves, and effects.css ships
  // both gates. [data-motion="off"] { --motion: 0 } matches the element itself
  // and the value is inherited from there; [data-motion="off"] .fx-pulse is a
  // descendant selector and needs an ancestor. Same file, same intent,
  // different reach -- which is example 5.
  expect(state.token.motion).toBe('0');
  expect(state.token.duration).toBe('0s');
  expect(state.token.running).toBe(0);

  // The sharp version of the same point: the left box resolves --motion to 0
  // too, and keeps animating anyway, because the rule that would have stopped it
  // is looking for an ancestor.
  expect(state.selector.motion).toBe('0');
  expect(state.selector.name).toBe('fx-pulse');
  expect(state.selector.duration).toBe('1.8s');
  expect(state.selector.running).toBe(1);
});

test('the header toggle sets the attribute on <html> and stops both', async ({ page }) => {
  // SC 2.2.2: fx-pulse loops forever, so the page owes a way to stop it. That
  // mechanism is the header's Reduce motion switch, and this is the assertion
  // that it reaches the left-hand box the element's own attribute could not.
  //
  // The real input is opacity: 0 under the decorative track, so activate it
  // through the label the way a person would.
  await page.locator('.switch__track').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');

  for (const sel of ['.fx-pulse', '.ac-fx-pulse-token']) {
    await expect
      .poll(() => demo(page).locator(sel).evaluate((el) => el.getAnimations().length), { message: sel })
      .toBe(0);
  }
});

test('with the OS asking for reduced motion, both boxes are still', async ({ page }) => {
  // page.emulateMedia rather than test.use, for the same reason forcedColors
  // needs it below: the context option is accepted and does nothing here.
  await page.emulateMedia({ reducedMotion: 'reduce' });

  // The media query targets .fx-pulse directly rather than through an ancestor,
  // so an OS preference wins over everything on the page -- including the
  // element's own data-motion attribute.
  for (const sel of ['.fx-pulse', '.ac-fx-pulse-token']) {
    const running = await demo(page)
      .locator(sel)
      .evaluate((el) => el.getAnimations().length);
    expect(running, sel).toBe(0);
  }
});

/* --- reflow ------------------------------------------------------------------ */

test('nothing here widens the page at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  // SC 1.4.10. The risks are the two side-by-side pairs and the mocked-up frame
  // in example 3, whose bar text is long enough to need wrapping.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

/* --- forced colors ----------------------------------------------------------- */

test.describe('in forced colors', () => {
  // page.emulateMedia, not `test.use({ forcedColors: 'active' })`. The context
  // option is accepted and silently does nothing here -- `(forced-colors:
  // active)` still reports false inside the page, so every assertion below would
  // be made against the ordinary stylesheet and would pass for the wrong reason.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
  });

  test('every decorative gradient is gone', async ({ page }) => {
    const backdrop = await demo(page)
      .locator('.fx-grid')
      .first()
      .evaluate((el) => getComputedStyle(el, '::before').display);
    expect(backdrop).toBe('none');

    for (const cls of ['fx-bar-top', 'fx-bar-bottom', 'ac-fx-broken-bar']) {
      await expect(demo(page).locator(`.${cls}`)).toHaveCSS('background-image', 'none');
    }
  });

  test('the two grid panels become indistinguishable, which is correct', async ({ page }) => {
    // The backdrop was the only thing between them, so high contrast erases
    // example 2's difference along with the decoration. Decoration that
    // survived forced colors would be decoration painting over the reader's own
    // colors.
    const read = (l) =>
      l.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.backgroundColor, s.borderColor, getComputedStyle(el, '::before').display].join('|');
      });

    expect(await read(demo(page).locator('.ac-fx-broken-grid'))).toBe(
      await read(demo(page).locator('.ac-fx-pair .fx-grid:not(.ac-fx-broken-grid)')),
    );
  });

  test('the scrollbar thumb is repainted rather than left as a hole', async ({ page }) => {
    const thumb = await demo(page)
      .locator('.fx-scroll')
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el, '::-webkit-scrollbar-thumb');
        return { image: s.backgroundImage, color: s.backgroundColor };
      });

    // The gradient goes, and background-clip: padding-box would leave nothing
    // behind it. A system color puts the thumb back.
    expect(thumb.image).toBe('none');
    expect(thumb.color).not.toBe('rgba(0, 0, 0, 0)');
  });
});
