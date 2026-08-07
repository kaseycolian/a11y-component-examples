import { test, expect } from '@playwright/test';

const PAGE = 'components/motion-preferences/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* The claims worth testing are not "it renders". They are: the token resolves
   to the same answer in both languages, the page can subtract motion and can
   never add it back, the control says so out loud when it has been overruled,
   and the deliberately broken rule in example 5 really does beat the media
   query. Each of those is a sentence in docs.md that would otherwise be a
   promise. */

const SCOPE = '.ac-motion-scope';

/** The resolved gate, read exactly the way component.js reads it. */
async function gate(page) {
  return page.$eval(SCOPE, (el) =>
    getComputedStyle(el).getPropertyValue('--ac-motion').trim(),
  );
}

/** A fresh load with the OS preference set. */
async function withReducedMotion(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(PAGE);
}

/* --- example 2 · the toggle and the gate ---------------------------------- */

test('the gate starts at 1 with no attribute on the scope', async ({ page }) => {
  expect(await gate(page)).toBe('1');
  expect(await page.$eval(SCOPE, (el) => el.hasAttribute('data-motion'))).toBe(false);
});

test('the switch is a real checkbox named by what it does', async ({ page }) => {
  const box = page.getByRole('checkbox', { name: 'Reduce motion on this page' });

  await expect(box).not.toBeChecked();
  await expect(box).toHaveAccessibleName('Reduce motion on this page');
  // Paint, so it must not reach the accessible name.
  await expect(page.locator('.ac-switch__track')).toHaveAttribute('aria-hidden', 'true');
});

test('the toggle writes "off" and then removes it — it never writes "on"', async ({ page }) => {
  const box = page.locator('[data-ac-motion-input]');

  await page.locator('.ac-switch__track').click();
  await expect(box).toBeChecked();
  await expect(page.locator(SCOPE)).toHaveAttribute('data-motion', 'off');
  expect(await gate(page)).toBe('0');

  // The absence of the attribute is the "on" state. Writing "on" is the bug in
  // example 5, and this is the assertion that keeps it out of the core.
  await box.focus();
  await page.keyboard.press('Space');
  await expect(box).not.toBeChecked();
  expect(await page.$eval(SCOPE, (el) => el.hasAttribute('data-motion'))).toBe(false);
  expect(await gate(page)).toBe('1');
});

test('the readout names all three signals', async ({ page }) => {
  await expect(page.locator('[data-ac-motion-out="os"]')).toHaveText('no-preference');
  await expect(page.locator('[data-ac-motion-out="attr"]')).toHaveText('not set');
  await expect(page.locator('[data-ac-motion-out="resolved"]')).toHaveText('1');

  await page.locator('.ac-switch__track').click();

  await expect(page.locator('[data-ac-motion-out="attr"]')).toHaveText('off');
  await expect(page.locator('[data-ac-motion-out="resolved"]')).toHaveText('0');
});

test('the verdict is a polite status, and the readout table is not live', async ({ page }) => {
  const verdict = page.locator('[data-ac-motion-verdict]');

  await expect(verdict).toHaveAttribute('role', 'status');
  await expect(verdict).toHaveText(/Animation is on/);

  // Three rows re-announced on every change would bury the sentence above.
  expect(await page.$eval('[data-ac-motion-readout]', (el) => el.hasAttribute('aria-live'))).toBe(
    false,
  );

  await page.locator('.ac-switch__track').click();
  await expect(verdict).toHaveText(/off, because you turned it off here/);
});

/* --- example 2 · the asymmetry -------------------------------------------- */

test('an OS preference wins, and the control says so instead of disappearing', async ({ page }) => {
  await withReducedMotion(page);

  const box = page.locator('[data-ac-motion-input]');

  expect(await gate(page)).toBe('0');
  await expect(box).toBeChecked();
  await expect(box).toHaveAttribute('aria-disabled', 'true');

  // The point of the change: aria-disabled, so it keeps its tab stop and the
  // reason stays reachable. A disabled input is skipped and explains nothing.
  expect(await box.evaluate((el) => el.hasAttribute('disabled'))).toBe(false);
  await expect(page.locator('[data-ac-motion-locked-note]')).toBeVisible();
  await expect(box).toHaveAccessibleDescription(/system already asks for reduced motion/);
  expect(await box.getAttribute('title')).toBeNull();

  await box.focus();
  await expect(box).toBeFocused();
});

test('the page cannot turn motion back on once the OS has asked for less', async ({ page }) => {
  await withReducedMotion(page);

  const box = page.locator('[data-ac-motion-input]');

  await box.focus();
  await page.keyboard.press('Space');
  await expect(box).toBeChecked();
  expect(await gate(page)).toBe('0');

  // Playwright refuses an ordinary click here for the same reason a screen
  // reader says "unavailable" — it honors aria-disabled. Force it past that:
  // the preventDefault in component.js is what actually holds.
  await page.locator('.ac-switch__track').click({ force: true });
  await expect(box).toBeChecked();
  expect(await gate(page)).toBe('0');

  await expect(page.locator('[data-ac-motion-verdict]')).toHaveText(/nothing on this page can lift/);
});

/* --- example 1 · a gated animation actually stops -------------------------- */

test('the disc turns, and the toggle is what stops it', async ({ page }) => {
  const disc = page.locator('.ac-motion-disc');

  await expect(disc).toHaveCSS('animation-duration', '4s');

  const before = await disc.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(400);
  const during = await disc.evaluate((el) => getComputedStyle(el).transform);
  expect(during).not.toBe(before);

  await page.locator('.ac-switch__track').click();

  await expect(disc).toHaveCSS('animation-duration', '0s');
  const stoppedA = await disc.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(400);
  const stoppedB = await disc.evaluate((el) => getComputedStyle(el).transform);
  expect(stoppedB).toBe(stoppedA);
});

/* --- example 3 · motion the stylesheet cannot reach ------------------------ */

test('the ticker is not a live region', async ({ page }) => {
  const item = page.locator('[data-ac-motion-ticker-item]');

  await expect(item).toHaveText('Order 462 shipped');
  // aria-live on content that advances on a timer makes the page unusable.
  expect(
    await page.$eval('[data-ac-motion-ticker]', (el) => el.querySelector('[aria-live]') !== null),
  ).toBe(false);
});

test('the pause button renames itself and carries no aria-pressed', async ({ page }) => {
  const button = page.locator('[data-ac-motion-ticker-toggle]');

  await expect(button).toHaveText('Pause');
  // Renaming *and* reporting a pressed state announces the change twice, and
  // the two can contradict each other.
  expect(await button.evaluate((el) => el.hasAttribute('aria-pressed'))).toBe(false);

  await button.click();
  await expect(button).toHaveText('Play');
  await expect(page.locator('[data-ac-motion-ticker-note]')).toHaveText(/SC 2.2.2/);
});

test('a paused ticker really stops advancing', async ({ page }) => {
  const item = page.locator('[data-ac-motion-ticker-item]');

  await page.locator('[data-ac-motion-ticker-toggle]').click();
  const held = await item.textContent();
  await page.waitForTimeout(4500);
  expect(await item.textContent()).toBe(held);
});

test('the ticker follows the token, not matchMedia', async ({ page }) => {
  // The page toggle is invisible to matchMedia, so a script that asked the OS
  // directly would keep running here. This is the assertion behind that claim.
  await page.locator('.ac-switch__track').click();

  await expect(page.locator('[data-ac-motion-ticker-toggle]')).toHaveText('Play');
  await expect(page.locator('[data-ac-motion-ticker-note]')).toHaveText(/Held still/);

  const item = page.locator('[data-ac-motion-ticker-item]');
  const held = await item.textContent();
  await page.waitForTimeout(4500);
  expect(await item.textContent()).toBe(held);
});

test('reduced motion holds the ticker but does not remove the function', async ({ page }) => {
  await withReducedMotion(page);

  const button = page.locator('[data-ac-motion-ticker-toggle]');
  await expect(button).toHaveText('Play');

  // A preference for less motion is not a refusal to be shown any: an explicit
  // press still starts it.
  await button.click();
  await expect(button).toHaveText('Pause');
});

/* --- example 4 · the two knobs -------------------------------------------- */

test('gating the distance keeps the fade; gating the duration removes it', async ({ page }) => {
  await page.locator('.ac-switch__track').click();
  await page.locator('[data-ac-motion-replay]').click();

  const distance = page.locator('.ac-motion-reveal--distance');
  const duration = page.locator('.ac-motion-reveal--duration');

  // Same reduced-motion state, two different answers — which is the whole
  // argument that "reduced" and "removed" are not the same word.
  await expect(distance).toHaveCSS('animation-duration', '0.32s');
  await expect(duration).toHaveCSS('animation-duration', '0s');
});

test('both reveals end readable, whichever knob was used', async ({ page }) => {
  await page.locator('[data-ac-motion-replay]').click();
  await page.waitForTimeout(500);

  for (const panel of await page.locator('[data-ac-motion-reveal]').all()) {
    await expect(panel).toBeVisible();
    await expect(panel).toHaveCSS('opacity', '1');
  }
});

/* --- example 5 · broken on purpose ---------------------------------------- */

test('the override beats the media query, and the readout says so', async ({ page }) => {
  await withReducedMotion(page);

  expect(await gate(page)).toBe('0');

  await page.locator('[data-ac-motion-force]').click();

  // Same specificity as the rule inside the media query, declared after it.
  expect(await gate(page)).toBe('1');
  await expect(page.locator('[data-ac-motion-out="attr"]')).toHaveText('on');

  const verdict = page.locator('[data-ac-motion-verdict]');
  await expect(verdict).toHaveText(/should not be/);
  await expect(verdict).toHaveAttribute('data-ac-motion-wrong', 'true');
});

test('forcing it loses the preference it overruled', async ({ page }) => {
  const box = page.locator('[data-ac-motion-input]');

  await page.locator('.ac-switch__track').click();
  await expect(box).toBeChecked();

  await page.locator('[data-ac-motion-force]').click();
  expect(await page.locator(SCOPE).getAttribute('data-motion')).toBe('on');
  // The cost of the third state, and the reason Restore cannot undo it: with
  // data-motion="on" the page is not reducing anything, so the toggle is
  // honestly unchecked and the reader's earlier answer is simply gone.
  await expect(box).not.toBeChecked();

  await page.locator('[data-ac-motion-restore]').click();
  expect(await page.$eval(SCOPE, (el) => el.hasAttribute('data-motion'))).toBe(false);
  expect(await gate(page)).toBe('1');
});

test('restore returns an OS preference that the override was hiding', async ({ page }) => {
  await withReducedMotion(page);

  await page.locator('[data-ac-motion-force]').click();
  expect(await gate(page)).toBe('1');

  await page.locator('[data-ac-motion-restore]').click();
  expect(await gate(page)).toBe('0');
  await expect(page.locator('[data-ac-motion-input]')).toBeChecked();
});

test('a control written to by something else stays honest', async ({ page }) => {
  const box = page.locator('[data-ac-motion-input]');

  // Not the button — anything at all. A server-rendered value, a second toggle.
  await page.$eval(SCOPE, (el) => el.setAttribute('data-motion', 'off'));

  await expect(box).toBeChecked();
  await expect(page.locator('[data-ac-motion-out="resolved"]')).toHaveText('0');
});

/* --- shared contract ------------------------------------------------------ */

test('the factory is idempotent and destroy() is its inverse', async ({ page }) => {
  const result = await page.evaluate(() => {
    const el = document.querySelector('[data-ac-motion]');
    const first = window.AC.createMotionPreferences(el);
    const second = window.AC.createMotionPreferences(el);
    const same = first === second;

    first.set(true);
    const off = el.getAttribute('data-motion');

    first.destroy();
    const gone = el._acMotion === undefined;

    return { same, off, gone, verdict: document.querySelector('[data-ac-motion-verdict]').textContent };
  });

  expect(result.same).toBe(true);
  expect(result.off).toBe('off');
  expect(result.gone).toBe(true);
  expect(result.verdict).toBe('');
});

test('every control clears the 24px target floor', async ({ page }) => {
  const targets = [
    '.ac-switch',
    '[data-ac-motion-ticker-toggle]',
    '[data-ac-motion-replay]',
    '[data-ac-motion-force]',
    '[data-ac-motion-restore]',
  ];

  for (const selector of targets) {
    const box = await page.locator(selector).first().boundingBox();
    expect(box.width, selector).toBeGreaterThanOrEqual(24);
    expect(box.height, selector).toBeGreaterThanOrEqual(24);
  }
});

test('nothing scrolls sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(PAGE);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

/* --- forced colors -------------------------------------------------------- */

test('the disc keeps an edge when its gradient is discarded', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto(PAGE);

  const border = await page
    .locator('.ac-motion-disc')
    .evaluate((el) => getComputedStyle(el).borderTopColor);
  expect(border).not.toBe('rgba(0, 0, 0, 0)');
});

test('the switch still shows two states in forced colors', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto(PAGE);

  const track = page.locator('.ac-switch__track');
  const off = await track.evaluate((el) => getComputedStyle(el).backgroundColor);

  await track.click();
  const on = await track.evaluate((el) => getComputedStyle(el).backgroundColor);

  expect(on).not.toBe(off);
});

test('the wrong-state verdict is words, not only a color', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.goto(PAGE);

  await page.locator('[data-ac-motion-force]').click();

  // The pink is gone here, so the sentence is all that is left carrying it.
  await expect(page.locator('[data-ac-motion-verdict]')).toHaveText(
    /Your system asked for reduced motion and example 5 is overruling it/,
  );
});
