import { test, expect } from '@playwright/test';

const PAGE = 'components/disclosure/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* The component is two attributes and an element, so that is what every test
   below asserts: which element carries the state, whether the panel really left
   the accessibility tree, and whether the keyboard can reach the trigger at all.
   Nothing here checks the chevron except to prove it is gated. */

const trigger = (page, name) => page.getByRole('button', { name, exact: true });

const frame = (page, key) => page.locator(`[data-ac-disc-case="${key}"]`);
const out = (page, key, name) => frame(page, key).locator(`[data-ac-disc-out="${name}"]`);
const verdict = (page, key) => frame(page, key).locator('[data-ac-disc-verdict]');

/** The panel a trigger says it controls, found the way a screen reader would. */
const controlled = async (page, btn) =>
  page.locator(`#${await btn.getAttribute('aria-controls')}`);

/* --- example 1 · basic disclosure ----------------------------------------- */

test('the trigger owns the state and the panel is hidden, not merely invisible', async ({
  page,
}) => {
  const btn = trigger(page, 'Order 462');
  await expect(btn).toHaveAttribute('type', 'button');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');

  const panel = await controlled(page, btn);
  await expect(panel).toHaveCount(1);
  // The attribute, not display: none. hidden is what takes the panel out of the
  // accessibility tree and the tab order as well as off the screen.
  await expect(panel).toHaveAttribute('hidden', '');
  await expect(panel).toHaveAttribute('aria-labelledby', await btn.getAttribute('id'));
});

test('a click moves both attributes together', async ({ page }) => {
  const btn = trigger(page, 'Order 462');
  const panel = await controlled(page, btn);

  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();
  await expect(panel).not.toHaveAttribute('hidden', /.*/);

  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
});

test('Enter and Space both toggle, with no key handler in the component', async ({ page }) => {
  const btn = trigger(page, 'Order 462');
  await btn.focus();
  await expect(btn).toBeFocused();

  // A native button fires a click for both. component.js binds click only, so a
  // pass here is the element working rather than any code in this library.
  await page.keyboard.press('Enter');
  await expect(btn).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press(' ');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
});

test('Esc is not bound, so an open disclosure stays open', async ({ page }) => {
  const btn = trigger(page, 'Order 462');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  // Deliberate. A disclosure traps nothing, so Escape belongs to whatever
  // surrounds it -- usually a dialog that does trap.
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
});

/* --- example 2 · starts open ---------------------------------------------- */

test('data-ac-open is read once and the attribute matches it', async ({ page }) => {
  const btn = trigger(page, 'Delivery address');
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(await controlled(page, btn)).toBeVisible();
});

/* --- example 3 · no heading wrapper ---------------------------------------- */

test('the section triggers sit in a heading and the inline one does not', async ({ page }) => {
  const heading = (btn) => btn.evaluate((el) => el.closest('h1,h2,h3,h4,h5,h6')?.tagName ?? null);

  // h5, because this page runs h1, h2, h3, h4 above it. The level is the page's,
  // which is why .ac-disclosure__heading inherits its size rather than setting one.
  expect(await heading(trigger(page, 'Order 462'))).toBe('H5');
  expect(await heading(trigger(page, 'Delivery address'))).toBe('H5');

  // A "show more" control is not a section, and a heading here would put it in
  // the screen reader's heading list.
  expect(await heading(trigger(page, 'Show 2 more recipients'))).toBeNull();
});

test('every closed panel in the correct examples is closed by the attribute', async ({ page }) => {
  const closed = await page
    .locator('.ac-demo-section:not(.ac-demo-section--mistakes) .ac-disclosure__panel')
    .evaluateAll((panels) =>
      panels
        .filter((panel) => getComputedStyle(panel).display === 'none')
        .map((panel) => panel.hasAttribute('hidden')),
    );

  expect(closed.length).toBeGreaterThan(0);
  expect(closed.every(Boolean)).toBe(true);
});

/* --- example 4 · aria-expanded on the panel -------------------------------- */

test('the state on the panel leaves the button announcing nothing', async ({ page }) => {
  const btn = frame(page, 'panel-state').locator('[data-ac-disc-trigger]');
  const panel = frame(page, 'panel-state').locator('[data-ac-disc-panel]');

  await expect(btn).not.toHaveAttribute('aria-expanded', /.*/);
  await expect(out(page, 'panel-state', 'trigger')).toHaveText('no aria-expanded');
  await expect(panel).toHaveAttribute('aria-expanded', 'false');

  await btn.click();
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('aria-expanded', 'true');
  // Still nothing on the control, which is the only element anyone is standing on.
  await expect(btn).not.toHaveAttribute('aria-expanded', /.*/);
  await expect(verdict(page, 'panel-state')).toHaveText(/nothing about a panel/);
});

/* --- example 5 · panel hidden with CSS ------------------------------------- */

test('the closed panel is 0px tall and still holds a tab stop', async ({ page }) => {
  await expect(out(page, 'css-hidden', 'height')).toHaveText('0px');
  await expect(out(page, 'css-hidden', 'stops')).toHaveText('1');
  await expect(verdict(page, 'css-hidden')).toHaveText(/still holding 1 tab stop/);

  // The failure, asked of the browser: a link nobody can see, taking focus.
  const landed = await page.evaluate(() => {
    const link = document.getElementById('ac-disc-notes-link');
    link.focus();
    return document.activeElement === link;
  });
  expect(landed).toBe(true);
});

test('opening it gives the panel a height and changes nothing else', async ({ page }) => {
  const panel = frame(page, 'css-hidden').locator('[data-ac-disc-panel]');
  await frame(page, 'css-hidden').locator('[data-ac-disc-trigger]').click();

  const height = await panel.evaluate((el) => Math.round(el.getBoundingClientRect().height));
  expect(height).toBeGreaterThan(0);
  await expect(out(page, 'css-hidden', 'stops')).toHaveText('1');
  await expect(verdict(page, 'css-hidden')).toHaveText(/Open\./);
});

/* --- example 6 · a div as the trigger -------------------------------------- */

test('the div cannot take focus and still opens on a pointer', async ({ page }) => {
  const div = frame(page, 'div-trigger').locator('[data-ac-disc-trigger]');
  const panel = frame(page, 'div-trigger').locator('[data-ac-disc-panel]');

  await expect(out(page, 'div-trigger', 'element')).toHaveText('<div>');
  await expect(out(page, 'div-trigger', 'stops')).toHaveText('0');

  const landed = await div.evaluate((el) => {
    el.focus();
    return document.activeElement === el;
  });
  expect(landed).toBe(false);

  await div.click();
  await expect(panel).toBeVisible();
  await expect(verdict(page, 'div-trigger')).toHaveText(/no role, no tab stop/);
});

/* --- example 7 · aria-controls naming an id nobody built ------------------- */

test('aria-controls points at an id nothing on the page has', async ({ page }) => {
  const btn = frame(page, 'dangling').locator('[data-ac-disc-trigger]');
  const named = await btn.getAttribute('aria-controls');

  expect(named).toBe('ac-disc-refunds-body');
  await expect(page.locator(`#${named}`)).toHaveCount(0);
  await expect(out(page, 'dangling', 'target')).toHaveText('nothing on this page has that id');

  // And it toggles perfectly, which is the whole problem: nothing on screen and
  // nothing in the behavior tells you the reference is dead.
  await expect(frame(page, 'dangling').locator('[data-ac-disc-panel]')).toBeVisible();
  await btn.click();
  await expect(frame(page, 'dangling').locator('[data-ac-disc-panel]')).toBeHidden();
});

/* --- the shared obligations ----------------------------------------------- */

test('the chevron rotation is gated on the motion token', async ({ page }) => {
  // emulateMedia, never test.use({ reducedMotion }) -- the latter is accepted
  // and ignored in this setup, and the test then passes against a page that is
  // still animating.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('.ac-disclosure__icon')
    .first()
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(duration).toBe('0s');

  // And the disclosure still works, because the state was never the animation.
  const btn = trigger(page, 'Order 462');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
});

test('the factory is idempotent and destroy leaves the panel visible', async ({ page }) => {
  const same = await page.evaluate(() => {
    const root = document.querySelector('[data-ac-disclosure]');
    return window.AC.createDisclosure(root) === window.AC.createDisclosure(root);
  });
  expect(same).toBe(true);

  const btn = trigger(page, 'Order 462');
  const panel = await controlled(page, btn);
  await expect(panel).toBeHidden();

  await page.evaluate(() => {
    window.AC.createDisclosure(document.querySelector('[data-ac-disclosure]')).destroy();
  });

  // Back to the no-JavaScript result: readable, and no longer collapsible.
  await expect(panel).toBeVisible();
  await expect(btn).not.toHaveAttribute('aria-expanded', /.*/);
});
