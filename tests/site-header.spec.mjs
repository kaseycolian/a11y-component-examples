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

/* --- Header layout -------------------------------------------------------- */

test('the picker sits below the settings, in that order in the DOM too', async ({ page }) => {
  await page.goto('components/disclosure/');

  const settings = await page.locator('.site-header__controls').boundingBox();
  const picker = await page.locator('[data-jump-control]').boundingBox();

  expect(picker.y).toBeGreaterThan(settings.y);
  // Both right-aligned to the same edge, so the two rows read as one stack.
  expect(Math.round(picker.x + picker.width)).toBe(Math.round(settings.x + settings.width));

  // The point of the DOM order: Tab moves down the screen, never back up it
  // (SC 2.4.3). Anything that moves the picker visually has to move it here.
  const order = await page.evaluate(() => {
    const inner = document.querySelector('.site-header__inner');
    return [...inner.children].map((el) => el.className.split(' ')[0]);
  });
  expect(order.indexOf('site-header__controls')).toBeLessThan(order.indexOf('control'));
});

test('the sidebar gives way to the header picker below 900px', async ({ page }) => {
  await page.goto('components/disclosure/');
  await expect(page.locator('.sidebar')).toBeVisible();

  // Stacked, the full roster sat between the header and the page you asked for.
  await page.setViewportSize({ width: 760, height: 900 });
  await expect(page.locator('.sidebar')).toBeHidden();
  // Still navigable -- the picker is the same list, and now full width.
  await expect(jump(page).locator('.ac-dropdown__toggle')).toBeVisible();

  const picker = await page.locator('[data-jump-control]').boundingBox();
  expect(picker.width).toBeGreaterThan(600);
});

test('--header-h covers the real header at every width, so anchors clear it', async ({ page }) => {
  await page.goto('components/chip-toggle/');

  // SC 2.4.11: scroll-margin-top is calc(--header-h + 1rem), so the token going
  // stale is an anchor target parked underneath a sticky header. Two rows make
  // that height depend on which things wrapped, hence a check per breakpoint.
  for (const width of [1440, 900, 760, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const { real, token } = await page.evaluate(() => ({
      real: document.querySelector('.site-header').getBoundingClientRect().height,
      token: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) * 16,
    }));
    // The border-bottom is the 1px the token does not claim; the +1rem of
    // scroll-margin absorbs it.
    expect(real - token, `at ${width}px`).toBeLessThanOrEqual(2);
  }
});

test('the header holds its contrast at 320px, where the brand stops being large text', async ({
  page,
}) => {
  // The one width the shared gate does not run axe at, and the one where SC
  // 1.4.3 changes its mind about the header: the brand shrinks to fit beside
  // the settings, crosses under the 18.66px bold floor, and the threshold it
  // is measured against goes from 3:1 to 4.5:1 without the color moving. The
  // raw accent sat at 4.44:1 there. Per theme, because a threshold this close
  // is a per-theme question.
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
  await expect(swatch).toHaveAttribute('data-ac-swatch', /^#[0-9a-f]{3,8},#[0-9a-f]{3,8},#/i);
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
