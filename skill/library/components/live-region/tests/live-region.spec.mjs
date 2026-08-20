import { test, expect } from '@playwright/test';

const PAGE = 'components/live-region/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// A live region's whole contract is about *sequence*: the element has to be in
// the tree before the text, and an empty state has to be observed between two
// identical messages. Neither is visible in a snapshot of the DOM, so most of
// this file records mutations as they happen and asserts on the order.
//
// Locators are scoped to `.ac-demo-grid` -- the code panel below the demo
// repeats every class name and every string on this page as source text. The
// selector now matches two grids, the correct examples and the mistakes, so
// anything that needs the grid element itself is queried from the document.
const demo = (page) => page.locator('.ac-demo-grid');

/**
 * Record every textContent an element takes, in order, while `action` runs.
 * Returns the sequence including the value it started with.
 */
async function trace(page, selector, action, settleMs = 400) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    window.__trace = [el.textContent];
    window.__observer = new MutationObserver(() => window.__trace.push(el.textContent));
    window.__observer.observe(el, { childList: true, characterData: true, subtree: true });
  }, selector);

  await action();
  await page.waitForTimeout(settleMs);

  return page.evaluate(() => {
    window.__observer.disconnect();
    return window.__trace;
  });
}

/* --- example 1 · polite and assertive --------------------------------------- */

test('both regions are in the DOM and empty before anything happens', async ({ page }) => {
  // The entire component. A region that arrives with the page is a region a
  // screen reader is already watching.
  for (const id of ['#lr-polite', '#lr-assertive']) {
    const el = demo(page).locator(id);
    await expect(el).toBeAttached();
    await expect(el).toHaveText('');
  }
});

test('the polite region is a status and the loud one is an alert', async ({ page }) => {
  await expect(demo(page).locator('#lr-polite')).toHaveAttribute('role', 'status');
  await expect(demo(page).locator('#lr-assertive')).toHaveAttribute('role', 'alert');

  // role="status" carries aria-live="polite" and aria-atomic="true" implicitly,
  // which is the reason to prefer the role over the bare attribute. Nothing
  // should be hand-writing them on top.
  const extra = await demo(page)
    .locator('#lr-polite')
    .evaluate((el) => [el.getAttribute('aria-live'), el.getAttribute('aria-atomic')]);
  expect(extra).toEqual([null, null]);
});

test('pressing the polite button puts the message in the polite region only', async ({ page }) => {
  await demo(page).getByRole('button', { name: 'Say it politely' }).click();

  await expect(demo(page).locator('#lr-polite')).toHaveText('Changes saved.');
  await expect(demo(page).locator('#lr-assertive')).toHaveText('');
});

test('the alert button writes to the assertive region', async ({ page }) => {
  await demo(page).getByRole('button', { name: 'Interrupt' }).click();
  await expect(demo(page).locator('#lr-assertive')).toHaveText(/99 seconds/);
});

/* --- example 2 · the announcer ---------------------------------------------- */

test('createAnnouncer builds both regions up front and leaves them empty', async ({ page }) => {
  const state = await page.evaluate(() => {
    const a = window.AC.createAnnouncer({ root: document.createElement('div') });
    return {
      politeRole: a.element.getAttribute('role'),
      assertiveRole: a.assertiveElement.getAttribute('role'),
      politeText: a.element.textContent,
      assertiveText: a.assertiveElement.textContent,
      inDom: a.element.parentNode !== null && a.assertiveElement.parentNode !== null,
    };
  });

  expect(state).toEqual({
    politeRole: 'status',
    assertiveRole: 'alert',
    politeText: '',
    assertiveText: '',
    inDom: true,
  });
});

test('createAnnouncer is idempotent, or every message is announced twice', async ({ page }) => {
  const same = await page.evaluate(() => window.AC.createAnnouncer() === window.AC.createAnnouncer());
  expect(same).toBe(true);
});

test("the announcer's regions are off screen but still in the accessibility tree", async ({
  page,
}) => {
  const box = await page
    .locator('body > p[role="status"].ac-lr-clipped')
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { w: r.width, h: r.height, display: s.display, visibility: s.visibility };
    });

  // Clipped, never display:none or visibility:hidden -- both of those take the
  // region out of the tree, and then nothing is watching it.
  expect(box.w).toBeLessThanOrEqual(1);
  expect(box.h).toBeLessThanOrEqual(1);
  expect(box.display).not.toBe('none');
  expect(box.visibility).toBe('visible');
});

test('announce() routes by politeness and clears the other region', async ({ page }) => {
  await demo(page).getByRole('button', { name: 'Fail an upload' }).click();

  // Polled, because announce() writes two frames later on purpose -- reading
  // straight after the click catches the deliberate empty state in between.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const a = window.AC.createAnnouncer();
        return { polite: a.element.textContent, assertive: a.assertiveElement.textContent };
      }),
    )
    .toEqual({ polite: '', assertive: 'Upload failed.' });
});

test('destroy() takes both regions back out of the document', async ({ page }) => {
  const gone = await page.evaluate(() => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const a = window.AC.createAnnouncer({ root });
    a.destroy();
    return { children: root.childElementCount, cached: '_acAnnouncer' in root };
  });
  expect(gone).toEqual({ children: 0, cached: false });
});

/* --- example 3 · a component's own status ----------------------------------- */

test('the visible count moves immediately and the region waits for a pause', async ({ page }) => {
  const field = demo(page).locator('#lr-invites');
  const count = demo(page).locator('[data-ac-invites-count]');
  const status = demo(page).locator('[data-ac-invites-status]');

  await field.fill('7');
  await expect(count).toHaveText('7 invited');
  // Still nothing announced: a region wired to every keystroke reads a stream of
  // numbers over the top of itself.
  await expect(status).toHaveText('');

  await expect(status).toHaveText('7 invited.', { timeout: 3000 });
});

test('the announced message changes at the threshold, so crossing it is news', async ({ page }) => {
  const status = demo(page).locator('[data-ac-invites-status]');
  await demo(page).locator('#lr-invites').fill('21');
  await expect(status).toHaveText(/more than the 20/, { timeout: 3000 });
});

test('the visible count is aria-hidden, because the region already says it', async ({ page }) => {
  await expect(demo(page).locator('[data-ac-invites-count]')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
});

/* --- example 4 · the append-only log ---------------------------------------- */

test('the log is a log, and it accumulates', async ({ page }) => {
  const log = demo(page).locator('#lr-log');
  await expect(log).toHaveAttribute('role', 'log');
  await expect(log).toHaveAccessibleName('Activity');

  const btn = demo(page).getByRole('button', { name: 'Add a line to the log' });
  await btn.click();
  await btn.click();
  await btn.click();

  // Three entries, still all there. A status would hold only the last one.
  await expect(log.locator('li')).toHaveCount(3);
  await expect(log.locator('li').first()).toHaveText('Jordan Lee opened Order 462.');
});

test('a log does not carry aria-atomic, because only the new entry is news', async ({ page }) => {
  await expect(demo(page).locator('#lr-log')).not.toHaveAttribute('aria-atomic', 'true');
});

test('the log is the only region that is a tab stop, because it is the only one that scrolls', async ({
  page,
}) => {
  await expect(demo(page).locator('#lr-log')).toHaveAttribute('tabindex', '0');

  // SC 2.1.1 the other way round: a stop on a region with nothing to do on it
  // is a stop for no benefit.
  const stops = await page.evaluate(
    () => document.querySelectorAll('.ac-demo-grid .ac-lr-region[tabindex]').length,
  );
  expect(stops).toBe(1);
});

/* --- example 5 · three regions that never announce --------------------------- */

test('the injected region arrives with its text already in it', async ({ page }) => {
  // Nothing was watching it, and it never changed. Both halves of the failure.
  await expect(demo(page).locator('.ac-lr-region--broken')).toHaveCount(0);

  await demo(page).getByRole('button', { name: 'Inject a filled region' }).click();

  const injected = demo(page).locator('.ac-lr-region--broken');
  await expect(injected).toHaveAttribute('role', 'status');
  await expect(injected).toHaveText('Report exported.');
});

test('the hidden region has the right text and is not in the tree', async ({ page }) => {
  const region = demo(page).locator('#lr-fail-hidden');
  expect(await region.evaluate((el) => getComputedStyle(el).display)).toBe('none');

  await demo(page).getByRole('button', { name: 'Write to a hidden region' }).click();

  // The text is there. That is the whole problem: the DOM looks correct.
  expect(await region.evaluate((el) => el.textContent)).toBe('Report exported.');
});

test('the same-tick region never reports an empty state between two presses', async ({ page }) => {
  const btn = demo(page).getByRole('button', { name: 'Clear and set in one tick' });
  await btn.click();

  // Second press: cleared and re-set inside one frame. A recorder sees the
  // clear, but the browser reports only the state it last painted -- which is
  // the same text as before, so there is no change to announce.
  const seq = await trace(page, '#lr-fail-sametick', () => btn.click(), 200);
  expect(seq[seq.length - 1]).toBe('Report exported.');
  expect(seq[0]).toBe('Report exported.');
});

test('every failure reports what it left in the DOM', async ({ page }) => {
  for (const [name, id] of [
    ['Inject a filled region', 'inject'],
    ['Write to a hidden region', 'hidden'],
    ['Clear and set in one tick', 'sametick'],
  ]) {
    await demo(page).getByRole('button', { name }).click();
    await expect(demo(page).locator(`[data-ac-fail-mirror="${id}"]`)).toHaveText(
      /Report exported\./,
    );
  }
});

test('the mirrors are aria-hidden, so the page does not read them a second time', async ({
  page,
}) => {
  // Queried from the document rather than through demo(), which now matches two
  // grids -- the correct examples and the mistakes.
  const unhidden = await page.evaluate(
    () =>
      [...document.querySelectorAll('.ac-demo-grid .ac-lr-mirror')].filter(
        (el) => el.getAttribute('aria-hidden') !== 'true',
      ).length,
  );
  expect(unhidden).toBe(0);
});

/* --- example 6 · the Copy button that repeats -------------------------------- */

test('the fixed Copy button empties the region before writing the same words again', async ({
  page,
}) => {
  const btn = demo(page).getByRole('button', { name: 'Copy (re-announces)' });
  await btn.click();
  await expect(demo(page).locator('#lr-repeat')).toHaveText('Copied.');

  const seq = await trace(page, '#lr-repeat', () => btn.click());

  // The empty state between the two identical messages is the announcement.
  expect(seq).toContain('');
  expect(seq[seq.length - 1]).toBe('Copied.');
});

test('the naive Copy button never lets the region be empty, so it is silent', async ({ page }) => {
  const btn = demo(page).getByRole('button', { name: 'Copy (silent on repeat)' });
  await btn.click();
  await expect(demo(page).locator('#lr-repeat')).toHaveText('Copied.');

  const seq = await trace(page, '#lr-repeat', () => btn.click());

  // `textContent = 'Copied.'` does mutate the DOM even when the string is the
  // same -- it drops the old text node and inserts a new one, so a
  // MutationObserver fires. What never happens is the region being *observed
  // empty*, and that absence is the whole bug: the announced value never
  // changed. Asserting on the mutation count would prove the opposite thing.
  expect(seq).not.toContain('');
  expect(seq.every((t) => t === 'Copied.')).toBe(true);
});

/* --- forced colors ---------------------------------------------------------- */

test.describe('in forced colors', () => {
  // page.emulateMedia, not `test.use({ forcedColors: 'active' })`. The context
  // option is accepted and silently does nothing here -- `(forced-colors:
  // active)` still reports false inside the page, so every assertion below would
  // be made against the ordinary stylesheet and would pass for the wrong reason.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
  });

  test('polite and assertive stay apart by border style, not by color', async ({ page }) => {
    const styles = await page.evaluate(() => ({
      polite: getComputedStyle(document.querySelector('#lr-polite')).borderTopStyle,
      loud: getComputedStyle(document.querySelector('#lr-assertive')).borderTopStyle,
    }));

    // The pink of an alert is replaced by the user's palette, so the only cue
    // left has to be one forced colors keeps.
    expect(styles.polite).toBe('dashed');
    expect(styles.loud).toBe('solid');
    expect(styles.polite).not.toBe(styles.loud);
  });

  test('the regions and the buttons take system colors', async ({ page }) => {
    const colors = await page.evaluate(() => {
      const region = getComputedStyle(document.querySelector('#lr-polite'));
      const btn = getComputedStyle(document.querySelector('.ac-lr-btn'));
      return { regionBorder: region.borderTopColor, btnBorder: btn.borderTopColor };
    });

    // Whatever the palette is, these can no longer be the authored purple.
    expect(colors.regionBorder).not.toBe('rgb(128, 100, 192)');
    expect(colors.btnBorder).not.toBe('rgb(128, 100, 192)');
  });
});

/* --- motion, targets, reflow ------------------------------------------------ */

test('what motion there is goes to zero under data-motion="off"', async ({ page }) => {
  const btn = demo(page).locator('.ac-lr-btn').first();
  expect(await btn.evaluate((el) => getComputedStyle(el).transitionDuration)).not.toBe('0s');

  await page.evaluate(() => document.documentElement.setAttribute('data-motion', 'off'));
  expect(await btn.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
});

test('every control on the page is a real target', async ({ page }) => {
  // SC 2.5.8 asks for 24x24.
  // Queried from the document rather than through demo(), which now matches two
  // grids -- the correct examples and the mistakes.
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('.ac-demo-grid button, .ac-demo-grid input')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { name: el.textContent.trim() || el.id, w: r.width, h: r.height };
      })
      .filter((b) => b.w < 24 || b.h < 24),
  );
  expect(small).toEqual([]);
});

test('nothing widens the page at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.reload();

  // SC 1.4.10. The risk is the button rows in examples 1, 2, 4 and 6 and the
  // number field beside its count in example 3.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
