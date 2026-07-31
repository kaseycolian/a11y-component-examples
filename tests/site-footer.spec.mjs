/**
 * The site shell's footer.
 *
 * Like site-header.spec.mjs, this is not a component spec -- it covers the shell.
 * The shared a11y gate already runs axe over whole component pages, so contrast
 * and landmark rules are checked there for free. What is left is the things a
 * restyle can silently break without any rule firing: the family index pointing
 * at the wrong site, "current" collapsing to a colored dot, or the lockup
 * quietly becoming a second link home.
 */
import { test, expect } from '@playwright/test';

const footer = (page) => page.getByRole('contentinfo');
const family = (page) => page.getByRole('navigation', { name: 'The A11Y Way sites' });

test('the page has exactly one contentinfo, and the family nav is named apart from the sidebar', async ({
  page,
}) => {
  await page.goto('components/disclosure/');

  await expect(footer(page)).toHaveCount(1);
  // Two navs on a component page. Same role, so axe's landmark-unique rule only
  // passes while their names differ -- and a name is also how a screen reader
  // user tells one list from the other.
  await expect(family(page)).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Components' })).toBeVisible();
});

test('the family index names both sites and marks this one as the current product', async ({
  page,
}) => {
  await page.goto('components/disclosure/');

  const links = family(page).getByRole('link');
  await expect(links).toHaveCount(2);

  // aria-current="true", not "page": this marks the current item in a SET -- the
  // product you are inside -- which stays true on every page of this site. A
  // "page" here would be a lie on all of them but the home page.
  const here = links.filter({ hasText: 'Component Guide' });
  await expect(here).toHaveAttribute('aria-current', 'true');
  await expect(here).toHaveAttribute('href', /a11y-component-examples\/$/);

  const themes = links.filter({ hasText: 'Themes' });
  await expect(themes).toHaveAttribute('href', 'https://kaseycolian.github.io/theme-service/');
  await expect(themes).not.toHaveAttribute('aria-current', /.*/);
  // Nobody asked for a new tab (SC 3.2.5).
  expect(await themes.getAttribute('target')).toBeNull();
});

test('"you are here" is real text, so current is never carried by the dot alone', async ({
  page,
}) => {
  await page.goto('components/disclosure/');

  // The lit dot is a ::before on this element -- decoration that HCM throws
  // away. The words are what survive it, and what a screen reader reads.
  await expect(footer(page).locator('.ftr-here')).toHaveText('You are here');
});

test('the footer lockup is not a link, and its mark follows the theme', async ({ page }) => {
  await page.goto('components/disclosure/');

  // The header's lockup already goes home. A second one would add a tab stop
  // that lands exactly where the first one does.
  await expect(footer(page).locator('.ftr-brand a')).toHaveCount(0);

  // brand-mark-theme.js paints every img.brand-mark on the page, so the footer's
  // mark gets the same data: URI swap the header's does. If it ever stops
  // matching that selector it silently freezes on the static brand colors.
  const mark = footer(page).locator('img.brand-mark');
  await expect(mark).toHaveAttribute('src', /^data:image\/svg\+xml/);
  expect((await mark.boundingBox()).width).toBeGreaterThan(0);
});

test('the index collapses without overflowing the narrowest phone', async ({ page }) => {
  await page.goto('components/disclosure/');
  await page.setViewportSize({ width: 320, height: 640 });

  // The rows are a repeat(auto-fit, minmax(min(280px, 100%), 1fr)) grid. The
  // min(..., 100%) is the whole guard: with a bare 280px the track outgrows a
  // 320px viewport once the rail padding is taken off, and the page scrolls
  // sideways (SC 1.4.10).
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const links = family(page).getByRole('link');
  const first = await links.nth(0).boundingBox();
  const second = await links.nth(1).boundingBox();
  expect(second.y).toBeGreaterThan(first.y);
});
