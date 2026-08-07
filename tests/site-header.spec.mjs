/**
 * The site shell's own header controls.
 *
 * This is not a component spec -- it covers the shell as a *consumer* of the
 * library. The theme picker is the Custom Select component loaded from the same
 * served files a visitor copies, which makes the header the one place where a
 * regression in the library shows up as a broken site rather than a red test.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const THEMES = JSON.parse(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../src/site/theme/themes.index.json'),
    'utf8',
  ),
).families.flatMap((family) => [family.dark, family.light]).filter(Boolean);

// Two Custom Selects live in the header now, so each locator names which one.
const picker = (page) => page.locator('[data-theme-control] .ac-dropdown');
const jump = (page) => page.locator('[data-jump-control] .ac-dropdown');

test('every tab title leads with the site name', async ({ page }) => {
  // A row of open tabs truncates, so the name a visitor recognizes comes first.
  await page.goto('components/disclosure/');
  await expect(page).toHaveTitle('The A11Y Way · Disclosure');

  await page.goto('components/');
  await expect(page).toHaveTitle('The A11Y Way · All Components');

  // The home page has no name of its own, so it takes the tagline rather than
  // saying "The A11Y Way · The A11Y Way".
  await page.goto('./');
  await expect(page).toHaveTitle('The A11Y Way · WCAG 2.2 AA Development Guide');
});

test('the header theme picker is the library Custom Select and applies a theme', async ({ page }) => {
  await page.goto('components/disclosure/');

  const toggle = picker(page).locator('.ac-dropdown__toggle');
  await expect(toggle).toBeVisible();
  // No hidden <select> behind it any more: the markup below is the component,
  // and the root's data-value is where the choice lives.
  await expect(page.locator('[data-theme-control] select')).toHaveCount(0);
  // The site's default is set on <html> in the markup (SITE_THEME), so the picker
  // opens on it rather than on Auto.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'acid-arcade-dark');
  await expect(toggle).toHaveAccessibleName(/Theme.*Acid Arcade/s);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  const options = picker(page).getByRole('option');
  // Swatches are decoration, so the name stays the plain theme name. The mode is
  // part of it because the groups are families, and a family holds both modes.
  await expect(options.filter({ hasText: 'Hot Neon (No Background)' }).first()).toHaveAccessibleName(
    'Hot Neon (No Background) · Dark',
  );
  expect(await options.count()).toBe(17);

  // By accessible name, not text: the row's textContent also carries the tick.
  await picker(page).getByRole('option', { name: 'Hot Neon · Dark', exact: true }).click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'hot-neon-dark');
  await expect(picker(page)).toHaveAttribute('data-value', 'hot-neon-dark');
  await expect(toggle).toBeFocused();

  const stored = await page.evaluate(() => localStorage.getItem('theme'));
  expect(stored).toBe('hot-neon-dark');
});

test('Auto hands the page back to the OS light/dark preference', async ({ page }) => {
  await page.goto('components/disclosure/');

  await picker(page).locator('.ac-dropdown__toggle').click();
  await picker(page).getByRole('option', { name: 'Auto', exact: true }).click();

  // No attribute at all: theme.css's :root is the only rule that flips with
  // prefers-color-scheme, so Auto has to mean "no override".
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
});

test('the choice survives a reload and the trigger shows it', async ({ page }) => {
  await page.goto('components/disclosure/');
  await picker(page).locator('.ac-dropdown__toggle').click();
  await picker(page).getByRole('option', { name: 'Midnight Arcade · Dark', exact: true }).click();

  await page.reload();
  // The ordering hazard: the server rendered SITE_THEME as selected, theme-init
  // sets data-theme from localStorage, and the header script has to push that
  // into the Custom Select whichever of the two scripts ran first. The trigger must
  // not lag.
  await expect(picker(page).locator('.ac-dropdown__toggle')).toHaveAccessibleName(
    /Theme.*Midnight Arcade/s,
  );
  await expect(picker(page)).toHaveAttribute('data-value', 'midnight-arcade-dark');
});

/* --- Components picker ---------------------------------------------------- */

test('the components picker is grouped, labeled, and says what choosing does', async ({ page }) => {
  await page.goto('components/disclosure/');

  const toggle = jump(page).locator('.ac-dropdown__toggle');
  // Named by the visible label plus the current value, the way a select does.
  await expect(toggle).toHaveAccessibleName(/Components.*Disclosure/s);
  // SC 3.2.2: choosing navigates, so the user is told before they choose.
  await expect(toggle).toHaveAccessibleDescription(/opens its page/);

  await toggle.click();
  // Grouped exactly like the sidebar rather than one flat list.
  await expect(jump(page).getByRole('group', { name: 'Overlays & Disclosure' })).toBeVisible();
  await expect(jump(page).getByRole('option', { name: 'All Components' })).toBeVisible();
});

test('choosing a component navigates, and the picker shows where you landed', async ({ page }) => {
  await page.goto('components/disclosure/');

  await jump(page).locator('.ac-dropdown__toggle').click();
  await jump(page).getByRole('option', { name: 'Drawer', exact: true }).click();

  await expect(page).toHaveURL(/components\/drawer\/$/);
  await expect(jump(page).locator('.ac-dropdown__toggle')).toHaveAccessibleName(
    /Components.*Drawer/s,
  );
});

test('arrowing through the components picker does not navigate', async ({ page }) => {
  await page.goto('components/disclosure/');

  // SC 3.2.2, and the whole reason navigating on the change event is allowed
  // here: the Custom Select commits only on a click or Enter. A bare native select
  // fires on every arrow key on Windows, which is what this used to guard with a
  // Go button instead.
  const toggle = jump(page).locator('.ac-dropdown__toggle');
  await toggle.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');

  await expect(page).toHaveURL(/components\/disclosure\/$/);
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
});

/* --- Brand ---------------------------------------------------------------- */

test('the brand mark and the tab icon are real files that follow the theme', async ({ page }) => {
  // The icon used to point at a favicon.svg that did not exist, so every page
  // served a 404 for it. Both assets are now vendored in public/brand/.
  const notFound = [];
  page.on('response', (r) => {
    if (r.status() >= 400) notFound.push(`${r.status()} ${r.url()}`);
  });

  await page.goto('components/disclosure/');

  // Scoped to the header: the footer wears the same lockup, and brand-mark-theme.js
  // paints every img.brand-mark on the page, so the bare selector matches two.
  // The footer's copy is site-footer.spec.mjs's to check.
  const mark = page.locator('.site-header img.brand-mark');
  await expect(mark).toBeVisible();
  expect((await mark.boundingBox()).width).toBeGreaterThan(0);

  // Both files paint in brand colors on their own; the two theme scripts read
  // the live tokens off <html> and hand the browser a data: URI instead. A
  // browser renders an <img> and a favicon in isolated documents, so this swap
  // is the only way either can follow the picker.
  await expect(mark).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await expect(page.locator('link[rel~="icon"]')).toHaveAttribute(
    'href',
    /^data:image\/svg\+xml/,
  );

  const before = await mark.getAttribute('src');
  await picker(page).locator('.ac-dropdown__toggle').click();
  await picker(page).getByRole('option', { name: 'Hot Neon · Dark', exact: true }).click();
  await expect(mark).not.toHaveAttribute('src', before);

  expect(notFound).toEqual([]);
});

/* --- Header layout -------------------------------------------------------- */

/* One representative width per layout, plus both sides of each switch. The whole
   ladder, for the sweeps that have to hold everywhere. Nothing above 1440px is a
   separate case: .hdr-inner is capped at 90rem, so a wider viewport only adds
   gutter. */
const ONE_ROW_WIDTHS = [1440, 1366, 1280, 1201];
const TWO_ROW_WIDTHS = [1200, 1000, 900, 801, 800, 620, 561];
const THREE_ROW_WIDTHS = [560, 500, 431, 430, 375, 320];
const ALL_WIDTHS = [...ONE_ROW_WIDTHS, ...TWO_ROW_WIDTHS, ...THREE_ROW_WIDTHS];

/** The four zones' boxes, plus the rail's own content box. */
async function zones(page) {
  return page.evaluate(() => {
    const box = (s) => {
      const b = document.querySelector(s).getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, right: b.right };
    };
    const rail = document.querySelector('.hdr-inner');
    const cs = getComputedStyle(rail);
    const r = rail.getBoundingClientRect();
    return {
      brand: box('.brand'),
      motion: box('.motion'),
      theme: box('[data-theme-control]'),
      nav: box('[data-jump-control]'),
      railLeft: r.left + parseFloat(cs.paddingLeft),
      railWidth: r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    };
  });
}

test('the four zones sit in one row, in the order you tab through them', async ({ page }) => {
  await page.goto('components/disclosure/');
  await page.setViewportSize({ width: 1440, height: 900 });

  const { brand, motion, theme, nav } = await zones(page);

  // Left to right: identity, then the two preferences, then where you can go.
  // The picker is at the right-hand end of the rail, which is why it is last.
  expect(brand.x).toBeLessThan(motion.x);
  expect(motion.x).toBeLessThan(theme.x);
  expect(theme.x).toBeLessThan(nav.x);

  // The point of the DOM order: Tab moves the way the eye does, never back
  // across the screen (SC 2.4.3). Anything that moves a zone visually has to
  // move it here too -- which is why putting the picker on the right meant
  // moving it in SiteHeader.astro, not just in CSS.
  const order = await page.evaluate(() =>
    [...document.querySelector('.hdr-inner').children].map((el) =>
      el.matches('[data-jump-control]')
        ? 'nav'
        : el.matches('[data-theme-control]')
          ? 'theme'
          : el.className.split(' ')[0],
    ),
  );
  expect(order).toEqual(['brand', 'motion', 'theme', 'nav']);
});

test('motion and theme are side by side at every width, with nothing between', async ({ page }) => {
  // The rule the whole arrangement is built around: they are the same kind of
  // thing -- a preference about how the page behaves -- so they are one pair and
  // no layout is allowed to split them. Asserted as geometry rather than as a
  // class name, so it holds however the rows are put together.
  await page.goto('components/disclosure/');

  for (const width of ALL_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    const { brand, motion, theme, nav } = await zones(page);

    expect(Math.round(motion.y), `pair split across rows at ${width}px`).toBe(Math.round(theme.y));
    expect(motion.x, `theme is not after motion at ${width}px`).toBeLessThan(theme.x);

    // Nothing else sits in the channel between them. Row-aware on purpose: below
    // 1200px the picker spans the whole rail on the row underneath, so it overlaps
    // the pair's x-range while being nowhere near it. Only a zone sharing their row
    // can come between them.
    const gap = theme.x - motion.right;
    expect(gap, `gap inside the pair went negative at ${width}px`).toBeGreaterThanOrEqual(0);
    for (const [name, other] of [['brand', brand], ['picker', nav]]) {
      const sameRow = Math.abs(other.y - motion.y) < 8;
      const between = sameRow && other.right > motion.right && other.x < theme.x;
      expect(between, `${name} sits between motion and theme at ${width}px`).toBe(false);
    }
  }
});

test('the brand is never painted underneath the zone beside it', async ({ page }) => {
  // The regression this file did not have. .brand-name is white-space: nowrap and
  // nothing in the lockup can reflow, so a brand that is allowed to shrink does
  // not get smaller -- it overflows its own box, and whatever is next to it draws
  // a background over the top. It was invisible to every assertion here because
  // the overflow sweep only ran at 900px and under, where the layout is a grid;
  // the failure lived entirely in the flex row above it.
  await page.goto('components/disclosure/');

  for (const width of [...ONE_ROW_WIDTHS, ...TWO_ROW_WIDTHS]) {
    await page.setViewportSize({ width, height: 900 });
    const { brand, motion } = await zones(page);

    // Geometry only, never a pixel threshold: the brand's width follows the font
    // --font-ui actually resolves to (it falls back to Verdana, which is wider),
    // so any number here would pass on this machine and fail on another.
    expect(Math.round(motion.x), `brand is overrun at ${width}px`).toBeGreaterThanOrEqual(
      Math.round(brand.right),
    );
  }
});

test('the components picker is the widest control at every width', async ({ page }) => {
  // Which control this site is *for*, said in geometry. The picker is this site's
  // navigation and the only navigation there is below 900px; the theme console is
  // a preference. Before this the sizes said the opposite -- 21rem against 26rem.
  await page.goto('components/disclosure/');

  for (const width of ALL_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    const { theme, nav } = await zones(page);

    expect(nav.width, `picker is not the widest control at ${width}px`).toBeGreaterThan(theme.width);
  }
});

test('below 1200px the picker drops under the pair, at the pair’s own width', async ({ page }) => {
  await page.goto('components/disclosure/');

  for (const width of TWO_ROW_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    const { brand, motion, theme, nav } = await zones(page);

    // brand | motion theme  /  picker -- read left to right, then down, which is
    // still the DOM order above. The picker is UNDER the theme console, which is
    // the arrangement stated: it only ever moves down and right.
    expect(nav.y, `picker is not below the pair at ${width}px`).toBeGreaterThan(theme.y);
    expect(brand.x).toBeLessThan(motion.x);

    // It spans the pair's columns exactly, so the three controls read as one
    // right-hand block over two lines rather than as a rail-wide bar under a
    // short pair. Both edges, because either one alone would pass on a fluke.
    expect(Math.round(nav.x), `picker left edge at ${width}px`).toBe(Math.round(motion.x));
    expect(Math.round(nav.right), `picker right edge at ${width}px`).toBe(Math.round(theme.right));
  }
});

test('the sidebar gives way to the header picker below 900px', async ({ page }) => {
  await page.goto('components/disclosure/');
  await expect(page.locator('.sidebar')).toBeVisible();

  // Stacked, the full roster sat between the header and the page you asked for.
  await page.setViewportSize({ width: 760, height: 900 });
  await expect(page.locator('.sidebar')).toBeHidden();
  // Still navigable -- the picker is the same list, on a row of its own.
  await expect(jump(page).locator('.ac-dropdown__toggle')).toBeVisible();

  const { motion, theme, nav } = await zones(page);
  expect(nav.y).toBeGreaterThan(theme.y);
  expect(Math.round(nav.x)).toBe(Math.round(motion.x));
  expect(Math.round(nav.right)).toBe(Math.round(theme.right));

  // And the header never forces a sideways scroll at any width (SC 1.4.10). This
  // is the assertion the console's missing min-width depends on -- see the note in
  // site-header.css's 430px block before adding one. The one-row widths are in the
  // sweep too: the rail up there is a flex row with no floor on either console,
  // which is the same invariant stated in a different layout.
  for (const width of ALL_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `header overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test('below 560px the brand takes its own row and the pair keeps theirs', async ({ page }) => {
  // Three rows: brand / motion theme / picker. 560px is where row 1 stops holding
  // brand + motion + theme, and it is where it stops because the switch's label is
  // never clipped any more -- see the test below. The grid places the zones, it
  // does not reorder them, so reading order still matches tab order (SC 2.4.3).
  await page.goto('components/disclosure/');
  await page.setViewportSize({ width: 320, height: 640 });

  const { brand, motion, theme, nav, railLeft, railWidth } = await zones(page);

  expect(brand.y).toBeLessThan(motion.y);
  expect(Math.round(motion.y)).toBe(Math.round(theme.y));
  expect(motion.y).toBeLessThan(nav.y);
  expect(motion.x).toBeLessThan(theme.x);

  // The picker still has the whole rail, exactly as it does at 1200px.
  expect(Math.round(nav.x)).toBe(Math.round(railLeft));
  expect(Math.round(nav.width)).toBe(Math.round(railWidth));
});

test('the motion toggle keeps its visible label at every width', async ({ page }) => {
  // It used to be clipped below 560px. A bare 44x24 track beside an unlabelled
  // console is a guess rather than a control -- and the label is part of the
  // toggle's accessible name, so clipping it was the only way to hide it at all.
  await page.goto('components/disclosure/');

  const label = page.locator('.switch__text');
  for (const width of ALL_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    const box = await label.boundingBox();
    // Clipped text still reports a box, so the check is that it has real size.
    expect(box.width, `motion label is clipped at ${width}px`).toBeGreaterThan(20);
  }
});

/* SC 2.4.11: scroll-margin-top is calc(--header-h + 1rem), so the token going
   stale is an anchor target parked underneath a sticky header. The header
   re-flows from one row to two to three, so every breakpoint gets a check and both
   sides of the two row-count switches are in the list -- those are where the real
   header changes height by a whole row. */
async function assertHeaderTokenCovers(page, label) {
  for (const width of [1440, 1201, 1200, 1000, 801, 800, 621, 620, 561, 560, 430, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const { real, token } = await page.evaluate(() => ({
      real: document.querySelector('.site-header').getBoundingClientRect().height,
      token:
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) * 16,
    }));
    expect(real - token, `${label} at ${width}px`).toBeLessThanOrEqual(2);
  }
}

test('--header-h covers the real header at every width, so anchors clear it', async ({ page }) => {
  await page.goto('components/chip-toggle/');
  await assertHeaderTokenCovers(page, 'default');
});

test('--header-h still covers it once the reduced-motion note is showing', async ({ browser }) => {
  // The note is a strip under the rail, so it grows the header by a line or two
  // for exactly the visitors who get it. The script sets data-motion-note on
  // <html> when it unhides the note; site-header.css has the taller value at
  // each breakpoint.
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('components/chip-toggle/');

  await expect(page.locator('#motion-note')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-motion-note', 'on');
  await assertHeaderTokenCovers(page, 'reduced motion');

  await context.close();
});

test('the header holds its contrast at 320px, where the brand stops being large text', async ({
  page,
}) => {
  // The one width the shared gate does not run axe at, and the one where SC 1.4.3
  // has the most to say about the header. Both console caps are clipped by here,
  // but the lockup is not -- it stacks rather than shedding the descriptor, so
  // this also covers a 15px wordmark and a 12px muted mono tag that only exist at
  // this size. The rest is the two trigger values and the switch: small text over
  // a translucent panel that every theme tints differently. Per theme, because
  // that is a per-theme question.
  test.setTimeout(120_000);
  await page.goto('components/disclosure/');
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });

  const failures = [];
  for (const theme of THEMES) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    const results = await new AxeBuilder({ page })
      .include('.site-header')
      .withRules(['color-contrast'])
      .analyze();
    for (const node of results.violations.flatMap((r) => r.nodes)) {
      failures.push(`${theme}: ${node.target.at(-1)} — ${node.any[0]?.message}`);
    }
  }

  expect(failures, `header contrast at 320px:\n  ${failures.join('\n  ')}`).toEqual([]);
});

test('swatches carry each theme real accents from theme.css', async ({ page }) => {
  await page.goto('components/disclosure/');
  // Authored in the markup, one span per accent, with the color inline because
  // it is the theme's own data rather than a stylesheet decision.
  const dots = page.locator(
    '[data-theme-control] [role="option"][data-value="rink-classic-dark"] .ac-dropdown__swatch > span',
  );
  // Four, in themes.mjs's order -- pink, green, blue, purple -- the same order
  // the type scale reads them in.
  await expect(dots).toHaveCount(4);
  const styles = await dots.evaluateAll((els) => els.map((el) => el.getAttribute('style')));
  for (const style of styles) expect(style).toMatch(/background:\s*#[0-9a-f]{3,8}/i);
});

/* The open panel is the header's only palette readout since the lamps came out,
   so the dots have to be really painted, and the trigger has to stay clean --
   the swatch is what the theme console spends its width on now. */
test('swatch dots are in the panel and never on the trigger', async ({ page }) => {
  await page.goto('components/disclosure/');

  const theme = picker(page);
  await expect(theme.locator('.ac-dropdown__toggle .ac-dropdown__swatch')).toHaveCount(0);
  await expect(page.locator('[data-theme-control] .console__lamps')).toHaveCount(0);

  await theme.locator('.ac-dropdown__toggle').click();
  const dots = theme.locator('.ac-dropdown__panel [role="option"] .ac-dropdown__swatch').first();
  await expect(dots.locator('span')).toHaveCount(4);

  const painted = await dots
    .locator('span')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
  expect(new Set(painted).size).toBe(4);
});

test('the motion toggle explains an OS preference with visible, described text', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('components/disclosure/');

  const box = page.locator('[data-motion-toggle]');
  const note = page.locator('#motion-note');

  await expect(note).toBeVisible();
  await expect(box).toHaveAttribute('aria-disabled', 'true');
  // The point of the change: aria-disabled, so it stays in the tab order.
  expect(await box.evaluate((el) => el.hasAttribute('disabled'))).toBe(false);
  await expect(box).toHaveAccessibleDescription(/Animation[\s\S]*already asks for reduced motion/);
  expect(await box.getAttribute('title')).toBeNull();

  // Focusable, and Space does not flip it.
  await box.focus();
  await expect(box).toBeFocused();
  await expect(box).toBeChecked();
  await page.keyboard.press('Space');
  await expect(box).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-motion'))).toBe(false);

  await context.close();
});

test('motion toggle is a normal working switch without an OS preference', async ({ page }) => {
  await page.goto('components/disclosure/');
  const box = page.locator('[data-motion-toggle]');

  await expect(page.locator('#motion-note')).toBeHidden();
  await expect(box).not.toHaveAttribute('aria-disabled', 'true');

  // The real input is opacity:0 under the decorative track, so a user activates
  // it through the <label> -- click that, the way a person would.
  await page.locator('.switch__track').click();
  await expect(box).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');

  // And by keyboard.
  await box.focus();
  await page.keyboard.press('Space');
  await expect(box).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-motion'))).toBe(false);
});
