import { test, expect } from '@playwright/test';

const PAGE = 'components/chip-toggle/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* Every claim on this page is about which attribute carries the pressed state
   and what a reader has left when the color is taken away, so that is what is
   asserted here — the role, the state, the accessible name, and the computed
   styles in both color modes. */

/* --- example 1 · the specimen --------------------------------------------- */

test('the row is a named group of toggle buttons', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Filter the crate' });
  await expect(group).toBeVisible();

  // Not checkboxes: a toggle button carries aria-pressed and submits nothing.
  await expect(group.getByRole('button')).toHaveCount(4);
  await expect(group.getByRole('button', { name: 'Live', pressed: false })).toBeVisible();
});

test('pressing a chip flips aria-pressed, keeps the name, and reports the result', async ({
  page,
}) => {
  const live = page.getByRole('button', { name: 'Live', exact: true });
  const status = page.locator('[data-ac-ct-result]');

  await expect(status).toHaveText('462 records · no filters');

  await live.click();
  await expect(live).toHaveAttribute('aria-pressed', 'true');
  // Announcing the state does not entitle you to rename the control.
  await expect(live).toHaveAccessibleName('Live');
  await expect(status).toHaveText('99 records · Live');

  await page.getByRole('button', { name: 'B-side', exact: true }).click();
  await expect(status).toHaveText('240 records · Live, B-side');

  await live.click();
  await expect(live).toHaveAttribute('aria-pressed', 'false');
  await expect(status).toHaveText('141 records · B-side');
});

test('aria-pressed is on every chip before anything is pressed', async ({ page }) => {
  // An attribute that only appears once the chip is down is a control that
  // appears mid-page. Absent and "false" are not the same thing.
  const missing = await page
    .locator('[data-ac-chip]')
    .evaluateAll((els) =>
      els.filter((el) => el.getAttribute('aria-pressed') === null).map((el) => el.textContent.trim()),
    );
  expect(missing).toEqual([]);
});

test('Enter and Space toggle it, with no key handler in the component', async ({ page }) => {
  const live = page.getByRole('button', { name: 'Live', exact: true });

  await live.focus();
  await page.keyboard.press('Space');
  await expect(live).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Enter');
  await expect(live).toHaveAttribute('aria-pressed', 'false');
});

/* --- example 2 · pressed is not a color ----------------------------------- */

const cue = (key) => `[data-ac-ct-cue="${key}"]`;

test('the fill-only chip changes one thing and the specimen changes three', async ({ page }) => {
  await page.locator(cue('flat')).click();
  await page.locator(cue('tick')).click();

  await expect(page.locator('[data-ac-ct-out="flat-cues"]')).toHaveText('fill');
  await expect(page.locator('[data-ac-ct-out="flat-cues"]')).toHaveAttribute(
    'data-ac-ct-bad',
    'true',
  );

  await expect(page.locator('[data-ac-ct-out="tick-cues"]')).toHaveText('fill, border, tick');
  await expect(page.locator('[data-ac-ct-out="tick-cues"]')).not.toHaveAttribute(
    'data-ac-ct-bad',
    /.*/,
  );
});

test('a tick written as a character lands in the accessible name', async ({ page }) => {
  const glyph = page.locator(cue('glyph'));
  await expect(glyph).toHaveAccessibleName('Matinee');

  await glyph.click();
  // accname folds ::before and ::after into the name of anything named from
  // its contents, so the well-meaning fix for SC 1.4.1 renames the control.
  await expect(glyph).toHaveAccessibleName('✓ Matinee');
  await expect(page.locator('[data-ac-ct-out="glyph-name"]')).toHaveText('✓ Matinee');

  const drawn = page.locator(cue('tick'));
  await drawn.click();
  // The drawn tick contributes an empty string and is invisible to the name.
  await expect(drawn).toHaveAccessibleName('All ages');
});

test('the tick reserves its box, so a chip is the same width up and down', async ({ page }) => {
  const chip = page.locator(cue('tick'));
  const width = () => chip.evaluate((el) => Math.round(el.getBoundingClientRect().width));

  const before = await width();
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  expect(await width()).toBe(before);
});

test.describe('under forced colors', () => {
  test.beforeEach(async ({ page }) => {
    // emulateMedia, never test.use({ forcedColors }) — the latter is accepted
    // and silently ignored in this setup. reducedMotion goes with it: a color
    // read straight after the flip otherwise catches the 150ms transition
    // part way and reports a value neither state ever has.
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.reload();
  });

  test('the specimen keeps a pressed state and the fill-only chip has none', async ({ page }) => {
    // Everything a person could see, and nothing they could not: the fill-only
    // chip's ::before is display: none, so its visibility is not a difference.
    const read = (key) =>
      page.locator(cue(key)).evaluate((el) => {
        const s = getComputedStyle(el);
        const b = getComputedStyle(el, '::before');
        const tick = b.display !== 'none' && b.visibility === 'visible';
        return [s.backgroundColor, s.borderTopColor, s.color, tick].join('|');
      });

    const flatUp = await read('flat');
    const tickUp = await read('tick');

    await page.locator(cue('flat')).click();
    await page.locator(cue('tick')).click();

    // A color-mix is not a system color, so the fill is replaced wholesale and
    // the chip that had nothing else has nothing at all.
    expect(await read('flat')).toBe(flatUp);
    expect(await read('tick')).not.toBe(tickUp);
  });

  test('the tick is drawn from a border on currentColor, so it survives', async ({ page }) => {
    const tick = page.locator(cue('tick'));
    const mark = () =>
      tick.evaluate((el) => {
        const b = getComputedStyle(el, '::before');
        return { visibility: b.visibility, border: b.borderBottomColor };
      });

    expect((await mark()).visibility).toBe('hidden');
    await tick.click();

    const after = await mark();
    expect(after.visibility).toBe('visible');
    // Not transparent, not dropped: it is whatever the system made the label.
    expect(after.border).not.toBe('rgba(0, 0, 0, 0)');
    expect(after.border).toBe(await tick.evaluate((el) => getComputedStyle(el).color));
  });
});

/* --- example 3 · the name has to stay still -------------------------------- */

test('the renaming chip says its state twice and the other says it once', async ({ page }) => {
  const swap = page.locator('[data-ac-ct-name="swap"]');
  const keep = page.locator('[data-ac-ct-name="keep"]');

  await expect(swap).toHaveAccessibleName('Follow');
  await swap.click();
  await expect(swap).toHaveAccessibleName('Following');
  await expect(swap).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-ac-ct-out="swap-on"]')).toHaveText('Following · true');
  await expect(page.locator('[data-ac-ct-names-verdict]')).toHaveText(/say it twice/);

  // A voice-control user who said "click Follow" a second ago now finds one
  // control, not two (SC 2.5.3).
  await expect(page.getByRole('button', { name: 'Follow', exact: true })).toHaveCount(1);

  await keep.click();
  await expect(keep).toHaveAccessibleName('Follow');
  await expect(keep).toHaveAttribute('aria-pressed', 'true');
});

/* --- example 4 · toggle button, checkbox, or switch ----------------------- */

test('the three chips expose three different roles and states', async ({ page }) => {
  const form = page.locator('[data-ac-ct-form]');

  await expect(form.getByRole('button', { name: 'Split', pressed: false })).toBeVisible();
  await expect(form.getByRole('checkbox', { name: '7-inch', checked: false })).toBeVisible();
  await expect(form.getByRole('switch', { name: 'In stock', checked: false })).toBeVisible();

  // Never both spellings on one control.
  await expect(form.getByRole('switch')).not.toHaveAttribute('aria-pressed', /.*/);
  await expect(form.getByRole('button', { name: 'Split' })).not.toHaveAttribute(
    'aria-checked',
    /.*/,
  );
});

test('all three chips look on when they are on', async ({ page }) => {
  const tick = (locator) =>
    locator.evaluate((el) => getComputedStyle(el, '::before').visibility);

  const split = page.locator('[data-ac-ct-form] [data-ac-chip]');
  const box = page.locator('.ac-chip--check');
  const sw = page.locator('[data-ac-chip-switch]');

  for (const el of [split, box, sw]) expect(await tick(el)).toBe('hidden');

  await split.click();
  await page.getByRole('checkbox', { name: '7-inch' }).check();
  await sw.click();

  // aria-pressed and aria-checked are two spellings of one look, or the switch
  // is on and does not say so.
  for (const el of [split, box, sw]) expect(await tick(el)).toBe('visible');
});

test('only the checkbox has a value to submit', async ({ page }) => {
  const data = page.locator('[data-ac-ct-out="what-data"]');

  await page.locator('[data-ac-ct-form] [data-ac-chip]').click();
  await page.locator('[data-ac-chip-switch]').click();
  await page.locator('[data-ac-ct-ask]').click();
  await expect(data).toHaveText('nothing');

  await page.getByRole('checkbox', { name: '7-inch' }).check();
  await page.locator('[data-ac-ct-ask]').click();
  await expect(data).toHaveText('format=7-inch');
});

test('the checkbox chip keeps a real tab stop and shows the ring on the chip', async ({ page }) => {
  const input = page.locator('.ac-chip__input');
  // Transparent, never hidden: display: none or visibility: hidden takes the
  // tab stop with it.
  await expect(input).toHaveCSS('opacity', '0');

  await page.locator('[data-ac-ct-form] [data-ac-chip]').focus();
  await page.keyboard.press('Tab');
  await expect(input).toBeFocused();
  await expect(page.locator('.ac-chip--check')).toHaveCSS('outline-width', '3px');

  await page.keyboard.press('Space');
  await expect(input).toBeChecked();
});

/* --- example 5 · a row of chips is a row of tab stops ---------------------- */

test('the plain row is five tab stops and the toolbar is one', async ({ page }) => {
  await expect(page.locator('[data-ac-ct-out="plain-stops"]')).toHaveText('5');
  await expect(page.locator('[data-ac-ct-out="bar-stops"]')).toHaveText('1');

  const toolbar = page.getByRole('toolbar', { name: 'Format — toolbar' });
  await expect(toolbar).toBeVisible();
  expect(
    await toolbar.locator('[data-ac-chip]').evaluateAll((els) => els.map((el) => el.tabIndex)),
  ).toEqual([0, -1, -1, -1, -1]);
});

test('the toolbar moves on the arrows, wraps, and still toggles on Space', async ({ page }) => {
  const toolbar = page.getByRole('toolbar', { name: 'Format — toolbar' });
  const chips = toolbar.locator('[data-ac-chip]');

  await chips.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(chips.nth(1)).toBeFocused();

  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(chips.nth(4)).toBeFocused();

  await page.keyboard.press('Home');
  await expect(chips.first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(chips.nth(4)).toBeFocused();

  // Roving tabindex follows focus, or Tab would return to a chip nobody left.
  await expect(chips.nth(4)).toHaveAttribute('tabindex', '0');
  await expect(chips.first()).toHaveAttribute('tabindex', '-1');

  await page.keyboard.press('Space');
  await expect(chips.nth(4)).toHaveAttribute('aria-pressed', 'true');
});

/* --- the shared obligations ----------------------------------------------- */

test('the color transition is gated on the motion token', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('[data-ac-ct-cue="tick"]')
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(new Set(duration.split(', '))).toEqual(new Set(['0s']));

  // And the state still arrives, because it was never the animation.
  await page.locator('[data-ac-ct-cue="tick"]').click();
  await expect(page.locator('[data-ac-ct-cue="tick"]')).toHaveAttribute('aria-pressed', 'true');
});

test('every chip clears 24x24', async ({ page }) => {
  const short = await page.locator('.ac-chip').evaluateAll((els) =>
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

test('nothing steals focus on load', async ({ page }) => {
  expect(await page.evaluate(() => document.activeElement.tagName)).toBe('BODY');
});

test('the factory is idempotent and destroy clears what it wrote', async ({ page }) => {
  await page.locator('[data-ac-ct-cue="flat"]').click();
  await expect(page.locator('[data-ac-ct-out="flat-cues"]')).toHaveText('fill');

  const same = await page.evaluate(() => {
    const root = document.querySelector('[data-ac-chip-toggle]');
    return window.AC.createChipToggle(root) === window.AC.createChipToggle(root);
  });
  expect(same).toBe(true);

  await page.evaluate(() => {
    window.AC.createChipToggle(document.querySelector('[data-ac-chip-toggle]')).destroy();
  });

  await expect(page.locator('[data-ac-ct-cue="flat"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-ac-ct-out="flat-cues"]')).toHaveText('—');
  await expect(page.locator('[data-ac-ct-result]')).toHaveText('462 records · no filters');
  // The roving tabindex is the factory's, so it goes back too.
  await expect(
    page.getByRole('toolbar', { name: 'Format — toolbar' }).locator('[data-ac-chip]').nth(2),
  ).not.toHaveAttribute('tabindex', /.*/);
});
