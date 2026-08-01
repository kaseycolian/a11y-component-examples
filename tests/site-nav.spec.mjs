/**
 * The components sidebar.
 *
 * It is the whole roster, so as a list of links it was one Tab stop per
 * component standing between the header and the page you came to read. It is an
 * APG menubar now -- one Tab stop for the sidebar, arrows to move inside -- and
 * these are the assertions that keep it one.
 *
 * Nothing here hardcodes a component name or a count: the roster changes every
 * session, so each test reads the order it is asserting about out of the page.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGE = 'components/tabs/';

const sidebar = (page) => page.locator('.sidebar');
const links = (page) => page.locator('.sidebar__link');

/** The visible name of whatever is focused right now. */
const focusedName = (page) => page.evaluate(() => document.activeElement?.textContent?.trim());

/** Every item's name, in DOM order -- the sequence the arrows have to follow. */
const roster = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.sidebar__link')].map((el) => el.textContent.trim()),
  );

test.describe('components sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await expect(sidebar(page)).toBeVisible();
    // The sidebar is on screen before it is a menubar -- the roles come from a
    // deferred module script. Every test below presses a key the script is what
    // handles, so waiting on the upgrade rather than on the markup is the
    // difference between a suite and a coin flip under parallelism.
    await expect(page.locator('.sidebar__groups[role="menubar"]')).toBeAttached();
  });

  test('the whole roster is one Tab stop, and Tab again leaves it', async ({ page }) => {
    // The reason the pattern is here at all. Exactly one item is tabbable; the
    // rest are reached with the arrows.
    const tabbable = await page.evaluate(
      () => [...document.querySelectorAll('.sidebar__link')].filter((el) => el.tabIndex === 0).length,
    );
    expect(tabbable).toBe(1);

    // From the last header control, forward, the way a keyboard actually
    // arrives: onto an item, then straight past the sidebar.
    //
    // The first assertion is the item itself and not `closest('.sidebar')`,
    // because Firefox puts a scrollable container in the tab order on its own
    // and this sidebar is one. That stop passes an "inside the sidebar" check
    // while being exactly the extra stop the pattern is here to remove -- see
    // the tabindex="-1" on the nav in ComponentNav.astro.
    await page.locator('[data-theme-control] .ac-dropdown__toggle').focus();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.matches('.sidebar__link'))).toBe(true);

    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('.sidebar'))).toBe(false);
    expect(await page.evaluate(() => !!document.activeElement.closest('main'))).toBe(true);
  });

  test('the Tab stop starts on the page you are already on', async ({ page }) => {
    // Otherwise tabbing in lands at the top of the roster and you arrow back
    // down to where you already were.
    const here = page.locator('.sidebar__link[aria-current="page"]');
    await expect(here).toHaveCount(1);
    await expect(here).toHaveAttribute('tabindex', '0');

    await page.locator('[data-theme-control] .ac-dropdown__toggle').focus();
    await page.keyboard.press('Tab');
    await expect(here).toBeFocused();
  });

  test('arrow keys move through the roster and wrap at both ends', async ({ page }) => {
    const names = await roster(page);

    await links(page).first().focus();
    expect(await focusedName(page)).toBe(names[0]);

    await page.keyboard.press('ArrowDown');
    expect(await focusedName(page)).toBe(names[1]);

    // Across a group boundary, because the groups are `role="group"` inside the
    // menubar and not menubars of their own -- Down must not stop at one.
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    expect(await focusedName(page), 'Up from the first item wraps to the last').toBe(names.at(-1));

    await page.keyboard.press('ArrowDown');
    expect(await focusedName(page), 'Down from the last item wraps to the first').toBe(names[0]);
  });

  test('the roving tabindex follows focus, so Shift+Tab returns where you left', async ({ page }) => {
    const names = await roster(page);

    await links(page).first().focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await focusedName(page)).toBe(names[2]);

    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('.sidebar'))).toBe(false);

    await page.keyboard.press('Shift+Tab');
    expect(await focusedName(page)).toBe(names[2]);
  });

  test('Home and End jump to the ends of the roster', async ({ page }) => {
    const names = await roster(page);

    await links(page).nth(3).focus();
    await page.keyboard.press('End');
    expect(await focusedName(page)).toBe(names.at(-1));

    await page.keyboard.press('Home');
    expect(await focusedName(page)).toBe(names[0]);
  });

  test('typing a letter jumps to the next component starting with it', async ({ page }) => {
    const names = await roster(page);

    // The last item's letter, asked for from the first, so this is testing the
    // search rather than a slower ArrowDown. A single character searches from
    // the item *after* the focused one and wraps, which is what the expectation
    // reproduces.
    const letter = names.at(-1)[0].toLowerCase();
    const expected = names.slice(1).find((name) => name.toLowerCase().startsWith(letter)) ?? names[0];

    await links(page).first().focus();
    await page.keyboard.press(letter);
    expect(await focusedName(page)).toBe(expected);

    // And it does not eat the browser's own shortcuts.
    await page.keyboard.press('Control+Home');
    expect(await focusedName(page)).toBe(expected);
  });

  test('Space follows the focused link, the way Enter already does', async ({ page }) => {
    // Enter activates a link on its own; Space does not, and its default is to
    // scroll the page instead. Both have to work or the pattern is half wired.
    await links(page).first().focus();
    const target = await page.evaluate(() => document.activeElement.getAttribute('href'));

    await page.keyboard.press(' ');
    await expect(page).toHaveURL(new RegExp(`${target.replace(/[/.]/g, '\\$&')}$`));
  });

  test('the upgraded roster is a vertical menubar of labeled groups', async ({ page }) => {
    const bar = page.getByRole('menubar', { name: 'Components' });
    await expect(bar).toHaveAttribute('aria-orientation', 'vertical');

    // Each group is named by the words on screen above it, and the heading
    // element itself is out of the tree -- a menubar's allowed children reach
    // through a group, so an exposed h2 anywhere under it is a violation.
    const firstTitle = await page.locator('.sidebar__title').first().innerText();
    await expect(bar.getByRole('group', { name: firstTitle })).toBeVisible();
    await expect(page.locator('.sidebar__title').first()).toHaveAttribute('aria-hidden', 'true');
    expect(await bar.getByRole('heading').count()).toBe(0);

    await expect(links(page).first()).toHaveRole('menuitem');
    expect(await links(page).count()).toBe(await bar.getByRole('menuitem').count());

    // role="none" is ignored on an element carrying a global ARIA attribute, so
    // the aria-labelledby the un-upgraded list uses has to come off with it --
    // otherwise every group is still a list wrapped around its menuitems.
    expect(await page.locator('.sidebar [role="none"][aria-labelledby]').count()).toBe(0);
    expect(await bar.getByRole('list').count()).toBe(0);
    expect(await bar.getByRole('listitem').count()).toBe(0);
  });

  test('nothing in the sidebar carries a positive tabindex', async ({ page }) => {
    // A roving tabindex moves between 0 and -1. Anything above detaches focus
    // order from reading order (SC 2.4.3).
    const positive = await page.evaluate(() =>
      [...document.querySelectorAll('.sidebar [tabindex]')]
        .filter((el) => Number(el.getAttribute('tabindex')) > 0)
        .map((el) => el.textContent.trim()),
    );
    expect(positive).toEqual([]);
  });

  test('axe finds nothing in the upgraded sidebar', async ({ page }) => {
    // Scoped, because the rest of the page is the shared gate's to sweep. The
    // rule this is really here for is aria-required-children: a menubar owning
    // anything but menuitems and groups is a pattern that only looks right.
    const results = await new AxeBuilder({ page })
      .include('.sidebar')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();

    const found = results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`);
    expect(found, `sidebar violations:\n  ${found.join('\n  ')}`).toEqual([]);
  });

  test('without the script it is still a list of links you can reach', async ({ browser }) => {
    // The reason the roles are applied by script instead of shipped in the
    // markup. A menubar that never gets its script is tabindex="-1" on every
    // item but one -- a sidebar no keyboard can reach at all.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(PAGE);

    // Locators rather than page.evaluate, which is the one thing that does not
    // work in a context with JavaScript disabled. A link with no tabindex
    // attribute at all is the shipped markup, and it is tabbable.
    await expect(page.locator('.sidebar__link')).not.toHaveCount(0);
    await expect(page.locator('.sidebar__link[tabindex]')).toHaveCount(0);
    await expect(page.locator('.sidebar [role="menuitem"]')).toHaveCount(0);

    await context.close();
  });
});
