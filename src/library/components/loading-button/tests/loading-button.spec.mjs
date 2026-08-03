import { test, expect } from '@playwright/test';

const PAGE = 'components/loading-button/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* Everything worth testing here is a claim that a pending state was reported.
   The spinner is the part you can see and the part that says nothing, so each
   test below asserts on what assistive tech has instead: the attribute, the
   region, the name, and where focus ended up. */

const run = (key) => `[data-ac-lb-run="${key}"]`;

/* --- example 1 · the specimen --------------------------------------------- */

test('the busy state is aria-busy, a status message, and the same name throughout', async ({
  page,
}) => {
  const btn = page.locator(run('one'));
  const status = page.locator('[data-ac-lb-status="one"]');

  await expect(btn).toHaveAccessibleName('Save changes');
  await expect(btn).not.toHaveAttribute('aria-busy', /.*/);
  await expect(status).toHaveText('');

  await btn.click();
  await expect(btn).toHaveAttribute('aria-busy', 'true');
  // Announcing the state does not entitle you to rename the control.
  await expect(btn).toHaveAccessibleName('Save changes');
  await expect(status).toHaveText('Saving…');

  await expect(status).toHaveText('Changes saved.');
  await expect(btn).not.toHaveAttribute('aria-busy', /.*/);
  await expect(btn).toHaveAccessibleName('Save changes');
});

test('the spinner is drawn by aria-busy and stays out of the name', async ({ page }) => {
  const btn = page.locator(run('one'));
  const spinner = btn.locator('.ac-btn-loading__spinner');

  await expect(spinner).toHaveAttribute('aria-hidden', 'true');
  // visibility, not display: the box is reserved either way, so the button
  // cannot change width under the pointer that just pressed it.
  const idle = await spinner.evaluate((el) => getComputedStyle(el).visibility);
  expect(idle).toBe('hidden');

  const width = (el) => el.evaluate((node) => Math.round(node.getBoundingClientRect().width));
  const before = await width(btn);

  await btn.click();
  await expect(spinner).toHaveCSS('visibility', 'visible');
  expect(await width(btn)).toBe(before);
});

test('a second press while busy is blocked, and the button keeps its tab stop', async ({ page }) => {
  const btn = page.locator(run('one'));

  await btn.click();
  await expect(btn).toHaveAttribute('aria-disabled', 'true');
  // aria-disabled is an announcement, never an enforcement, so the element is
  // still focusable — that is the whole reason it is used here.
  expect(await btn.evaluate((el) => el.disabled)).toBe(false);
  expect(await btn.evaluate((el) => el.tabIndex)).toBeGreaterThanOrEqual(0);

  // Playwright honors aria-disabled in its actionability checks, so this needs
  // force. The preventDefault in the capture guard is what is being asserted.
  await btn.click({ force: true });
  await expect(page.locator('[data-ac-lb-status="one"]')).toHaveText('Saving…');
});

/* --- example 2 · a spinner is silent -------------------------------------- */

test('the muted button animates and reports nothing', async ({ page }) => {
  const muted = page.locator(run('mute'));
  const spinner = muted.locator('.ac-btn-loading__spinner');

  await muted.click();
  // It looks exactly like the working one.
  await expect(spinner).toHaveCSS('visibility', 'visible');

  // And has nothing at all to announce.
  await expect(muted).not.toHaveAttribute('aria-busy', /.*/);
  await expect(page.locator('[data-ac-lb-out="mute-busy"]')).toHaveText('absent');
  await expect(page.locator('[data-ac-lb-out="mute-said"]')).toHaveText('no region');
  await expect(page.locator('[data-ac-lb-out="mute-busy"]')).toHaveAttribute(
    'data-ac-lb-bad',
    'true',
  );

  // Its name never changed either, so there is no signal anywhere.
  await expect(page.locator('[data-ac-lb-out="mute-name"]')).toHaveText('Save');
});

test('the working button next to it reports all three', async ({ page }) => {
  await page.locator(run('said')).click();

  await expect(page.locator('[data-ac-lb-out="said-busy"]')).toHaveText('true');
  await expect(page.locator('[data-ac-lb-out="said-busy"]')).not.toHaveAttribute(
    'data-ac-lb-bad',
    /.*/,
  );
  await expect(page.locator('[data-ac-lb-status="said"]')).toHaveText('Saving…');
});

/* --- example 3 · never disabled while loading ----------------------------- */

test('disabled drops focus to the document body', async ({ page }) => {
  await page.locator(run('hard')).click();

  await expect(page.locator('[data-ac-lb-out="hard-focus"]')).toHaveText('the document body');
  await expect(page.locator('[data-ac-lb-out="hard-focus"]')).toHaveAttribute(
    'data-ac-lb-bad',
    'true',
  );
  expect(await page.evaluate(() => document.activeElement.tagName)).toBe('BODY');

  await expect(page.locator('[data-ac-lb-focus-verdict]')).toHaveText(/dropped to the top/);
});

test('aria-disabled keeps focus on the button that was pressed', async ({ page }) => {
  const btn = page.locator(run('soft'));
  await btn.click();

  await expect(page.locator('[data-ac-lb-out="soft-focus"]')).toHaveText('"Save"');
  await expect(btn).toBeFocused();
  await expect(page.locator('[data-ac-lb-status="soft"]')).toHaveText('Saving…');
});

/* --- example 4 · the name has to stay still -------------------------------- */

test('the renaming button ends up with three names and the other with one', async ({ page }) => {
  const swap = page.locator(run('swap'));
  const keep = page.locator(run('keep'));

  await expect(swap).toHaveAccessibleName('Save');
  await swap.click();
  await expect(swap).toHaveAccessibleName('Saving…');
  await expect(swap).toHaveAccessibleName('Saved');

  await expect(page.locator('[data-ac-lb-out="swap-idle"]')).toHaveText('Save');
  await expect(page.locator('[data-ac-lb-out="swap-busy"]')).toHaveText('Saving…');
  await expect(page.locator('[data-ac-lb-out="swap-done"]')).toHaveText('Saved');
  await expect(page.locator('[data-ac-lb-names-verdict]')).toHaveText(/three names/);

  await keep.click();
  await expect(page.locator('[data-ac-lb-status="keep"]')).toHaveText('Saving…');
  await expect(keep).toHaveAccessibleName('Save');
  await expect(page.locator('[data-ac-lb-status="keep"]')).toHaveText('Saved.');
  await expect(keep).toHaveAccessibleName('Save');
});

/* --- example 5 · the spinner is decoration --------------------------------- */

test('with motion off the ring still changes and the dot does not', async ({ page }) => {
  await page.getByLabel('Reduce motion in this panel').check();
  await expect(page.locator('[data-ac-lb-motion]')).toHaveAttribute('data-motion', 'off');

  // The gate has to reach the animation, or nothing below this means anything.
  const spin = await page
    .locator(`${run('ring')} .ac-btn-loading__spinner`)
    .evaluate((el) => getComputedStyle(el).animationDuration);
  expect(spin).toBe('0s');

  await page.locator(run('ring')).click();
  await expect(page.locator('[data-ac-lb-out="ring-busy"]')).toHaveText('visible, still');
  await expect(page.locator('[data-ac-lb-out="ring-idle"]')).toHaveText('hidden');
  await expect(page.locator('[data-ac-lb-status="ring"]')).toHaveText('Saving…');

  await page.locator(run('dot')).click();
  const dotIdle = await page.locator('[data-ac-lb-out="dot-idle"]').innerText();
  const dotBusy = await page.locator('[data-ac-lb-out="dot-busy"]').innerText();
  expect(dotBusy).toBe(dotIdle);

  await expect(page.locator('[data-ac-lb-motion-verdict]')).toHaveText(/identical saving and at rest/);
});

test('with motion on the dot does move, so the failure is the gate and not the markup', async ({
  page,
}) => {
  await page.locator(run('dot')).click();
  await expect(page.locator('[data-ac-lb-out="dot-busy"]')).toHaveText('visible, moving');
  await expect(page.locator('[data-ac-lb-out="dot-idle"]')).toHaveText('visible, still');
});

/* --- the shared obligations ----------------------------------------------- */

test('the spinner animation is gated on the motion token', async ({ page }) => {
  // emulateMedia, never test.use({ reducedMotion }) — the latter is accepted
  // and ignored in this setup, and the test then passes against a page that is
  // still animating.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator(`${run('one')} .ac-btn-loading__spinner`)
    .evaluate((el) => getComputedStyle(el).animationDuration);
  expect(duration).toBe('0s');

  // And the pending state still arrives, because it was never the animation.
  await page.locator(run('one')).click();
  await expect(page.locator(run('one'))).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('[data-ac-lb-status="one"]')).toHaveText('Saving…');
});

test('under forced colors the ring keeps its gap', async ({ page }) => {
  const spinner = page.locator(`${run('one')} .ac-btn-loading__spinner`);
  const read = () =>
    spinner.evaluate((el) => {
      const s = getComputedStyle(el);
      return { top: s.borderTopColor, right: s.borderRightColor };
    });

  const before = await read();
  expect(before.top).toBe('rgba(0, 0, 0, 0)');

  await page.emulateMedia({ forcedColors: 'active' });
  const after = await read();

  // Forced colors hands `transparent` back opaque, so the gap has to be
  // repainted in the button's own system background. A ring with no gap reads
  // as a full circle whether or not it is turning.
  expect(after.top).not.toBe('rgba(0, 0, 0, 0)');
  expect(after.top).not.toBe(after.right);
});

test('every status region exists and is empty before anything happens', async ({ page }) => {
  const regions = page.locator('[role="status"].ac-btn-loading-status');
  expect(await regions.count()).toBeGreaterThan(0);

  for (const text of await regions.allInnerTexts()) {
    expect(text.trim()).toBe('');
  }
});

test('every button clears 24x24', async ({ page }) => {
  const short = await page.locator('.ac-btn-loading').evaluateAll((els) =>
    els
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return Math.round(r.width) < 24 || Math.round(r.height) < 24;
      })
      .map((el) => el.textContent.trim()),
  );
  expect(short).toEqual([]);
});

test('nothing overflows sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the factory is idempotent and destroy clears what it wrote', async ({ page }) => {
  const verdict = page.locator('[data-ac-lb-mirror-verdict]');
  await expect(verdict).not.toHaveText('');

  const same = await page.evaluate(() => {
    const root = document.querySelector('[data-ac-loading-button]');
    return window.AC.createLoadingButton(root) === window.AC.createLoadingButton(root);
  });
  expect(same).toBe(true);

  await page.evaluate(() => {
    window.AC.createLoadingButton(document.querySelector('[data-ac-loading-button]')).destroy();
  });
  await expect(verdict).toHaveText('');
  await expect(page.locator(run('one'))).not.toHaveAttribute('aria-busy', /.*/);
});
