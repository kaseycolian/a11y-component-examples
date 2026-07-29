import { test, expect } from '@playwright/test';

const PAGE = 'components/jump-nav/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* Two of the claims on this page are about what the browser does with focus
   when a fragment is followed, so those are made with real clicks and real Tab
   presses rather than by reading the markup back. */

const cssNumber = (value) => parseFloat(String(value));

/* --- the contract -------------------------------------------------------- */

test('the nav is named, and it is a list of links', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'On this page', exact: true });
  // Exactly one. Example 5's named case used to reuse this name, which made
  // two navigation landmarks called the same thing on a page whose fifth
  // example is about that -- it is "Album sections" now.
  await expect(nav).toHaveCount(1);

  const list = nav.first().getByRole('list');
  await expect(list).toHaveCount(1);
  await expect(list.getByRole('listitem')).toHaveCount(4);
  await expect(nav.first().getByRole('link')).toHaveCount(4);
});

test('every target is focusable and out of the tab order', async ({ page }) => {
  for (const id of ['jn1-salad', 'jn1-nausea', 'jn1-cannonball', 'jn1-freak']) {
    const target = page.locator(`#${id}`);
    await expect(target).toHaveAttribute('tabindex', '-1');
    await expect(target).toHaveClass(/ac-jump-nav__target/);
  }
});

test('exactly one link is current, and it is the section you are in', async ({ page }) => {
  const nav = page.locator('.ac-jump-nav[data-ac-jump-root="#jn1-doc"]');
  await expect(nav.locator('[aria-current]')).toHaveCount(1);
  await expect(nav.locator('a[href="#jn1-salad"]')).toHaveAttribute('aria-current', 'location');

  // location, not page: page is a link *to* the page you are on.
  await page.locator('#jn1-doc').evaluate((el) => el.scrollTo(0, el.scrollHeight));

  await expect(nav.locator('a[href="#jn1-freak"]')).toHaveAttribute('aria-current', 'location', {
    timeout: 5000,
  });
  await expect(nav.locator('[aria-current]')).toHaveCount(1);
});

/* --- what the jump actually moves ----------------------------------------- */

test('following a link focuses the heading it points at', async ({ page }) => {
  await page.locator('a[href="#jn2b-longview"]').click();
  await expect(page.locator('#jn2b-longview')).toBeFocused();
});

test('without tabindex the jump throws focus back to the document', async ({ page }) => {
  const link = page.locator('a[href="#jn2a-longview"]');
  await link.click();
  await expect(page.locator('#jn2a-longview')).not.toBeFocused();
  // Not left on the link either: an unfocusable fragment target sends the
  // browser to the document's viewport, so the next Tab starts at the top of
  // the page rather than at the section that was asked for.
  await expect(page.locator('body')).toBeFocused();
});

test('tabindex="0" lands the jump and buys a stop on every heading', async ({ page }) => {
  await page.locator('[data-ac-jn-land-case="zero"] .ac-jn-doc').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#jn2c-longview')).toBeFocused();

  // The same walk through the case that gets it right reaches no heading.
  await page.locator('[data-ac-jn-land-case="minus"] .ac-jn-doc').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#jn2b-longview')).not.toBeFocused();
});

test('the landing readout names what took focus', async ({ page }) => {
  await page.locator('a[href="#jn2a-longview"]').click();
  const bad = page.locator('[data-ac-jn-out="land-none"]');
  await expect(bad).toHaveText(/^<body>/);
  await expect(bad).toHaveAttribute('data-ac-jn-bad', 'true');

  await page.locator('a[href="#jn2b-longview"]').click();
  const good = page.locator('[data-ac-jn-out="land-minus"]');
  await expect(good).toHaveText(/\(heading\)/);
  await expect(good).not.toHaveAttribute('data-ac-jn-bad', 'true');
});

/* --- SC 2.4.11 ------------------------------------------------------------ */

test('the target clears whatever is stuck to the top', async ({ page }) => {
  // The site ships a global `[id] { scroll-margin-top: calc(--header-h + 1rem) }`
  // aimed at the page header. These sections scroll inside a box, so the
  // component's own offset has to win -- a value near 156px here would mean it
  // did not, and every heading would land most of the way out of the box.
  const inBox = await page
    .locator('#jn1-salad')
    .evaluate((el) => getComputedStyle(el).scrollMarginTop);
  expect(cssNumber(inBox)).toBeLessThan(20);

  const clear = await page
    .locator('#jn3b-nausea')
    .evaluate((el) => getComputedStyle(el).scrollMarginTop);
  const under = await page
    .locator('#jn3a-nausea')
    .evaluate((el) => getComputedStyle(el).scrollMarginTop);

  expect(cssNumber(under)).toBe(0);
  expect(cssNumber(clear)).toBeGreaterThan(20);
});

test('the clearance readout measures the overlap both ways', async ({ page }) => {
  await page.locator('a[href="#jn3a-nausea"]').click();
  await expect(page.locator('[data-ac-jn-out="clear-under"]')).toHaveText(/obscured by \d+px/);
  await expect(page.locator('[data-ac-jn-out="clear-under"]')).toHaveAttribute(
    'data-ac-jn-bad',
    'true',
  );

  await page.locator('a[href="#jn3b-nausea"]').click();
  await expect(page.locator('[data-ac-jn-out="clear-clear"]')).toHaveText(/clear by \d+px/);
});

/* --- what watching the scroll costs --------------------------------------- */

test('a scroll handler runs many times for the few changes it reports', async ({ page }) => {
  await page.locator('[data-ac-jn-cost-run]').click();

  await expect(page.locator('[data-ac-jn-out="cost-verdict"]')).toHaveAttribute(
    'data-ac-jn-bad',
    'true',
    { timeout: 5000 },
  );

  const scrolls = cssNumber(await page.locator('[data-ac-jn-out="cost-scroll"]').innerText());
  const changes = cssNumber(await page.locator('[data-ac-jn-out="cost-change"]').innerText());
  expect(changes).toBeGreaterThan(0);
  expect(scrolls).toBeGreaterThan(changes);
});

/* --- the deliberate absence ----------------------------------------------- */

test('nothing on the page announces the current section', async ({ page }) => {
  // `output` is in the selector on purpose: it carries an implicit
  // role="status", so a live-region sweep that greps for role= misses it.
  const regions = page.locator(
    '.ac-demo-grid [role="status"], .ac-demo-grid [role="alert"], .ac-demo-grid [role="log"], .ac-demo-grid [aria-live], .ac-demo-grid output',
  );
  await expect(regions).toHaveCount(0);
});

/* --- the landmark menu ---------------------------------------------------- */

test('two unnamed navs are one entry repeated', async ({ page }) => {
  const unnamed = page.locator('[data-ac-jn-out="mark-unnamed"]');
  await expect(unnamed).toHaveText('navigation · navigation');
  await expect(unnamed).toHaveAttribute('data-ac-jn-bad', 'true');

  const named = page.locator('[data-ac-jn-out="mark-named"]');
  await expect(named).toHaveText('Album sections · Site sections');
  await expect(named).not.toHaveAttribute('data-ac-jn-bad', 'true');
});

/* --- states --------------------------------------------------------------- */

test('current is carried by more than the color', async ({ page }) => {
  // Colors are read with the transition suppressed, or the value that comes
  // back is the animation rather than either state.
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const nav = page.locator('.ac-jump-nav[data-ac-jump-root="#jn1-doc"]');
  const current = nav.locator('a[href="#jn1-salad"]');
  const rest = nav.locator('a[href="#jn1-nausea"]');

  const edge = (loc) => loc.evaluate((el) => getComputedStyle(el).borderLeftColor);
  const fill = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor);
  const ink = (loc) => loc.evaluate((el) => getComputedStyle(el).color);

  expect(await edge(current)).not.toBe(await edge(rest));
  expect(await fill(current)).not.toBe(await fill(rest));
  expect(await ink(current)).not.toBe(await ink(rest));
});

test('the target keeps a ring on a click-initiated focus', async ({ page }) => {
  await page.locator('a[href="#jn1-nausea"]').click();
  const outline = await page
    .locator('#jn1-nausea')
    .evaluate((el) => getComputedStyle(el).outlineWidth);
  // :focus-visible would not match a pointer-initiated move, and the site's own
  // `:focus:not(:focus-visible) { outline: none }` would cancel a single class.
  expect(cssNumber(outline)).toBeGreaterThan(0);
});

test('every link clears the 24px target floor', async ({ page }) => {
  const links = page.locator('.ac-jump-nav__link');
  const count = await links.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const box = await links.nth(i).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
  }
});

/* --- environments --------------------------------------------------------- */

test.describe('reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    // test.use({ reducedMotion }) is accepted and ignored in this setup.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);
  });

  test('no transition on the current link survives it', async ({ page }) => {
    const durations = await page
      .locator('.ac-jump-nav__link')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);

    for (const part of durations.split(',')) {
      expect(cssNumber(part)).toBe(0);
    }
  });
});

test.describe('forced colors', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.goto(PAGE);
  });

  test('current is still distinguishable when the tint is dropped', async ({ page }) => {
    const nav = page.locator('.ac-jump-nav[data-ac-jump-root="#jn1-doc"]');
    const current = nav.locator('a[href="#jn1-salad"]');
    const rest = nav.locator('a[href="#jn1-nausea"]');

    const fill = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor);
    const ink = (loc) => loc.evaluate((el) => getComputedStyle(el).color);

    expect(await fill(current)).not.toBe(await fill(rest));
    expect(await ink(current)).not.toBe(await ink(rest));
  });
});

test.describe('320px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('the page does not scroll sideways (SC 1.4.10)', async ({ page }) => {
    await page.goto(PAGE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

/* --- API ------------------------------------------------------------------ */

test('destroy takes the mark back off', async ({ page }) => {
  const nav = page.locator('.ac-jump-nav[data-ac-jump-root="#jn1-doc"]');
  await expect(nav.locator('[aria-current]')).toHaveCount(1);

  await page.evaluate(() => {
    const el = document.querySelector('.ac-jump-nav[data-ac-jump-root="#jn1-doc"]');
    window.AC.createJumpNav(el).destroy();
  });

  await expect(nav.locator('[aria-current]')).toHaveCount(0);
});

test('the factory is idempotent', async ({ page }) => {
  const same = await page.evaluate(() => {
    const el = document.querySelector('.ac-jump-nav[data-ac-jump-root="#jn1-doc"]');
    return window.AC.createJumpNav(el) === window.AC.createJumpNav(el);
  });
  expect(same).toBe(true);
});
