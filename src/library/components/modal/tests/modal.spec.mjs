import { test, expect } from '@playwright/test';

const PAGE = 'components/modal/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// The interesting parts are where focus lands, that the page behind is really
// inert and really locked, that the outcome is announced after the dialog has
// gone, and that the destructive answer is never the one under Enter.

/* --- example 1 · the baseline --------------------------------------------- */

test('the trigger opens a modal dialog named by its heading', async ({ page }) => {
  await page.getByRole('button', { name: 'Ticket details', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Doors at 19:30' });
  await expect(dialog).toBeVisible();
  // showModal(), not the open attribute: only the former is modal.
  expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
});

test('the trigger carries no aria-expanded', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Ticket details', exact: true });

  // A modal moves the user inside it, so there is no state to report from out
  // here -- unlike a disclosure or a drawer.
  await expect(trigger).not.toHaveAttribute('aria-expanded', /.*/);
  await trigger.click();
  await expect(trigger).not.toHaveAttribute('aria-expanded', /.*/);
});

test('focus lands on the dialog itself when the content is words', async ({ page }) => {
  await page.getByRole('button', { name: 'Ticket details', exact: true }).click();

  // Not the close button, which is what showModal() would have chosen: focusing
  // the dialog is what makes a screen reader read the name and then the body.
  const focused = await page.evaluate(() => document.activeElement.tagName);
  expect(focused).toBe('DIALOG');
  expect(await page.locator('#ac-modal-doors').evaluate((el) => el.tabIndex)).toBe(-1);
});

test('no role or aria-modal is hand-written onto the dialog', async ({ page }) => {
  const dialog = page.locator('#ac-modal-doors');

  // Both are implied by showModal(), and aria-modal has made VoiceOver skip a
  // native dialog's own content.
  expect(await dialog.getAttribute('role')).toBeNull();
  expect(await dialog.getAttribute('aria-modal')).toBeNull();
});

test('Escape closes it and focus goes back to the trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Ticket details', exact: true });

  await trigger.click();
  await page.keyboard.press('Escape');

  await expect(page.locator('#ac-modal-doors')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('the close button has a real name and clears 44px', async ({ page }) => {
  await page.getByRole('button', { name: 'Ticket details', exact: true }).click();

  const close = page.getByRole('button', { name: 'Close ticket details' });
  const box = await close.boundingBox();

  // Touch has no Escape key, so this is the only way out there.
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);

  await close.click();
  await expect(page.locator('#ac-modal-doors')).toBeHidden();
});

test('Tab cycles inside the dialog and cannot reach the page behind', async ({ page }) => {
  await page.getByRole('button', { name: 'Ticket details', exact: true }).click();

  const trail = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    trail.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        if (el.closest && el.closest('dialog')) return 'inside';
        return el === document.body ? 'body' : 'ESCAPED';
      }),
    );
  }

  // Chrome parks on <body> once per cycle before wrapping back in. That stop is
  // the browser's, not ours, and focus never reaches the inert page behind --
  // which is the guarantee that matters.
  expect(trail).not.toContain('ESCAPED');
  expect(trail.filter((stop) => stop === 'inside').length).toBeGreaterThanOrEqual(4);
});

test('the page behind is inert, so a trigger out there cannot be clicked', async ({ page }) => {
  await page.getByRole('button', { name: 'Ticket details', exact: true }).click();

  const other = page.getByRole('button', { name: 'House rules', exact: true });
  // Inertness is the browser's, from showModal(). force: true is a real trusted
  // click, and it still does nothing.
  await other.click({ force: true });

  await expect(page.locator('#ac-modal-rules')).toBeHidden();
  await expect(page.locator('#ac-modal-doors')).toBeVisible();
});

test('the page is scroll-locked while it is open, and released after', async ({ page }) => {
  const overflow = () => page.evaluate(() => getComputedStyle(document.documentElement).overflow);

  await page.getByRole('button', { name: 'Ticket details', exact: true }).click();
  // showModal() makes the page inert and leaves it scrolling; this is ours.
  expect(await overflow()).toBe('hidden');
  // scrollbar-gutter, or locking shifts the whole layout sideways.
  expect(
    await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter),
  ).toBe('stable');

  await page.keyboard.press('Escape');
  expect(await overflow()).not.toBe('hidden');
});

test('the backdrop dismisses this one, because it opted in', async ({ page }) => {
  await page.getByRole('button', { name: 'Ticket details', exact: true }).click();

  const dialog = page.locator('#ac-modal-doors');
  await expect(dialog).toHaveAttribute('data-ac-backdrop-close', 'true');

  // A click on ::backdrop is dispatched to the dialog element itself, which is
  // also why the dialog carries no padding of its own.
  await page.mouse.click(6, 6);
  await expect(dialog).toBeHidden();
});

test('a drag that ends on the backdrop does not close it', async ({ page }) => {
  await page.getByRole('button', { name: 'Ticket details', exact: true }).click();

  const body = page.locator('#ac-modal-doors .ac-modal__body');
  const box = await body.boundingBox();

  await page.mouse.move(box.x + 20, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(6, 6);
  await page.mouse.up();

  // Selecting text and letting go outside is not a dismissal.
  await expect(page.locator('#ac-modal-doors')).toBeVisible();
});

/* --- example 2 · a form in a modal ---------------------------------------- */

test('focus lands in the first field when the dialog is a form', async ({ page }) => {
  await page.getByRole('button', { name: 'Add to the door list' }).click();

  await expect(page.getByRole('textbox', { name: 'Name on the door' })).toBeFocused();
});

test('an empty required field keeps the dialog open', async ({ page }) => {
  await page.getByRole('button', { name: 'Add to the door list' }).click();
  await page.getByRole('button', { name: 'Add name' }).click();

  // method="dialog" still runs constraint validation before it closes.
  await expect(page.locator('#ac-modal-guest')).toBeVisible();
  await expect(page.locator('[data-ac-modal-status="ac-modal-guest"]')).toHaveText('');
});

test('the outcome is announced after the dialog has gone, not before', async ({ page }) => {
  const status = page.locator('[data-ac-modal-status="ac-modal-guest"]');

  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveText('');

  await page.getByRole('button', { name: 'Add to the door list' }).click();
  await page.getByRole('textbox', { name: 'Name on the door' }).fill('Kim from the yard');
  await page.getByRole('button', { name: 'Add name' }).click();

  // The region is outside the dialog, and everything outside an open modal is
  // inert -- a live region there cannot announce until the dialog is gone.
  await expect(page.locator('#ac-modal-guest')).toBeHidden();
  await expect(status).toHaveText('Name added to the door list.');
});

test('submitting sets returnValue from the button', async ({ page }) => {
  await page.getByRole('button', { name: 'Add to the door list' }).click();
  await page.getByRole('textbox', { name: 'Name on the door' }).fill('Kim from the yard');
  await page.getByRole('button', { name: 'Add name' }).click();

  expect(await page.locator('#ac-modal-guest').evaluate((el) => el.returnValue)).toBe('add');
});

test('cancelling says nothing at all', async ({ page }) => {
  await page.getByRole('button', { name: 'Add to the door list' }).click();
  await page.getByRole('textbox', { name: 'Name on the door' }).fill('Kim from the yard');
  await page.getByRole('button', { name: 'Cancel' }).click();

  await expect(page.locator('#ac-modal-guest')).toBeHidden();
  // A message stashed on a click that failed validation must not leak out of a
  // later close either.
  await expect(page.locator('[data-ac-modal-status="ac-modal-guest"]')).toHaveText('');
});

test('a failed submit does not leave a message waiting for the next close', async ({ page }) => {
  await page.getByRole('button', { name: 'Add to the door list' }).click();
  await page.getByRole('button', { name: 'Add name' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await expect(page.locator('[data-ac-modal-status="ac-modal-guest"]')).toHaveText('');
});

/* --- example 3 · confirming something destructive ------------------------- */

test('the confirmation is an alertdialog with the consequence as its description', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Delete the setlist' }).click();

  const dialog = page.getByRole('alertdialog', { name: 'Delete this setlist?' });
  await expect(dialog).toBeVisible();
  // The name asks the question; alertdialog requires something that says what is
  // lost by answering yes.
  await expect(dialog).toHaveAccessibleDescription(/nobody else has a copy/);
});

test('focus lands on the safe answer, never on Delete', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete the setlist' }).click();

  // Enter is the key people press to make a dialog go away.
  await expect(page.getByRole('button', { name: 'Keep the setlist' })).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('#ac-modal-setlist')).toBeHidden();
  await expect(page.locator('[data-ac-modal-status="ac-modal-setlist"]')).toHaveText('');
});

test('both answers say what they do', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete the setlist' }).click();

  // Not "Yes" and "No", which answer a question the person may not have heard.
  await expect(page.getByRole('button', { name: 'Delete setlist' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep the setlist' })).toBeVisible();
});

test('deleting reports what happened', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete the setlist' }).click();
  await page.getByRole('button', { name: 'Delete setlist' }).click();

  await expect(page.locator('[data-ac-modal-status="ac-modal-setlist"]')).toHaveText(
    'Setlist deleted.',
  );
});

test('the destructive button is not signaled by color alone', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete the setlist' }).click();

  const label = await page.getByRole('button', { name: 'Delete setlist' }).textContent();
  // The label is the cue that survives every palette; the pink is the second one.
  expect(label.trim()).toMatch(/delete/i);

  await expect(page.locator('#ac-modal-setlist')).toHaveAttribute('data-ac-focus', /safe/);
});

test('the backdrop does not dismiss a confirmation', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete the setlist' }).click();

  await page.mouse.click(6, 6);
  // Off by default: a stray click should not answer a question with consequences.
  await expect(page.locator('#ac-modal-setlist')).toBeVisible();
});

/* --- example 4 · long content -------------------------------------------- */

test('long content scrolls inside the dialog, not the page', async ({ page }) => {
  await page.getByRole('button', { name: 'House rules', exact: true }).click();

  const body = page.locator('#ac-modal-rules .ac-modal__body');
  const metrics = await body.evaluate((el) => ({
    scrollable: el.scrollHeight > el.clientHeight + 1,
    minHeight: getComputedStyle(el).minHeight,
    overflow: getComputedStyle(el).overflowY,
  }));

  expect(metrics.scrollable).toBe(true);
  expect(metrics.overflow).toBe('auto');
  // Without min-height: 0 a flex item refuses to shrink below its content and
  // the body overflows the dialog instead of scrolling inside it.
  expect(metrics.minHeight).toBe('0px');
});

test('the dialog is a flex column once it is open', async ({ page }) => {
  await page.getByRole('button', { name: 'House rules', exact: true }).click();

  // A <dialog> is display: none until open and block after, so the column has to
  // be declared on [open].
  const display = await page.locator('#ac-modal-rules').evaluate((el) => getComputedStyle(el).display);
  expect(display).toBe('flex');
});

test('the way out stays reachable from the bottom of a long dialog', async ({ page }) => {
  await page.getByRole('button', { name: 'House rules', exact: true }).click();

  const body = page.locator('#ac-modal-rules .ac-modal__body');
  await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));

  // The head and foot are outside the scrolling area, so at 200% zoom the close
  // control does not scroll away.
  await expect(page.getByRole('button', { name: 'Close house rules' })).toBeInViewport();
});

test('the dialog never grows past the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.reload();
  await page.getByRole('button', { name: 'House rules', exact: true }).click();

  const box = await page.locator('#ac-modal-rules').boundingBox();
  expect(box.width).toBeLessThanOrEqual(320);
  expect(box.height).toBeLessThanOrEqual(480);
});

/* --- shared -------------------------------------------------------------- */

test('createModal is idempotent, and destroy closes and unbinds', async ({ page }) => {
  const result = await page.evaluate(() => {
    const el = document.querySelector('#ac-modal-doors');
    const same = window.AC.createModal(el) === el._acModal;

    el._acModal.open();
    const opened = el.open;
    el._acModal.destroy();

    return { same, opened, stillOpen: el.open, gone: !el._acModal };
  });

  expect(result.same).toBe(true);
  expect(result.opened).toBe(true);
  // A destroyed modal must not leave the page locked behind an open dialog.
  expect(result.stillOpen).toBe(false);
  expect(result.gone).toBe(true);

  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-ac-modal-lock'))).toBe(
    false,
  );
});

test('motion is gated, so reduced motion means no entrance', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.getByRole('button', { name: 'Ticket details', exact: true }).click();

  const duration = await page
    .locator('#ac-modal-doors')
    .evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(duration)).toBe(0);
});

test('nothing overflows sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.reload();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
