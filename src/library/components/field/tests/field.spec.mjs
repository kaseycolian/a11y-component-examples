import { test, expect } from '@playwright/test';

const PAGE = 'components/field/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// Assert the ARIA contract and the keyboard map from docs/component-specs.md --
// not merely that the thing rendered. A test that only checks for presence
// would still pass if every attribute were wrong.

/** The label is what associates a control, so resolve controls through it. */
function field(page, id) {
  const root = page.locator('.ac-field').filter({ has: page.locator(`#${id}`) });
  return {
    root,
    control: page.locator(`#${id}`),
    hint: root.locator('.ac-field__hint'),
    error: root.locator('.ac-field__error'),
  };
}

test('the label names the control and clicking it moves focus there', async ({ page }) => {
  const { control } = field(page, 'ac-demo-name');

  await expect(control).toHaveAccessibleName('Display name');
  await page.getByText('Display name', { exact: true }).click();
  await expect(control).toBeFocused();
});

test('the hint is a description, not part of the name', async ({ page }) => {
  const { control, hint } = field(page, 'ac-demo-name');

  await expect(control).toHaveAccessibleDescription(/Shown beside anything you post/);
  await expect(control).toHaveAccessibleName('Display name');

  // Referenced by id, not copied -- that is what keeps them from drifting.
  const hintId = await hint.getAttribute('id');
  expect((await control.getAttribute('aria-describedby')).split(' ')).toContain(hintId);
});

test('aria-describedby names the hint AND the error from the start', async ({ page }) => {
  const { control, hint, error } = field(page, 'ac-demo-name');

  const ids = (await control.getAttribute('aria-describedby')).split(/\s+/);
  expect(ids).toEqual([await hint.getAttribute('id'), await error.getAttribute('id')]);

  // No error yet, so the empty element contributes nothing to the description.
  await expect(error).toBeEmpty();
  await expect(control).toHaveAccessibleDescription(/^Shown beside anything you post[\s\S]*later\.$/);
});

test('the error element is present and rendered while empty, so the alert can fire', async ({
  page,
}) => {
  const { error } = field(page, 'ac-demo-name');

  await expect(error).toHaveAttribute('role', 'alert');
  await expect(error).toHaveCount(1);
  // Not hidden, not display:none -- a role="alert" outside the accessibility
  // tree announces nothing when it is populated.
  await expect(error).not.toHaveAttribute('hidden', /.*/);
  expect(await error.evaluate((el) => getComputedStyle(el).display)).not.toBe('none');
  // ...and yet it costs no vertical space.
  expect((await error.boundingBox()).height).toBe(0);
});

test('showing an error does not clobber the hint -- the whole point', async ({ page }) => {
  const { control, error } = field(page, 'ac-demo-email');

  const before = await control.getAttribute('aria-describedby');

  // Blur without entering anything.
  await control.focus();
  await control.blur();

  await expect(error).toHaveText('Enter the email address you use at work.');
  await expect(control).toHaveAttribute('aria-invalid', 'true');

  // The list is untouched, and BOTH descriptions are now readable.
  expect(await control.getAttribute('aria-describedby')).toBe(before);
  await expect(control).toHaveAccessibleDescription(/Only used to send your sign-in link/);
  await expect(control).toHaveAccessibleDescription(/Enter the email address you use at work/);
});

test('a format error and a missing error use their own messages', async ({ page }) => {
  const { control, error } = field(page, 'ac-demo-email');

  await control.fill('not-an-address');
  await control.blur();
  await expect(error).toHaveText('Enter an address in the form name@example.com.');

  // And the hint survived the second message too.
  await expect(control).toHaveAccessibleDescription(/Only used to send your sign-in link/);
});

test('fixing the value clears the error without waiting for blur', async ({ page }) => {
  const { control, error } = field(page, 'ac-demo-email');

  await control.focus();
  await control.blur();
  await expect(error).not.toBeEmpty();

  await control.fill('someone@example.com');
  // Cleared on input, while focus is still in the control.
  await expect(error).toBeEmpty();
  await expect(control).not.toHaveAttribute('aria-invalid', 'true');
  await expect(control).toBeFocused();
});

test('nothing new is announced while typing', async ({ page }) => {
  const { control, error } = field(page, 'ac-demo-email');

  await control.pressSequentially('nope');
  // Mid-word, and wrong -- but the user has not finished. Still silent.
  await expect(error).toBeEmpty();
  await expect(control).not.toHaveAttribute('aria-invalid', 'true');
});

test('the same message is not re-announced', async ({ page }) => {
  const { control, error } = field(page, 'ac-demo-email');
  const id = await error.getAttribute('id');

  // Count text mutations on the alert region: a repeat write would show up here
  // as a change a screen reader announces a second time.
  await page.evaluate((errorId) => {
    window.__alertWrites = 0;
    const el = document.getElementById(errorId);
    new MutationObserver(() => {
      window.__alertWrites++;
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }, id);

  await control.focus();
  await control.blur();
  await expect(error).not.toBeEmpty();
  const afterFirst = await page.evaluate(() => window.__alertWrites);

  // Same failure again, same message.
  await control.focus();
  await control.blur();
  await expect(error).toHaveText('Enter the email address you use at work.');
  expect(await page.evaluate(() => window.__alertWrites)).toBe(afterFirst);
});

test('replacing one message with another leaves a frame between them', async ({ page }) => {
  const { control, error } = field(page, 'ac-demo-email');
  const id = await error.getAttribute('id');

  await page.evaluate((errorId) => {
    window.__states = [];
    const el = document.getElementById(errorId);
    new MutationObserver(() => {
      window.__states.push(el.textContent);
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }, id);

  await control.focus();
  await control.blur();
  await expect(error).toHaveText('Enter the email address you use at work.');

  await control.fill('nope');
  await control.blur();
  await expect(error).toHaveText('Enter an address in the form name@example.com.');

  // Cleared, then set -- not swapped in one tick, which some screen readers
  // coalesce into no change at all.
  const states = await page.evaluate(() => window.__states);
  expect(states).toContain('');
  expect(states.indexOf('')).toBeLessThan(
    states.indexOf('Enter an address in the form name@example.com.'),
  );

  // aria-invalid never lied about the control being valid in between.
  await expect(control).toHaveAttribute('aria-invalid', 'true');
});

test('a server-rendered error is described but not re-wired', async ({ page }) => {
  const { root, control, hint, error } = field(page, 'ac-demo-slug');

  await expect(root).toHaveClass(/ac-field--invalid/);
  await expect(control).toHaveAttribute('aria-invalid', 'true');
  await expect(error).toHaveAttribute('role', 'alert');

  const ids = (await control.getAttribute('aria-describedby')).split(/\s+/);
  expect(ids).toEqual([await hint.getAttribute('id'), await error.getAttribute('id')]);
  await expect(control).toHaveAccessibleDescription(/Lower-case letters/);
  await expect(control).toHaveAccessibleDescription(/Replace the space/);
});

test('a disabled control keeps its hint readable', async ({ page }) => {
  const { control, hint } = field(page, 'ac-demo-org');

  await expect(control).toBeDisabled();
  await expect(hint).toBeVisible();
  // The reason the hint is not a placeholder: it is still there to read.
  await expect(hint).toHaveText(/Set by your administrator/);
});

test('the invalid cue is not carried by color alone', async ({ page }) => {
  const valid = field(page, 'ac-demo-name').control;
  const invalid = field(page, 'ac-demo-slug').control;

  const width = (locator) =>
    locator.evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));

  // A message to read is the first cue; the thicker border is the second.
  expect(await width(invalid)).toBeGreaterThan(await width(valid));
});

test('a group is described on the fieldset, not on one radio', async ({ page }) => {
  const root = page.locator('.ac-field').filter({ has: page.locator('fieldset') });
  const group = root.locator('fieldset');
  const first = root.locator('input[type="radio"]').first();

  await expect(group).toHaveAccessibleName('Deploy on merge');
  await expect(group).toHaveAccessibleDescription(/Applies to this branch only/);
  // Describing one radio would describe only that radio.
  expect(await first.getAttribute('aria-describedby')).toBeNull();
});

test('a group validates and clears when a choice is made', async ({ page }) => {
  const root = page.locator('.ac-field').filter({ has: page.locator('fieldset') });
  const error = root.locator('.ac-field__error');
  const group = root.locator('fieldset');
  const first = root.locator('input[type="radio"]').first();

  await first.focus();
  await first.blur();
  await expect(error).toHaveText('Choose when this branch should deploy.');
  await expect(group).toHaveAttribute('aria-invalid', 'true');

  // Arrows move and select within a radio group -- native, and enough to fix it.
  await first.focus();
  await page.keyboard.press('ArrowDown');
  await expect(error).toBeEmpty();
  await expect(group).not.toHaveAttribute('aria-invalid', 'true');
});

test('a radio group is a single tab stop', async ({ page }) => {
  const radios = page.locator('input[type="radio"]');
  await radios.nth(1).check();

  await radios.nth(1).focus();
  await page.keyboard.press('Tab');
  // Tab leaves the group entirely rather than stepping to the third radio.
  await expect(radios.nth(2)).not.toBeFocused();
});

test('the required asterisk is decoration, not part of the name', async ({ page }) => {
  const { control } = field(page, 'ac-demo-email');

  await expect(control).toHaveAccessibleName('Work email');
  await expect(page.locator('.ac-field__required').first()).toHaveAttribute('aria-hidden', 'true');
  // The attribute is what actually conveys it.
  await expect(control).toHaveAttribute('required', '');
});

test('the textarea can still be resized', async ({ page }) => {
  const { control } = field(page, 'ac-demo-reason');
  // resize: none is a reflow problem (SC 1.4.4) for anyone enlarging the text.
  expect(await control.evaluate((el) => getComputedStyle(el).resize)).toBe('vertical');
});

test('every control clears the 24x24 target floor', async ({ page }) => {
  const controls = page.locator('.ac-input, .ac-textarea, .ac-choice');

  for (const control of await controls.all()) {
    const box = await control.boundingBox();
    expect(box.width, await control.getAttribute('id')).toBeGreaterThanOrEqual(24);
    expect(box.height, await control.getAttribute('id')).toBeGreaterThanOrEqual(24);
  }
});

test('the API drives the same contract the markup does', async ({ page }) => {
  const { control, error } = field(page, 'ac-demo-name');

  const before = await control.getAttribute('aria-describedby');

  await page.evaluate(() => {
    document.querySelector('#ac-demo-name').closest('.ac-field')._acField.setError(
      'Pick a name that is not already taken.',
    );
  });

  await expect(error).toHaveText('Pick a name that is not already taken.');
  await expect(control).toHaveAttribute('aria-invalid', 'true');
  expect(await control.getAttribute('aria-describedby')).toBe(before);

  await page.evaluate(() => {
    document.querySelector('#ac-demo-name').closest('.ac-field')._acField.clearError();
  });

  await expect(error).toBeEmpty();
  // Removed rather than set to "false": the markup never declared it.
  expect(await control.getAttribute('aria-invalid')).toBeNull();
});

test('setError writes text, never markup', async ({ page }) => {
  const { error } = field(page, 'ac-demo-name');

  await page.evaluate(() => {
    document
      .querySelector('#ac-demo-name')
      .closest('.ac-field')
      ._acField.setError('<em>oops</em> try again');
  });

  // A validation message is usually an echo of what the user typed.
  expect(await error.evaluate((el) => el.querySelector('em'))).toBeNull();
  await expect(error).toHaveText('<em>oops</em> try again');
});

test('createField is idempotent and destroy undoes exactly what it added', async ({ page }) => {
  const result = await page.evaluate(() => {
    const root = document.querySelector('#ac-demo-slug').closest('.ac-field');
    const control = root.querySelector('#ac-demo-slug');
    const wired = control.getAttribute('aria-describedby');

    const same = window.AC.createField(root) === root._acField;
    root._acField.setError('Something else entirely.');
    root._acField.destroy();

    const after = {
      describedBy: control.getAttribute('aria-describedby'),
      invalid: control.getAttribute('aria-invalid'),
      html: root.querySelector('.ac-field__error').innerHTML,
    };

    window.AC.createField(root);
    return { same, wired, after, rewired: control.getAttribute('aria-describedby') };
  });

  expect(result.same).toBe(true);

  // The markup never declared aria-describedby -- the factory built it -- so the
  // inverse is removing it, not leaving the list behind.
  expect(result.after.describedBy).toBeNull();
  // aria-invalid WAS declared in the markup, so its original value comes back
  // even though setError had since changed it.
  expect(result.after.invalid).toBe('true');
  // And the server's message returns as markup, not flattened to text.
  expect(result.after.html).toContain('<code>');
  expect(result.after.html).toContain('Replace the space');

  // Re-creating rebuilds the same list, so destroy left nothing stale behind.
  expect(result.rewired).toBe(result.wired);
});

test('an aria-describedby the author wrote is kept, and kept first', async ({ page }) => {
  const ids = await page.evaluate(() => {
    // A counter, a password policy -- something this component knows nothing
    // about but must not eat.
    const root = document.querySelector('#ac-demo-name').closest('.ac-field');
    root._acField.destroy();

    const control = root.querySelector('#ac-demo-name');
    control.setAttribute('aria-describedby', 'some-other-thing');
    window.AC.createField(root);

    return control.getAttribute('aria-describedby').split(/\s+/);
  });

  expect(ids[0]).toBe('some-other-thing');
  expect(ids).toContain('ac-demo-name-hint');
  expect(ids).toContain('ac-demo-name-error');
});

test('the docs tables scroll inside their own region rather than the page', async ({ page }) => {
  const region = page.locator('.prose .table-scroll').first();

  await expect(region).toHaveAttribute('tabindex', '0');
  // A box only a mouse can scroll is unreachable content (SC 2.1.1).
  await expect(region).toHaveAccessibleName(/table/i);
  // And the table is still a table -- not display:block, which would drop the
  // role out of the accessibility tree.
  expect(await region.locator('table').evaluate((el) => getComputedStyle(el).display)).toBe('table');
});

test('motion is gated, so reduced motion means no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('#ac-demo-name')
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
