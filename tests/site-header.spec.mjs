/**
 * The site shell's own header controls.
 *
 * This is not a component spec -- it covers the shell as a *consumer* of the
 * library. The theme picker is the Dropdown component loaded from the same
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

// Two Dropdowns live in the header now, so each locator names which one.
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

test('the header theme picker is the library Dropdown and applies a theme', async ({ page }) => {
  await page.goto('components/disclosure/');

  const toggle = picker(page).locator('.ac-dropdown__toggle');
  await expect(toggle).toBeVisible();
  await expect(page.locator('#theme-select')).toBeHidden();
  // The site's default is set on <html> in the markup (SITE_THEME), so the picker
  // opens on it rather than on Auto.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'acid-arcade-dark');
  await expect(toggle).toHaveAccessibleName(/Theme.*Acid Arcade/s);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  const options = picker(page).getByRole('option');
  // Swatches are decoration, so the name stays the plain theme name.
  await expect(options.filter({ hasText: 'Hot Neon (No Background)' }).first()).toHaveAccessibleName(
    'Hot Neon (No Background)',
  );
  expect(await options.count()).toBe(17);

  // By accessible name, not text: the row's textContent also carries the tick.
  await picker(page).getByRole('option', { name: 'Hot Neon', exact: true }).first().click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'hot-neon-dark');
  await expect(page.locator('#theme-select')).toHaveValue('hot-neon-dark');
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
  await picker(page).getByRole('option', { name: 'Midnight Arcade', exact: true }).first().click();

  await page.reload();
  // The ordering hazard: theme-init sets data-theme, the header script mirrors it
  // into the select, the dropdown builds from it. The trigger must not lag.
  await expect(picker(page).locator('.ac-dropdown__toggle')).toHaveAccessibleName(
    /Theme.*Midnight Arcade/s,
  );
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

test('the Go fallback stays hidden while the Dropdown is doing its job', async ({ page }) => {
  await page.goto('components/disclosure/');
  // It exists for the case where the Dropdown script never lands, and a native
  // select would otherwise navigate on every arrow key.
  await expect(page.locator('[data-component-jump-go]')).toBeHidden();
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
  await picker(page).getByRole('option', { name: 'Hot Neon', exact: true }).first().click();
  await expect(mark).not.toHaveAttribute('src', before);

  expect(notFound).toEqual([]);
});

/* --- Header layout -------------------------------------------------------- */

test('the four zones sit in one row, in the order you tab through them', async ({ page }) => {
  await page.goto('components/disclosure/');

  const box = async (selector) => page.locator(selector).boundingBox();
  const brand = await box('.brand');
  const nav = await box('[data-jump-control]');
  const motion = await box('.motion');
  const theme = await box('[data-theme-control]');

  // Left to right: identity, where you can go, a preference, the instrument.
  expect(brand.x).toBeLessThan(nav.x);
  expect(nav.x).toBeLessThan(motion.x);
  expect(motion.x).toBeLessThan(theme.x);

  // The point of the DOM order: Tab moves the way the eye does, never back
  // across the screen (SC 2.4.3). Anything that moves a zone visually has to
  // move it here too.
  const order = await page.evaluate(() =>
    [...document.querySelector('.hdr-inner').children].map((el) =>
      el.matches('[data-jump-control]')
        ? 'nav'
        : el.matches('[data-theme-control]')
          ? 'theme'
          : el.className.split(' ')[0],
    ),
  );
  expect(order).toEqual(['brand', 'nav', 'motion', 'theme']);
});

test('below 1080px the zones re-flow to two rows without reordering', async ({ page }) => {
  await page.goto('components/disclosure/');
  await page.setViewportSize({ width: 900, height: 900 });

  const box = async (selector) => page.locator(selector).boundingBox();
  const brand = await box('.brand');
  const nav = await box('[data-jump-control]');
  const motion = await box('.motion');
  const theme = await box('[data-theme-control]');

  // brand | components  /  motion | theme -- read left to right, then down,
  // which is still the DOM order above.
  expect(nav.y).toBeLessThan(theme.y);
  expect(motion.y).toBeGreaterThan(brand.y);
  expect(motion.x).toBeLessThan(theme.x);
  // The two consoles right-align, so the pair reads as one stack.
  expect(Math.round(nav.x + nav.width)).toBe(Math.round(theme.x + theme.width));
});

test('the sidebar gives way to the header picker below 900px', async ({ page }) => {
  await page.goto('components/disclosure/');
  await expect(page.locator('.sidebar')).toBeVisible();

  // Stacked, the full roster sat between the header and the page you asked for.
  await page.setViewportSize({ width: 760, height: 900 });
  await expect(page.locator('.sidebar')).toBeHidden();
  // Still navigable -- the picker is the same list, and now the whole row.
  await expect(jump(page).locator('.ac-dropdown__toggle')).toBeVisible();

  const nav = await page.locator('[data-jump-control]').boundingBox();
  const brand = await page.locator('.brand').boundingBox();
  const railRight = await page.evaluate(() => {
    const el = document.querySelector('.hdr-inner');
    return el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight);
  });

  // It uncaps below 900px because it is the only navigation left, so it takes
  // everything the brand does not -- stated as "starts after the brand, ends at
  // the rail" rather than as a width in pixels. The brand's own width is a
  // function of the rendered font (--font-ui falls back to Verdana, which is
  // wider), so any threshold here would pass on this machine and fail on another.
  expect(Math.round(nav.x)).toBeGreaterThanOrEqual(Math.round(brand.x + brand.width));
  expect(Math.round(nav.x + nav.width)).toBe(Math.round(railRight));

  // And the pair never forces a sideways scroll at any width (SC 1.4.10). This is
  // the assertion the console's missing min-width depends on -- see the note in
  // site-header.css's 430px block before adding one.
  for (const width of [900, 760, 620, 430, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `header overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});

/* SC 2.4.11: scroll-margin-top is calc(--header-h + 1rem), so the token going
   stale is an anchor target parked underneath a sticky header. The header
   re-flows from one row to two, hence a check per breakpoint. */
async function assertHeaderTokenCovers(page, label) {
  for (const width of [1440, 900, 760, 375, 320]) {
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
  const swatch = page.locator('#theme-select option[value="rink-classic-dark"]');
  // Four, in the lamps' order -- pink, green, blue, purple -- so a swatch row
  // and the lamps beside the trigger are the same four colors.
  await expect(swatch).toHaveAttribute(
    'data-ac-swatch',
    /^(#[0-9a-f]{3,8},){3}#[0-9a-f]{3,8}$/i,
  );
});

test('the theme console lamps show the live palette', async ({ page }) => {
  await page.goto('components/disclosure/');

  const lamp = (n) => page.locator(`[data-theme-control] .console__lamps i:nth-child(${n})`);
  const painted = async () =>
    Promise.all([1, 2, 3, 4].map((n) => lamp(n).evaluate((el) => getComputedStyle(el).backgroundColor)));

  const before = await painted();
  // No JS paints these: they read --accent-* off the page, so a theme change
  // re-colors them for free. That is the point of putting them there.
  expect(new Set(before).size).toBe(4);

  await picker(page).locator('.ac-dropdown__toggle').click();
  await picker(page).getByRole('option', { name: 'Hot Neon', exact: true }).first().click();
  await expect.poll(painted).not.toEqual(before);
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
