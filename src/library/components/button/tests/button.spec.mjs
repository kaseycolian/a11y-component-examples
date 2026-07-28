import { test, expect } from '@playwright/test';

const PAGE = 'components/button/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* The claims worth testing here are not "it renders a button". They are the
   four failures: the bare button really does submit, the hard-disabled one
   really is unreachable while the soft-disabled one is reachable and blocked,
   the div really has no button role, and the undersized target really is under
   the floor. Each of those is a sentence in docs.md that would otherwise be a
   promise. */

/* --- example 1 · the weights and accents ---------------------------------- */

test('every specimen is a real button with a name from its own text', async ({ page }) => {
  for (const name of ['Solid', 'Outline', 'Ghost', 'Pink', 'Green', 'Blue', 'Purple']) {
    const btn = page.getByRole('button', { name, exact: true });
    await expect(btn).toHaveAccessibleName(name);
    // No ARIA anywhere on this component. A role attribute would be redundant.
    await expect(btn).not.toHaveAttribute('role', /.*/);
  }
});

test('the accent is a custom property the weights read, not twelve rules', async ({ page }) => {
  const solidBg = await page
    .getByRole('button', { name: 'Solid', exact: true })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  const pinkBg = await page
    .getByRole('button', { name: 'Pink', exact: true })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  const greenBg = await page
    .getByRole('button', { name: 'Green', exact: true })
    .evaluate((el) => getComputedStyle(el).backgroundColor);

  // Pink is the default accent, so --solid alone and --solid --pink agree.
  expect(solidBg).toBe(pinkBg);
  expect(greenBg).not.toBe(pinkBg);

  // Outline green takes the same accent through the same property, as its
  // border color rather than its fill.
  const outlineGreen = await page
    .getByRole('button', { name: 'Outline green' })
    .evaluate((el) => getComputedStyle(el).borderTopColor);
  expect(outlineGreen).toBe(greenBg);
});

test('the ring is the same on all three weights and owes nothing to the border', async ({
  page,
}) => {
  const read = (name) =>
    page.getByRole('button', { name, exact: true }).evaluate((el) => {
      el.focus();
      const s = getComputedStyle(el);
      return { width: s.outlineWidth, style: s.outlineStyle, offset: s.outlineOffset };
    });

  const solid = await read('Solid');
  expect(solid).toEqual({ width: '3px', style: 'solid', offset: '2px' });
  expect(await read('Outline')).toEqual(solid);
  // The one that matters: ghost has no border of its own to thicken.
  expect(await read('Ghost')).toEqual(solid);

  const ghostBorder = await page
    .getByRole('button', { name: 'Ghost', exact: true })
    .evaluate((el) => getComputedStyle(el).borderTopColor);
  expect(ghostBorder).toBe('rgba(0, 0, 0, 0)');
});

/* --- example 2 · type is not optional ------------------------------------- */

test('the bare button has no type attribute, and submitting is what it does', async ({ page }) => {
  const bare = page.getByRole('button', { name: 'Add to queue' });
  await expect(bare).not.toHaveAttribute('type', /.*/);

  const log = page.locator('[data-ac-btn-form-log]');
  await expect(log).toHaveAttribute('role', 'status');
  await expect(log).toBeEmpty();

  await bare.click();
  await expect(log).toContainText('The form submitted');
  await expect(log).toContainText('No type attribute means type="submit"');
  await expect(log).toHaveAttribute('data-ac-btn-bad', 'true');
});

test('type="button" runs its own handler and does not submit', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear the queue' }).click();

  const log = page.locator('[data-ac-btn-form-log]');
  await expect(log).toContainText('The form did not submit');
  await expect(log).not.toHaveAttribute('data-ac-btn-bad', /.*/);
});

test('Enter in the field submits through the default button, not the green one', async ({
  page,
}) => {
  await page.getByLabel('Track').press('Enter');

  // event.submitter is NOT null here — the browser nominates the form's default
  // button, the first submit button in DOM order, and on this form that is the
  // bare one. Nobody pressed it. That is the reason implicit submission is
  // worth knowing about at all.
  const log = page.locator('[data-ac-btn-form-log]');
  await expect(log).toContainText('"Add to queue" is what submitted it');
  await expect(log).not.toContainText('Save the set list');
});

/* --- example 3 · disabled versus aria-disabled ---------------------------- */

test('the hard-disabled button is out of the tab order; the soft one is not', async ({ page }) => {
  await expect(page.locator('[data-ac-btn-out="hard"]')).toHaveText('not in the tab order');
  await expect(page.locator('[data-ac-btn-out="soft"]')).toHaveText('reachable');

  // The readout is measured, so assert the underlying fact separately rather
  // than trusting the component's own report of it.
  const hard = page.getByRole('button', { name: 'Print the flyer' });
  await expect(hard).toBeDisabled();

  const soft = page.getByRole('button', { name: 'Publish the set' });
  // Not toBeEnabled(): Playwright treats aria-disabled="true" as disabled, so
  // it cannot be used to prove the control is still focusable. Ask the DOM.
  expect(await soft.evaluate((el) => el.disabled)).toBe(false);
  await soft.focus();
  await expect(soft).toBeFocused();
});

test('measuring focusability does not leave focus behind', async ({ page }) => {
  // The probe in [LOCK] focuses each button to find out whether it can be
  // focused. Restoring with was.focus() alone is not enough — at load `was` is
  // <body> and body.focus() is a no-op in Chrome, so focus stayed parked on
  // the soft-disabled button and Tab continued from the middle of the page.
  const parked = await page.evaluate(() => {
    const el = document.activeElement;
    return el === document.body || el === document.documentElement
      ? null
      : el.tagName + ':' + el.textContent.trim();
  });
  expect(parked).toBeNull();
});

test('the reason is described only on the button that can be reached', async ({ page }) => {
  const soft = page.getByRole('button', { name: 'Publish the set' });
  await expect(soft).toHaveAttribute('aria-describedby', 'ac-btn-lock-why');
  await expect(soft).toHaveAccessibleDescription('Add at least one track before publishing.');

  await expect(page.getByRole('button', { name: 'Print the flyer' })).not.toHaveAttribute(
    'aria-describedby',
    /.*/,
  );
});

test('the guard blocks the soft-disabled click, including from Space', async ({ page }) => {
  const soft = page.getByRole('button', { name: 'Publish the set' });
  const log = page.locator('[data-ac-btn-lock-log]');

  await expect(log).toBeEmpty();

  // force: true because Playwright honors aria-disabled in its actionability
  // checks. The preventDefault in component.js is what this is really about.
  await soft.click({ force: true });
  await expect(log).toContainText('was pressed, and blocked');
  await expect(log).toContainText('kept its tab stop');

  // A native button fires a click for Space, so the same guard covers the
  // keyboard with no key handler of its own.
  await soft.evaluate((el) => el.removeAttribute('data-checked'));
  await log.evaluate((el) => {
    el.textContent = '';
  });
  await soft.focus();
  await page.keyboard.press('Space');
  await expect(log).toContainText('was pressed, and blocked');
});

test('the hard-disabled button dispatches nothing at all', async ({ page }) => {
  const log = page.locator('[data-ac-btn-lock-log]');
  await page.getByRole('button', { name: 'Print the flyer' }).click({ force: true });
  await expect(log).toBeEmpty();
});

/* --- example 4 · not everything that looks like a button is one ------------ */

test('the div is not a button, and the real one is', async ({ page }) => {
  // Both carry the same label text. Exactly one is in the accessibility tree
  // as a button, and that is the whole example.
  await expect(page.getByRole('button', { name: 'Buy tickets' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Buy tickets' })).toHaveJSProperty(
    'tagName',
    'BUTTON',
  );

  const div = page.locator('[data-ac-btn-div]');
  await expect(div).toHaveJSProperty('tagName', 'DIV');
  await expect(div).not.toHaveAttribute('role', /.*/);
  await expect(div).not.toHaveAttribute('tabindex', /.*/);
  expect(await div.evaluate((el) => el.tabIndex)).toBe(-1);
});

test('the div runs from a pointer and from nothing else', async ({ page }) => {
  const log = page.locator('[data-ac-btn-fake-log]');

  await page.locator('[data-ac-btn-div]').click();
  await expect(log).toContainText('The div ran');
  await expect(log).toHaveAttribute('data-ac-btn-bad', 'true');

  // Focus it the only way anything could, and confirm the keyboard still has
  // no route in: it never becomes the active element.
  await page.locator('[data-ac-btn-div]').evaluate((el) => el.focus());
  await expect(page.locator('[data-ac-btn-div]')).not.toBeFocused();
});

test('the link is a link, and Space does not activate it', async ({ page }) => {
  const link = page.getByRole('link', { name: 'Tour dates' });
  await expect(link).toHaveAttribute('href', '#ac-btn-dates');
  await expect(link).not.toHaveAttribute('role', /.*/);

  // Enter follows it and moves focus to the target, which is why the target
  // carries tabindex="-1" (SC 2.4.3).
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#ac-btn-dates')).toBeFocused();
});

/* --- example 5 · target size and the press -------------------------------- */

test('the default and the compact size both clear 24x24; the third does not', async ({ page }) => {
  const box = async (name) =>
    page.getByRole('button', { name, exact: true }).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });

  const big = await box('Doors at 8');
  expect(big.h).toBeGreaterThanOrEqual(44);

  const small = await box('Small');
  expect(small.w).toBeGreaterThanOrEqual(24);
  expect(small.h).toBeGreaterThanOrEqual(24);

  const tiny = await box('Tiny');
  expect(tiny.h).toBeLessThan(24);
});

test('the readout measures rather than claims, and names the failure', async ({ page }) => {
  // Polling: the measurement is taken in a requestAnimationFrame, and any
  // geometry read on something with a motion-gated entrance needs it.
  await expect
    .poll(() => page.locator('[data-ac-btn-out="default"]').textContent())
    .toMatch(/^\d+ × \d+$/);

  await expect(page.locator('[data-ac-btn-out="sm"]')).toHaveText(/^\d+ × \d+$/);
  await expect(page.locator('[data-ac-btn-out="tiny"]')).toHaveText(/^\d+ × \d+$/);

  const verdict = page.locator('[data-ac-btn-sizes-verdict]');
  await expect(verdict).toHaveAttribute('role', 'status');
  await expect(verdict).toContainText('Tiny is under 24×24');
  await expect(verdict).toHaveAttribute('data-ac-btn-bad', 'true');
});

test('the press is gated on the motion token, not hardcoded', async ({ page }) => {
  const readActive = () =>
    page.getByRole('button', { name: 'Solid', exact: true }).evaluate((el) => {
      // :active cannot be forced from script, so read the declaration the way
      // the cascade resolved it instead of trying to produce the state.
      const rule = [...document.styleSheets]
        .flatMap((sheet) => {
          try {
            return [...sheet.cssRules];
          } catch {
            return [];
          }
        })
        .find((r) => r.selectorText === '.ac-btn:active');
      return rule ? rule.style.translate + '|' + rule.style.scale : null;
    });

  const declared = await readActive();
  expect(declared).toContain('--ac-motion');
  expect(declared).toContain('--ac-press-y');
  expect(declared).toContain('--ac-press-s');
});

/* --- reduced motion, forced colors, 320px --------------------------------- */

test.describe('reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    // page.emulateMedia, never test.use({ reducedMotion }) — the latter is
    // accepted here and silently ignored, so the test passes against a page
    // that is still animating.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);
  });

  test('every transition on the button resolves to zero', async ({ page }) => {
    const durations = await page
      .getByRole('button', { name: 'Solid', exact: true })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(durations.split(',').every((d) => d.trim() === '0s')).toBe(true);
  });
});

test.describe('forced colors', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(PAGE);
  });

  test('the ghost weight gets a border, because it has no other cue left', async ({ page }) => {
    const ghost = page.getByRole('button', { name: 'Ghost', exact: true });
    const border = await ghost.evaluate((el) => getComputedStyle(el).borderTopColor);

    // Anything but transparent. Without the forced-colors block a ghost button
    // has no fill and no border here and stops reading as a control.
    expect(border).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('the three weights collapse, which is correct and is why color is never the cue', async ({
    page,
  }) => {
    const fill = (name) =>
      page
        .getByRole('button', { name, exact: true })
        .evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(await fill('Solid')).toBe(await fill('Outline'));
    expect(await fill('Pink')).toBe(await fill('Green'));
  });
});

test.describe('320px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('nothing overflows sideways', async ({ page }) => {
    await page.goto(PAGE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

/* --- the factory ---------------------------------------------------------- */

test('the factory is idempotent and destroy() removes the guard', async ({ page }) => {
  const same = await page.evaluate(() => {
    const el = document.querySelector('[data-ac-button]');
    return AC.createButton(el) === AC.createButton(el);
  });
  expect(same).toBe(true);

  await page.evaluate(() => document.querySelector('[data-ac-button]')._acButton.destroy());

  // With the guard gone the soft-disabled button is no longer blocked. Nothing
  // reports it either, which is the point: the attribute never did the work.
  const log = page.locator('[data-ac-btn-lock-log]');
  await expect(log).toBeEmpty();
  await page.getByRole('button', { name: 'Publish the set' }).click({ force: true });
  await expect(log).toBeEmpty();
});
