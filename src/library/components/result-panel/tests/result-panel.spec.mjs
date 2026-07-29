import { test, expect } from '@playwright/test';

const PAGE = 'components/result-panel/';

const URL_VALUE =
  'https://matinee.example/all-ages/?set=storm-windows&pressing=99&t=sk_test_99RubySohoLinoleumStormWindows462';

test.beforeEach(async ({ page, context }) => {
  // The copy path is the subject of two examples, so it has to resolve the
  // same way every run rather than falling back to execCommand at random.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(PAGE);
});

/* Every claim on this page is about which element announces and how narrow the
   value is willing to be, so that is what is asserted: live roles, announcement
   counts, accessible names, and min-content widths. */

/** What a screen reader is given: text minus aria-hidden and unrendered
    subtrees and minus any child that is itself a live region, plus generated
    content. The page's own [NAME] walk, re-derived here so the readouts are
    checked against something rather than against themselves. */
const spoken = (page, selector) =>
  page.evaluate((sel) => {
    const LIVE = new Set(['status', 'alert', 'log', 'marquee', 'timer']);
    const liveRole = (el) => {
      const role = (el.getAttribute('role') || '').trim().toLowerCase();
      if (role) return LIVE.has(role) ? role : '';
      if (el.tagName === 'OUTPUT') return 'status';
      return el.getAttribute('aria-live') || '';
    };

    const generated = (el, which) => {
      const style = getComputedStyle(el, which);
      if (!style || style.content === 'none' || style.content === 'normal') return '';
      if (style.display === 'none' || style.visibility === 'hidden') return '';
      const quoted = style.content.match(/^"([\s\S]*)"$/);
      return quoted ? quoted[1] : '';
    };

    const walk = (el) => {
      if (!el) return '';
      if (el.getAttribute('aria-hidden') === 'true') return '';
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return '';

      const parts = [generated(el, '::before')];
      el.childNodes.forEach((node) => {
        if (node.nodeType === 3) parts.push(node.nodeValue);
        else if (node.nodeType === 1 && !liveRole(node)) parts.push(walk(node));
      });
      parts.push(generated(el, '::after'));
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    };

    return walk(document.querySelector(sel));
  }, selector);

/** The narrowest a box is willing to be. This is the number SC 1.4.10 turns
    on: a flex or grid item's automatic minimum size is its min-content width. */
const minContent = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const probe = el.cloneNode(true);
    probe.style.cssText = 'position:absolute;visibility:hidden;width:min-content;';
    el.parentNode.appendChild(probe);
    const width = Math.round(probe.getBoundingClientRect().width);
    probe.remove();
    return width;
  }, selector);

/* --- example 1 · the specimen --------------------------------------------- */

test('the panel has exactly one live region, and it is empty', async ({ page }) => {
  const panel = page.locator('.ac-demo').first().locator('.ac-result');

  const roles = await panel.evaluate((el) =>
    [...el.querySelectorAll('[role], output, [aria-live]')].map(
      (node) => node.tagName.toLowerCase() + ':' + (node.getAttribute('role') || ''),
    ),
  );
  expect(roles).toEqual(['p:status']);

  // An empty region is 0px tall, so toBeVisible() reports it hidden. Assert
  // the negatives instead — this is the correct state for a screen reader.
  const region = panel.locator('.ac-result__status');
  await expect(region).toBeEmpty();
  expect(
    await region.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        display: style.display,
        visibility: style.visibility,
        hidden: el.hasAttribute('hidden'),
        connected: el.isConnected,
      };
    }),
  ).toEqual({ display: 'none', visibility: 'visible', hidden: false, connected: true });
});

test('the value is a code element, never an output', async ({ page }) => {
  const value = page.locator('.ac-demo').first().locator('.ac-result__value');
  expect(await value.evaluate((el) => el.tagName)).toBe('CODE');
  await expect(value).toHaveText(URL_VALUE);
});

test('the composed parts carry no live role of their own', async ({ page }) => {
  const panel = page.locator('.ac-demo').first().locator('.ac-result');

  for (const selector of ['.ac-status', '.ac-badge', '.ac-notice']) {
    await expect(panel.locator(selector)).not.toHaveAttribute('role', /.+/);
    await expect(panel.locator(selector)).not.toHaveAttribute('aria-live', /.+/);
  }
});

test('the badge announces its subject and hides its digits', async ({ page }) => {
  const badge = page.locator('.ac-demo').first().locator('.ac-badge');
  await expect(badge.locator('.ac-badge__num')).toHaveAttribute('aria-hidden', 'true');
  expect(await spoken(page, '.ac-demo .ac-badge')).toBe('3 parameters');
});

test('the copy button keeps its name and reports through the region', async ({ page }) => {
  const panel = page.locator('.ac-demo').first().locator('.ac-result');
  const button = panel.locator('[data-ac-rp-copy]');

  await expect(button).toHaveAccessibleName('Copy share link');
  await button.click();

  await expect(panel.locator('.ac-result__status')).toHaveText('Copied to clipboard');
  // The name is the same one it had before the press.
  await expect(button).toHaveAccessibleName('Copy share link');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(URL_VALUE);
});

/* --- example 2 · a value with nowhere to break ----------------------------- */

test('break-word wraps the text and leaves the minimum width alone', async ({ page }) => {
  // The finding. Both failures are the same failure: the box still refuses to
  // go under the width of the token, which is what stops the page reflowing.
  const none = await minContent(page, '[data-ac-rp-wrap-case="none"]');
  const word = await minContent(page, '[data-ac-rp-wrap-case="word"]');
  const good = await minContent(page, '[data-ac-rp-wrap-case="good"]');

  expect(word).toBe(none);
  expect(good).toBeLessThan(none / 5);

  await expect(page.locator('[data-ac-rp-out="wrap-none"]')).toHaveText(/wider than/);
  await expect(page.locator('[data-ac-rp-out="wrap-word"]')).toHaveText(/wider than/);
  await expect(page.locator('[data-ac-rp-out="wrap-good"]')).toHaveText(/fits any width/);
});

test('the two broken cases look different from each other and are not', async ({ page }) => {
  // break-word wraps, so it is the specimen it resembles on screen — which is
  // why it survives review.
  const [word, good] = await Promise.all([
    page.locator('[data-ac-rp-wrap-case="word"]').boundingBox(),
    page.locator('[data-ac-rp-wrap-case="good"]').boundingBox(),
  ]);
  expect(Math.abs(word.width - good.width)).toBeLessThanOrEqual(1);
});

test('the specimen declares overflow-wrap: anywhere', async ({ page }) => {
  await expect(page.locator('[data-ac-rp-wrap-case="good"]')).toHaveCSS(
    'overflow-wrap',
    'anywhere',
  );
});

/* --- example 3 · four things that want to talk ----------------------------- */

test('the output is a live region although nothing declared one', async ({ page }) => {
  const value = page.locator('[data-ac-rp-case="loud"] .ac-result__value');
  expect(await value.evaluate((el) => el.tagName)).toBe('OUTPUT');
  await expect(value).not.toHaveAttribute('role', /.+/);
  await expect(value).not.toHaveAttribute('aria-live', /.+/);

  await page.locator('[data-ac-rp-run]').click();

  // The real accessibility tree, not the page's own walk. `el.role` is no use
  // here — ARIA reflection returns the attribute, which is exactly the thing
  // that is missing. The snapshot is the computed role.
  expect(await value.ariaSnapshot()).toMatch(/^- status:/);
  expect(await page.locator('[data-ac-rp-case="quiet"] .ac-result__value').ariaSnapshot()).toMatch(
    /^- code:/,
  );
});

test('one press announces four times on one panel and once on the other', async ({ page }) => {
  const log = page.locator('[data-ac-rp-log] li');
  await expect(log).toHaveCount(0);

  await page.locator('[data-ac-rp-run]').click();
  await expect(log).toHaveCount(5);

  const loud = page.locator('[data-ac-rp-log] li[data-ac-rp-bad="true"]');
  await expect(loud).toHaveCount(4);
  await expect(loud.nth(0)).toContainText('3 parameters');
  await expect(loud.nth(1)).toContainText('Ready');
  await expect(loud.nth(2)).toContainText(URL_VALUE);
  await expect(loud.nth(3)).toContainText('Warning: t expires');

  const quiet = page.locator('[data-ac-rp-log] li:not([data-ac-rp-bad="true"])');
  await expect(quiet).toHaveCount(1);
  await expect(quiet).toHaveText(/Link built\. 3 parameters, and one warning\./);
});

test('the longest of the four announcements is the value itself', async ({ page }) => {
  await page.locator('[data-ac-rp-run]').click();
  const lengths = await page
    .locator('[data-ac-rp-log] li[data-ac-rp-bad="true"]')
    .evaluateAll((els) => els.map((el) => el.textContent.length));

  expect(Math.max(...lengths)).toBe(lengths[2]);
});

test('both panels end up showing the same result', async ({ page }) => {
  await page.locator('[data-ac-rp-run]').click();

  for (const key of ['loud', 'quiet']) {
    const panel = page.locator(`[data-ac-rp-case="${key}"]`);
    await expect(panel.locator('.ac-result__value')).toHaveText(URL_VALUE);
    await expect(panel.locator('.ac-status__text')).toHaveText('Ready');
    await expect(panel.locator('.ac-badge__name')).toHaveText('3 parameters');
    await expect(panel.locator('.ac-notice__text')).toContainText('t expires 24 hours');
  }
});

test('a count of zero removes the badge, words and all', async ({ page }) => {
  await page.locator('[data-ac-rp-run]').click();
  await expect(page.locator('[data-ac-rp-case="quiet"] .ac-badge')).not.toHaveAttribute(
    'hidden',
    '',
  );

  await page.locator('[data-ac-rp-reset]').click();

  const badge = page.locator('[data-ac-rp-case="quiet"] .ac-badge');
  await expect(badge).toHaveAttribute('hidden', '');
  // The explicit .ac-badge[hidden] rule: an author display would otherwise
  // beat the UA's [hidden] and leave the badge on screen.
  await expect(badge).toHaveCSS('display', 'none');
});

test('start over clears the result and empties the log', async ({ page }) => {
  await page.locator('[data-ac-rp-run]').click();
  await expect(page.locator('[data-ac-rp-log] li')).toHaveCount(5);

  await page.locator('[data-ac-rp-reset]').click();

  // Cleared a frame later, so the reset's own mutations land in it first and
  // are then swept — assert the settled state, not the tick after.
  await expect(page.locator('[data-ac-rp-log] li')).toHaveCount(0);
  await expect(page.locator('[data-ac-rp-case="quiet"] .ac-result__value')).toBeEmpty();
  await expect(page.locator('[data-ac-rp-case="quiet"] .ac-result__status')).toBeEmpty();
  await expect(page.locator('[data-ac-rp-case="quiet"] .ac-status__text')).toHaveText('Waiting');
});

/* --- example 4 · what the copy button is allowed to say -------------------- */

test('the renaming button changes the name under the reader', async ({ page }) => {
  const button = page.locator('[data-ac-rp-case="rename"] [data-ac-rp-copy]');
  await expect(button).toHaveAccessibleName('Copy the src parameter');

  await button.click();

  await expect(button).toHaveAccessibleName('Copied the src parameter');
  await expect(page.locator('[data-ac-rp-out="copy-rename"]')).toHaveText(
    '"Copied the src parameter"',
  );
  // No region on that panel, so the rename is all there was.
  await expect(page.locator('[data-ac-rp-case="rename"] .ac-result__status')).toHaveCount(0);
});

test('the tick is the only cue on the panel that draws one', async ({ page }) => {
  const panel = page.locator('[data-ac-rp-case="tick"]');
  await expect(panel.locator('[data-ac-rp-tick]')).toHaveAttribute('aria-hidden', 'true');

  await panel.locator('[data-ac-rp-copy]').click();

  await expect(panel.locator('[data-ac-rp-tick]')).toHaveAttribute('data-ac-rp-shown', 'true');
  await expect(page.locator('[data-ac-rp-out="copy-tick"]')).toHaveText('nothing');
  await expect(page.locator('[data-ac-rp-out="copy-tick"]')).toHaveAttribute(
    'data-ac-rp-bad',
    'true',
  );
});

test('the specimen keeps its name and announces the outcome', async ({ page }) => {
  const panel = page.locator('[data-ac-rp-case="good"]');
  const button = panel.locator('[data-ac-rp-copy]');

  await button.click();

  await expect(button).toHaveAccessibleName('Copy the pressing parameter');
  await expect(panel.locator('.ac-result__status')).toHaveText('Copied to clipboard');
  await expect(page.locator('[data-ac-rp-out="copy-good"]')).toHaveText('"Copied to clipboard"');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('?pressing=99');
});

test('all three copy buttons have distinct names', async ({ page }) => {
  const names = await page
    .locator('[data-ac-rp-copy-cases] [data-ac-rp-copy]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));

  expect(new Set(names).size).toBe(names.length);
  // SC 2.5.3: the visible word is contained in the accessible name.
  names.forEach((name) => expect(name.startsWith('Copy ')).toBe(true));
});

/* --- example 5 · nothing to copy ------------------------------------------- */

test('an empty value slot is read as nothing at all', async ({ page }) => {
  expect(await spoken(page, '[data-ac-rp-case="bare"] .ac-result__value')).toBe('');
  await expect(page.locator('[data-ac-rp-out="empty-bare-said"]')).toHaveText('nothing');
});

test('the unguarded button reports a successful copy of nothing', async ({ page }) => {
  const panel = page.locator('[data-ac-rp-case="bare"]');
  await panel.locator('[data-ac-rp-copy]').click();

  await expect(panel.locator('.ac-result__status')).toHaveText('Copied to clipboard');
  await expect(page.locator('[data-ac-rp-out="empty-bare"]')).toHaveAttribute(
    'data-ac-rp-bad',
    'true',
  );
});

test('the specimen carries its reason as a description and says nothing on the press', async ({
  page,
}) => {
  const panel = page.locator('[data-ac-rp-case="told"]');
  const button = panel.locator('[data-ac-rp-copy]');

  await expect(button).toHaveAccessibleName('Copy share link');
  await expect(button).toHaveAccessibleDescription(/Nothing built yet/);

  // aria-disabled, not disabled: still focusable, so the description is
  // reachable by the person it is for.
  expect(await button.evaluate((el) => el.disabled)).toBe(false);

  // Playwright honors aria-disabled in actionability; the preventDefault in
  // the component is what this assertion is really about.
  await button.click({ force: true });

  await expect(panel.locator('.ac-result__status')).toBeEmpty();
  await expect(page.locator('[data-ac-rp-out="empty-told"]')).toHaveText('nothing');
});

test('an empty result keeps the panel the same shape', async ({ page }) => {
  const [bare, told] = await Promise.all([
    page.locator('[data-ac-rp-case="bare"]').boundingBox(),
    page.locator('[data-ac-rp-case="told"]').boundingBox(),
  ]);
  expect(Math.abs(bare.width - told.width)).toBeLessThanOrEqual(1);
});

/* --- the API --------------------------------------------------------------- */

test('setResult writes every part in one call', async ({ page }) => {
  const result = await page.evaluate(() => {
    const panel = document.querySelector('[data-ac-rp-case="quiet"]');
    AC.setResult(panel, {
      value: '?set=matinee',
      verdict: 'Failed',
      tone: 'err',
      count: 1,
      subject: 'parameters',
      note: 'the set is sold out.',
      notePrefix: 'Error:',
      noteTone: 'error',
      say: 'That link cannot be built.',
    });

    return {
      value: panel.querySelector('.ac-result__value').textContent,
      verdictClass: panel.querySelector('.ac-status').className,
      verdict: panel.querySelector('.ac-status__text').textContent,
      badge: panel.querySelector('.ac-badge__name').textContent,
      note: panel.querySelector('.ac-notice').className,
      say: panel.querySelector('.ac-result__status').textContent,
    };
  });

  expect(result).toEqual({
    value: '?set=matinee',
    verdictClass: 'ac-status ac-status--err',
    verdict: 'Failed',
    badge: '1 parameters',
    note: 'ac-notice ac-notice--error',
    say: 'That link cannot be built.',
  });
});

test('destroy is the inverse of create', async ({ page }) => {
  await page.locator('[data-ac-rp-run]').click();
  await expect(page.locator('[data-ac-rp-log] li')).toHaveCount(5);

  await page.evaluate(() => document.querySelector('[data-ac-result-panel]')._acResultPanel.destroy());
  await page.locator('[data-ac-rp-reset]').click();

  // The listener is gone, so the panel still holds the built result.
  await expect(page.locator('[data-ac-rp-case="quiet"] .ac-result__value')).toHaveText(URL_VALUE);
});

/* --- across the page ------------------------------------------------------- */

test('every tab stop on the demo has an accessible name', async ({ page }) => {
  // The clamp in example 2 uses `overflow: clip` because clip makes no scroll
  // container at all. `hidden` would make one only script can scroll, which
  // silently scrolls a focused descendant into view. (It does not add a tab stop
  // -- corrected while building Prose Surface, which measures it.)
  const grid = page.locator('.ac-demo-grid');
  await grid.locator('[data-ac-rp-run]').focus();

  const seen = [];
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() =>
      document.activeElement.closest('.ac-demo-grid') ? document.activeElement.tagName : null,
    );
    if (!inside) break;
    seen.push(inside);
    expect(await page.locator(':focus').evaluate((el) => el.textContent.trim().length)).toBeGreaterThan(0);
  }

  expect(seen.every((tag) => tag === 'BUTTON')).toBe(true);
});

test('under forced colors the accents collapse and the words are what is left', async ({
  page,
}) => {
  // page.emulateMedia, not test.use({ forcedColors }) — the latter is accepted
  // and silently ignored in this setup, so every assertion passes for the
  // wrong reason.
  await page.emulateMedia({ forcedColors: 'active' });

  const panel = page.locator('.ac-demo').first().locator('.ac-result');
  const colors = await panel.evaluate((el) =>
    ['.ac-status', '.ac-badge', '.ac-notice__prefix'].map(
      (sel) => getComputedStyle(el.querySelector(sel)).color,
    ),
  );
  expect(new Set(colors).size).toBe(1);

  // The words did not depend on the accent.
  await expect(panel.locator('.ac-status__text')).toHaveText('Ready');
  await expect(panel.locator('.ac-notice__prefix')).toHaveText('Warning:');
  expect(await spoken(page, '.ac-demo .ac-badge')).toBe('3 parameters');

  // A control still has to read as a control.
  const button = page.locator('[data-ac-rp-case="told"] [data-ac-rp-copy]');
  await expect(button).toHaveCSS('border-style', 'dashed');
  expect(await button.evaluate((el) => getComputedStyle(el).color)).not.toBe(colors[0]);
});

test('reduced motion removes the button transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();

  const duration = await page
    .locator('[data-ac-rp-run]')
    .evaluate((el) => getComputedStyle(el).transitionDuration);

  expect(duration.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});

test('every interactive target clears the 24px floor', async ({ page }) => {
  const boxes = await page
    .locator('.ac-demo-grid button')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => Math.min(r.width, r.height)));

  expect(boxes.length).toBeGreaterThan(0);
  boxes.forEach((side) => expect(side).toBeGreaterThanOrEqual(24));
});

test('nothing overflows sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.locator('[data-ac-rp-run]').click();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
