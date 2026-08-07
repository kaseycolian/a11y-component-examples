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
  await page.getByRole('button', { name: 'Order 462', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Order 462' });
  await expect(dialog).toBeVisible();
  // showModal(), not the open attribute: only the former is modal.
  expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
});

test('the trigger carries no aria-expanded', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Order 462', exact: true });

  // A modal moves the user inside it, so there is no state to report from out
  // here -- unlike a disclosure or a drawer.
  await expect(trigger).not.toHaveAttribute('aria-expanded', /.*/);
  await trigger.click();
  await expect(trigger).not.toHaveAttribute('aria-expanded', /.*/);
});

test('focus lands on the dialog itself when the content is words', async ({ page }) => {
  await page.getByRole('button', { name: 'Order 462', exact: true }).click();

  // Not the close button, which is what showModal() would have chosen: focusing
  // the dialog is what makes a screen reader read the name and then the body.
  const focused = await page.evaluate(() => document.activeElement.tagName);
  expect(focused).toBe('DIALOG');
  expect(await page.locator('#ac-modal-order').evaluate((el) => el.tabIndex)).toBe(-1);
});

test('no role or aria-modal is hand-written onto the dialog', async ({ page }) => {
  const dialog = page.locator('#ac-modal-order');

  // Both are implied by showModal(), and aria-modal has made VoiceOver skip a
  // native dialog's own content.
  expect(await dialog.getAttribute('role')).toBeNull();
  expect(await dialog.getAttribute('aria-modal')).toBeNull();
});

test('Escape closes it and focus goes back to the trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Order 462', exact: true });

  await trigger.click();
  await page.keyboard.press('Escape');

  await expect(page.locator('#ac-modal-order')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('the close button has a real name and clears 44px', async ({ page }) => {
  await page.getByRole('button', { name: 'Order 462', exact: true }).click();

  const close = page.getByRole('button', { name: 'Close order details' });

  // Touch has no Escape key, so this is the only way out there.
  //
  // Polled, because the dialog has a motion-gated entrance: a boundingBox()
  // read a frame after the click measures the button mid-scale and reports it
  // under 44px. That was an intermittent full-suite failure, not a real one.
  await expect.poll(async () => (await close.boundingBox()).width).toBeGreaterThanOrEqual(44);
  await expect.poll(async () => (await close.boundingBox()).height).toBeGreaterThanOrEqual(44);

  await close.click();
  await expect(page.locator('#ac-modal-order')).toBeHidden();
});

test('Tab cycles inside the dialog and cannot reach the page behind', async ({ page }) => {
  await page.getByRole('button', { name: 'Order 462', exact: true }).click();

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
  // Billing terms, not Order 462: this is the example WITHOUT
  // data-ac-backdrop-close, and every point outside an open dialog is its
  // backdrop. Against the one that closes on backdrop click, a click aimed at
  // the page behind closes the dialog for a documented reason, and the test
  // could no longer tell that apart from a leak.
  await page.getByRole('button', { name: 'Billing terms', exact: true }).click();

  const other = page.getByRole('button', { name: 'Order 462', exact: true });
  const trigger = await other.boundingBox();
  const dialog = await page.locator('#ac-modal-terms').boundingBox();

  // Aim at a point that is over the trigger AND over the backdrop, computed
  // from the two boxes rather than guessed. The trigger's center sits under the
  // dialog itself at this viewport, so a default click would land on the
  // dialog's own content and prove nothing about what is behind it.
  expect(trigger.x).toBeLessThan(dialog.x);

  // Inertness is the browser's, from showModal(). force: true is a real trusted
  // click, and it still does nothing.
  await other.click({ force: true, position: { x: 4, y: trigger.height / 2 } });

  await expect(page.locator('#ac-modal-order')).toBeHidden();
  await expect(page.locator('#ac-modal-terms')).toBeVisible();
});

test('the page is scroll-locked while it is open, and released after', async ({ page }) => {
  const overflow = () => page.evaluate(() => getComputedStyle(document.documentElement).overflow);

  await page.getByRole('button', { name: 'Order 462', exact: true }).click();
  // showModal() makes the page inert and leaves it scrolling; this is ours.
  expect(await overflow()).toBe('hidden');
  // scrollbar-gutter, or locking shifts the whole layout sideways.
  expect(
    await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter),
  ).toBe('stable');

  await page.keyboard.press('Escape');
  // Polled, not read once: the `close` event is queued rather than dispatched
  // synchronously, so the unlock runs a tick after Escape. Asserting
  // immediately here is a race, and it failed roughly one run in four.
  await expect(page.locator('#ac-modal-order')).toBeHidden();
  await expect.poll(overflow).not.toBe('hidden');
});

test('the backdrop dismisses this one, because it opted in', async ({ page }) => {
  await page.getByRole('button', { name: 'Order 462', exact: true }).click();

  const dialog = page.locator('#ac-modal-order');
  await expect(dialog).toHaveAttribute('data-ac-backdrop-close', 'true');

  // A click on ::backdrop is dispatched to the dialog element itself, which is
  // also why the dialog carries no padding of its own.
  await page.mouse.click(6, 6);
  await expect(dialog).toBeHidden();
});

test('a drag that ends on the backdrop does not close it', async ({ page }) => {
  await page.getByRole('button', { name: 'Order 462', exact: true }).click();

  const body = page.locator('#ac-modal-order .ac-modal__body');
  const box = await body.boundingBox();

  await page.mouse.move(box.x + 20, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(6, 6);
  await page.mouse.up();

  // Selecting text and letting go outside is not a dismissal.
  await expect(page.locator('#ac-modal-order')).toBeVisible();
});

/* --- example 2 · a form in a modal ---------------------------------------- */

test('focus lands in the first field when the dialog is a form', async ({ page }) => {
  await page.getByRole('button', { name: 'Invite a teammate' }).click();

  await expect(page.getByRole('textbox', { name: 'Work email' })).toBeFocused();
});

test('an empty required field keeps the dialog open', async ({ page }) => {
  await page.getByRole('button', { name: 'Invite a teammate' }).click();
  await page.getByRole('button', { name: 'Send invite' }).click();

  // method="dialog" still runs constraint validation before it closes.
  await expect(page.locator('#ac-modal-invite')).toBeVisible();
  await expect(page.locator('[data-ac-modal-status="ac-modal-invite"]')).toHaveText('');
});

test('the outcome is announced after the dialog has gone, not before', async ({ page }) => {
  const status = page.locator('[data-ac-modal-status="ac-modal-invite"]');

  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveText('');

  await page.getByRole('button', { name: 'Invite a teammate' }).click();
  await page.getByRole('textbox', { name: 'Work email' }).fill('jordan.lee@example.com');
  await page.getByRole('button', { name: 'Send invite' }).click();

  // The region is outside the dialog, and everything outside an open modal is
  // inert -- a live region there cannot announce until the dialog is gone.
  await expect(page.locator('#ac-modal-invite')).toBeHidden();
  await expect(status).toHaveText('Invite sent.');
});

test('submitting sets returnValue from the button', async ({ page }) => {
  await page.getByRole('button', { name: 'Invite a teammate' }).click();
  await page.getByRole('textbox', { name: 'Work email' }).fill('jordan.lee@example.com');
  await page.getByRole('button', { name: 'Send invite' }).click();

  expect(await page.locator('#ac-modal-invite').evaluate((el) => el.returnValue)).toBe('send');
});

test('cancelling says nothing at all', async ({ page }) => {
  await page.getByRole('button', { name: 'Invite a teammate' }).click();
  await page.getByRole('textbox', { name: 'Work email' }).fill('jordan.lee@example.com');
  await page.getByRole('button', { name: 'Cancel' }).click();

  await expect(page.locator('#ac-modal-invite')).toBeHidden();
  // A message stashed on a click that failed validation must not leak out of a
  // later close either.
  await expect(page.locator('[data-ac-modal-status="ac-modal-invite"]')).toHaveText('');
});

test('a failed submit does not leave a message waiting for the next close', async ({ page }) => {
  await page.getByRole('button', { name: 'Invite a teammate' }).click();
  await page.getByRole('button', { name: 'Send invite' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await expect(page.locator('[data-ac-modal-status="ac-modal-invite"]')).toHaveText('');
});

/* --- example 3 · confirming something destructive ------------------------- */

test('the confirmation is an alertdialog with the consequence as its description', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Delete project', exact: true }).click();

  const dialog = page.getByRole('alertdialog', { name: 'Delete Project 462?' });
  await expect(dialog).toBeVisible();
  // The name asks the question; alertdialog requires something that says what is
  // lost by answering yes.
  await expect(dialog).toHaveAccessibleDescription(/There is no undo/);
});

test('focus lands on the safe answer, never on Delete', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete project', exact: true }).click();

  // Enter is the key people press to make a dialog go away.
  await expect(page.getByRole('button', { name: 'Keep Project 462' })).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('#ac-modal-project')).toBeHidden();
  await expect(page.locator('[data-ac-modal-status="ac-modal-project"]')).toHaveText('');
});

test('both answers say what they do', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete project', exact: true }).click();

  // Not "Yes" and "No", which answer a question the person may not have heard.
  await expect(page.getByRole('button', { name: 'Delete Project 462' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep Project 462' })).toBeVisible();
});

test('deleting reports what happened', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete project', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Project 462' }).click();

  await expect(page.locator('[data-ac-modal-status="ac-modal-project"]')).toHaveText(
    'Project 462 deleted.',
  );
});

test('the destructive button is not signaled by color alone', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete project', exact: true }).click();

  const label = await page.getByRole('button', { name: 'Delete Project 462' }).textContent();
  // The label is the cue that survives every palette; the pink is the second one.
  expect(label.trim()).toMatch(/delete/i);

  await expect(page.locator('#ac-modal-project')).toHaveAttribute('data-ac-focus', /safe/);
});

test('the backdrop does not dismiss a confirmation', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete project', exact: true }).click();

  await page.mouse.click(6, 6);
  // Off by default: a stray click should not answer a question with consequences.
  await expect(page.locator('#ac-modal-project')).toBeVisible();
});

/* --- example 4 · long content -------------------------------------------- */

test('long content scrolls inside the dialog, not the page', async ({ page }) => {
  await page.getByRole('button', { name: 'Billing terms', exact: true }).click();

  const body = page.locator('#ac-modal-terms .ac-modal__body');
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
  await page.getByRole('button', { name: 'Billing terms', exact: true }).click();

  // A <dialog> is display: none until open and block after, so the column has to
  // be declared on [open].
  const display = await page.locator('#ac-modal-terms').evaluate((el) => getComputedStyle(el).display);
  expect(display).toBe('flex');
});

test('the way out stays reachable from the bottom of a long dialog', async ({ page }) => {
  await page.getByRole('button', { name: 'Billing terms', exact: true }).click();

  const body = page.locator('#ac-modal-terms .ac-modal__body');
  await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));

  // The head and foot are outside the scrolling area, so at 200% zoom the close
  // control does not scroll away.
  await expect(page.getByRole('button', { name: 'Close billing terms' })).toBeInViewport();
});

test('the dialog never grows past the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.reload();
  await page.getByRole('button', { name: 'Billing terms', exact: true }).click();

  const box = await page.locator('#ac-modal-terms').boundingBox();
  expect(box.width).toBeLessThanOrEqual(320);
  expect(box.height).toBeLessThanOrEqual(480);
});

/* --- shared -------------------------------------------------------------- */

test('createModal is idempotent, and destroy closes and unbinds', async ({ page }) => {
  const result = await page.evaluate(() => {
    const el = document.querySelector('#ac-modal-order');
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
  await page.getByRole('button', { name: 'Order 462', exact: true }).click();

  const duration = await page
    .locator('#ac-modal-order')
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
