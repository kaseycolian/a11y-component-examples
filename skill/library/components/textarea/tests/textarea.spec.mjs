import { test, expect } from '@playwright/test';

const PAGE = 'components/textarea/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// Assert the contract from docs/component-specs.md -- not merely that the thing
// rendered. Most of what can go wrong here is announcement timing and the resize
// handle, so that is what most of these cover.

/* --- example 1 · baseline textarea ----------------------------------------- */

test('every textarea is labeled, and the first one is described', async ({ page }) => {
  await expect(page.locator('#ac-ta-notes')).toHaveAccessibleName('Notes');
  await expect(page.locator('#ac-ta-notes')).toHaveAccessibleDescription(/Markdown is fine/);

  const fields = page.locator('.ac-textarea');
  const count = await fields.count();
  for (let i = 0; i < count; i++) {
    const name = await fields.nth(i).evaluate((el) => {
      const label = el.labels && el.labels[0];
      return label ? label.textContent.trim() : el.getAttribute('aria-label');
    });
    expect(name, `textarea ${i} has no label`).toBeTruthy();
  }
});

test('resize is vertical, never none', async ({ page }) => {
  // none is the common "design" choice, and it leaves a long value readable only
  // through a four-line window -- the SC 1.4.4 reflow problem.
  const resize = await page.locator('#ac-ta-notes').evaluate((el) => getComputedStyle(el).resize);
  expect(resize).toBe('vertical');
});

test('the font is inherited rather than dropping to the UA default', async ({ page }) => {
  const { size, family } = await page.locator('#ac-ta-notes').evaluate((el) => ({
    size: parseFloat(getComputedStyle(el).fontSize),
    family: getComputedStyle(el).fontFamily,
  }));
  // An unstyled textarea lands at 13px monospace, which also defeats a page-level
  // font-size preference.
  expect(size).toBeGreaterThan(13);
  expect(family).not.toMatch(/^monospace$/);
});

/* --- example 2 · the counter ---------------------------------------------- */

test('the limit is stated up front, in the described hint', async ({ page }) => {
  // Not only in the counter: someone has to know the limit before they hit it.
  await expect(page.locator('#ac-ta-bio')).toHaveAccessibleDescription(/Up to 462 characters/);
});

test('the visible count updates per keystroke and is hidden from screen readers', async ({
  page,
}) => {
  const field = page.locator('#ac-ta-bio');
  const count = page.locator('[data-ac-count]');

  await expect(count).toHaveAttribute('aria-hidden', 'true');
  const before = await count.textContent();

  await field.click();
  await field.press('a');
  await expect(count).not.toHaveText(before);
  await expect(count).toHaveText(/\/ 462$/);
});

test('the live region stays silent while there is room left', async ({ page }) => {
  const field = page.locator('#ac-ta-bio');
  const status = page.locator('[data-ac-count-status]');

  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveText('');

  await field.click();
  await field.pressSequentially(' a few words', { delay: 20 });

  // Well inside the limit, so there is nothing worth interrupting for -- even
  // after the idle delay has passed.
  await page.waitForTimeout(1300);
  await expect(status).toHaveText('');
});

test('the live region speaks on a pause, near the limit', async ({ page }) => {
  const status = page.locator('[data-ac-count-status]');

  await page.locator('#ac-ta-bio').evaluate((el) => {
    el.value = 'x'.repeat(450);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Nothing yet: the announcement waits for the typing to stop.
  await expect(status).toHaveText('');
  await expect(status).toHaveText('12 characters left.', { timeout: 3000 });
});

test('going over is reported, not silently truncated', async ({ page }) => {
  const field = page.locator('#ac-ta-bio');
  const status = page.locator('[data-ac-count-status]');
  const count = page.locator('[data-ac-count]');

  // No maxlength: a hard stop swallows keystrokes and says nothing (SC 3.3.1).
  expect(await field.getAttribute('maxlength')).toBeNull();

  await field.evaluate((el) => {
    el.value = 'x'.repeat(470);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  expect(await field.inputValue()).toHaveLength(470);
  await expect(count).toHaveText('8 over');
  await expect(count).toHaveAttribute('data-ac-over', 'true');
  // aria-invalid, so the styling cannot disagree with what is announced.
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(status).toHaveText('Over the limit by 8 characters.', { timeout: 3000 });
});

test('over the limit is not signaled by color alone', async ({ page }) => {
  const field = page.locator('#ac-ta-bio');

  const before = await field.evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));
  await field.evaluate((el) => {
    el.value = 'x'.repeat(470);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Border width, plus the word "over" in the counter, plus the announcement.
  const after = await field.evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));
  expect(after).toBeGreaterThan(before);
  await expect(page.locator('[data-ac-count]')).toHaveText(/over/);
});

test('dropping back under the limit clears the state and the announcement', async ({ page }) => {
  const field = page.locator('#ac-ta-bio');

  await field.evaluate((el) => {
    el.value = 'x'.repeat(470);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(field).toHaveAttribute('aria-invalid', 'true');

  await field.evaluate((el) => {
    el.value = 'x'.repeat(10);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  expect(await field.getAttribute('aria-invalid')).toBeNull();
  await expect(page.locator('[data-ac-count-status]')).toHaveText('', { timeout: 3000 });
});

/* --- example 3 · autogrow ------------------------------------------------- */

test('the height follows the content', async ({ page }) => {
  const field = page.locator('#ac-ta-reply');

  const before = (await field.boundingBox()).height;
  await field.click();
  await field.pressSequentially('\nline\nline\nline\nline', { delay: 10 });

  expect((await field.boundingBox()).height).toBeGreaterThan(before);
});

test('deleting text shrinks it back', async ({ page }) => {
  const field = page.locator('#ac-ta-reply');

  await field.evaluate((el) => {
    el.value = 'a\nb\nc\nd\ne\nf';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const tall = (await field.boundingBox()).height;

  await field.evaluate((el) => {
    el.value = 'a';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // Requires collapsing the height before reading scrollHeight; without that a
  // textarea can only ever grow.
  expect((await field.boundingBox()).height).toBeLessThan(tall);
});

test('growth is capped so a long value scrolls instead of running off the page', async ({
  page,
}) => {
  const field = page.locator('#ac-ta-reply');

  await field.evaluate((el) => {
    el.value = Array.from({ length: 99 }, (_, i) => 'line ' + i).join('\n');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const { height, max, scrolls } = await field.evaluate((el) => ({
    height: el.getBoundingClientRect().height,
    max: parseFloat(getComputedStyle(el).maxHeight),
    scrolls: el.scrollHeight > el.clientHeight,
  }));

  expect(height).toBeLessThanOrEqual(max + 1);
  expect(scrolls).toBe(true);
});

test('a height the user set by hand is not overruled', async ({ page }) => {
  const field = page.locator('#ac-ta-reply');

  // Standing in for a drag of the resize handle, which is what the observer is
  // there to notice.
  await field.evaluate((el) => {
    el.style.height = '260px';
  });
  await page.waitForTimeout(150);

  await field.evaluate((el) => {
    el.value = 'a';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Still theirs: growing back over a chosen size is the component arguing with
  // the person using it.
  expect(await field.evaluate((el) => el.style.height)).toBe('260px');
});

/* --- example 4 · invalid -------------------------------------------------- */

test('a server-rendered error is described alongside the hint', async ({ page }) => {
  const field = page.locator('#ac-ta-why');

  await expect(field).toHaveAttribute('aria-invalid', 'true');
  // aria-describedby is a space-separated list: both, in order.
  await expect(field).toHaveAccessibleDescription(/Two sentences[\s\S]*not a summary/);
  await expect(page.locator('#ac-ta-why-error')).toHaveAttribute('role', 'alert');
});

/* --- example 5 · read-only vs disabled ------------------------------------ */

test('read-only stays focusable and keeps its resize handle', async ({ page }) => {
  const field = page.locator('#ac-ta-log');

  await expect(field).toHaveAttribute('readonly', '');
  await field.focus();
  await expect(field).toBeFocused();
  // A long read-only value is exactly the case someone needs more lines for.
  expect(await field.evaluate((el) => getComputedStyle(el).resize)).toBe('vertical');
});

test('read-only is visually distinct from editable in a light theme too', async ({ page }) => {
  const read = (selector) =>
    page.locator(selector).evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.backgroundColor, s.borderTopStyle].join('|');
    });

  for (const theme of ['rink-classic-light', 'rink-classic-dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);

    // In the light themes --bg-elevated and --bg-panel are both white, which is
    // why the tint is mixed from the text color instead.
    expect(await read('#ac-ta-log'), `theme ${theme}`).not.toBe(await read('#ac-ta-notes'));
  }
});

test('disabled drops the resize handle rather than advertising a dead control', async ({ page }) => {
  const field = page.locator('#ac-ta-legacy');

  await expect(field).toBeDisabled();
  expect(await field.evaluate((el) => getComputedStyle(el).resize)).toBe('none');
});

/* --- shared --------------------------------------------------------------- */

test('createTextarea is idempotent and destroy undoes its wiring', async ({ page }) => {
  const result = await page.evaluate(() => {
    const root = document.querySelector('#ac-ta-bio').closest('[data-ac-textarea]');
    const field = document.querySelector('#ac-ta-bio');

    const same = window.AC.createTextarea(root) === root._acTextarea;
    field.value = 'x'.repeat(470);
    root._acTextarea.refresh();
    const invalidWhileOver = field.getAttribute('aria-invalid');

    root._acTextarea.destroy();
    return {
      same,
      invalidWhileOver,
      invalidAfter: field.getAttribute('aria-invalid'),
      count: document.querySelector('[data-ac-count]').textContent,
      gone: !root._acTextarea,
    };
  });

  expect(result.same).toBe(true);
  // refresh() exists because setting .value from code fires no input event.
  expect(result.invalidWhileOver).toBe('true');
  expect(result.invalidAfter).toBeNull();
  expect(result.count).toBe('');
  expect(result.gone).toBe(true);
});

test('every textarea clears the 24x24 target floor', async ({ page }) => {
  const fields = page.locator('.ac-textarea');
  const count = await fields.count();

  for (let i = 0; i < count; i++) {
    const box = await fields.nth(i).boundingBox();
    expect(box.width, `textarea ${i} width`).toBeGreaterThanOrEqual(24);
    expect(box.height, `textarea ${i} height`).toBeGreaterThanOrEqual(24);
  }
});

test('motion is gated, so reduced motion means no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('#ac-ta-notes')
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(duration.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});

test('nothing overflows sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.reload();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
