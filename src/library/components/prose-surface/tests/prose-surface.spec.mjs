import { test, expect } from '@playwright/test';

const PAGE = 'components/prose-surface/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* The page's readouts are written by hand — this component has no JavaScript to
   compute them with. Every one of them is asserted here against the real
   accessibility tree, so a claim on the page cannot drift away from what the
   browser does. Data Table and Typography are the same arrangement.

   Roles come from ariaSnapshot rather than from a selector, because the whole
   subject is that a quote and a bordered div, or a list and three paragraphs,
   are indistinguishable on screen and are not the same nodes. */

const cssNumber = (value) => parseFloat(String(value));

/** The text a readout on the page claims. */
const readout = (page, key) => page.locator(`[data-ac-ps-out="${key}"]`);

/** Where the Tab key goes next, as `TAG#id`. */
const nextStop = async (page) => {
  await page.keyboard.press('Tab');
  return page.evaluate(() => `${document.activeElement.tagName}#${document.activeElement.id || '-'}`);
};

/* --- the contract -------------------------------------------------------- */

test('the surface is a named region, and the name is its own first heading', async ({ page }) => {
  const surface = page.locator('#ps1');
  await expect(surface).toHaveAttribute('role', 'region');
  await expect(surface).toHaveAttribute('tabindex', '0');
  await expect(surface).toHaveAccessibleName('Notes from the basement');

  // Written once: the name comes from the heading that is already on screen.
  await expect(page.locator('#ps1-h')).toHaveText('Notes from the basement');
});

test('the surface scrolls vertically and never sideways', async ({ page }) => {
  const size = await page.locator('#ps1').evaluate((el) => ({
    x: el.scrollWidth - el.clientWidth,
    y: el.scrollHeight - el.clientHeight,
  }));
  expect(size.y).toBeGreaterThan(0);
  expect(size.x).toBe(0);
});

test('the surface shows a ring when it takes focus', async ({ page }) => {
  const surface = page.locator('#ps1');
  await surface.focus();
  const ring = await surface.evaluate((el) => getComputedStyle(el).outlineWidth);
  expect(cssNumber(ring)).toBeGreaterThanOrEqual(3);
});

test('the specimen carries the whole flow, with the structure intact', async ({ page }) => {
  const snapshot = await page.locator('#ps1').ariaSnapshot();

  expect(snapshot).toContain('region "Notes from the basement"');
  expect(snapshot).toContain('heading "Notes from the basement" [level=4]');
  expect(snapshot).toContain('heading "Doors at nine" [level=5]');
  expect(snapshot).toContain('blockquote');
  expect(snapshot).toContain('listitem');
  expect(snapshot).toContain('separator');
  expect(snapshot).toContain('region "Setlist query, sample"');
});

test('a host page h1-h6 rule cannot leak into a surface heading', async ({ page }) => {
  // The shell's own h4 is uppercase, letter-spaced and muted. A class beats a
  // bare element selector only for the properties it declares, so every one of
  // them is declared. Typography owns the finding.
  const inside = await page.locator('#ps1-h').evaluate((el) => {
    const s = getComputedStyle(el);
    return { transform: s.textTransform, shadow: s.textShadow, spacing: s.letterSpacing };
  });
  expect(inside).toEqual({ transform: 'none', shadow: 'none', spacing: 'normal' });

  // ... and the page's own h4 outside the surface still has them, so the guard
  // is doing work rather than agreeing with the host by luck.
  const outside = await page.evaluate(() => {
    const probe = document.createElement('h4');
    probe.textContent = 'probe';
    document.querySelector('main, body').append(probe);
    const s = getComputedStyle(probe);
    const out = { transform: s.textTransform, spacing: s.letterSpacing };
    probe.remove();
    return out;
  });
  expect(outside.transform).toBe('uppercase');
});

/* --- example 2 · a code block inside prose --------------------------------- */

test('a <pre> with no overflow of its own takes the surface sideways', async ({ page }) => {
  const bare = await page
    .locator('#ps2a')
    .evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(bare).toBeGreaterThan(0);

  for (const id of ['#ps2b', '#ps2c']) {
    const fixed = await page.locator(id).evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(fixed).toBe(0);
  }

  await expect(readout(page, 'code-side-bare')).toHaveText('yes');
  await expect(readout(page, 'code-side-scroll')).toHaveText('no');
  await expect(readout(page, 'code-side-named')).toHaveText('no');
});

test('the scrolling <pre> is a stop whether or not anyone asked for one', async ({ page }) => {
  // Chromium hands a scroll container a stop with no tabindex at all, so the
  // walk is made with real Tab presses rather than by listing what looks
  // focusable. Tabs' [FOCUS] block is the precedent.
  await page.locator('#ps2a').focus();
  expect(await nextStop(page)).toBe('DIV#ps2b'); // nothing inside the bare case

  await page.locator('#ps2b').focus();
  expect(await nextStop(page)).toBe('PRE#ps2b-pre'); // the free stop
  expect(await nextStop(page)).toBe('DIV#ps2c');

  await page.locator('#ps2c').focus();
  expect(await nextStop(page)).toBe('PRE#ps2c-pre'); // the declared one

  await expect(readout(page, 'code-stop-bare')).toHaveText('0');
  await expect(readout(page, 'code-stop-scroll')).toHaveText(/no role, no name/);
  await expect(readout(page, 'code-stop-named')).toHaveText(/Setlist query, region/);
});

test('only the named <pre> announces as anything', async ({ page }) => {
  const bare = page.locator('#ps2b-pre');
  await expect(bare).not.toHaveAttribute('role', /.+/);
  await expect(bare).toHaveAccessibleName('');

  const named = page.locator('#ps2c-pre');
  await expect(named).toHaveAttribute('role', 'region');
  await expect(named).toHaveAccessibleName('Setlist query');
});

test("the named <pre>'s ring is inset, so the surface cannot clip it", async ({ page }) => {
  const pre = page.locator('#ps2c-pre');
  await pre.focus();
  const ring = await pre.evaluate((el) => {
    const s = getComputedStyle(el);
    return { width: s.outlineWidth, offset: s.outlineOffset };
  });
  expect(cssNumber(ring.width)).toBeGreaterThanOrEqual(3);
  expect(cssNumber(ring.offset)).toBeLessThan(0);
});

test('the code never wraps, in any of the three', async ({ page }) => {
  for (const id of ['#ps2a-pre', '#ps2b-pre', '#ps2c-pre']) {
    const ws = await page.locator(id).evaluate((el) => getComputedStyle(el).whiteSpace);
    expect(ws).toBe('pre');
  }
});

/* --- example 3 · the quote and the attribution ----------------------------- */

test('the attribution inside the blockquote is part of the quotation', async ({ page }) => {
  const snapshot = await page.locator('#ps3a').ariaSnapshot();
  expect(snapshot).toContain('blockquote');
  expect(snapshot).toContain('Ruby, on the door');

  await expect(readout(page, 'quote-role-inside')).toHaveText('blockquote');
  await expect(readout(page, 'quote-end-inside')).toHaveText(/Ruby, on the door/);
});

test('a div with a bar quotes nothing', async ({ page }) => {
  const div = page.locator('#ps3b');
  await expect(div.getByRole('blockquote')).toHaveCount(0);
  expect(await div.evaluate((el) => el.tagName)).toBe('DIV');

  await expect(readout(page, 'quote-role-div')).toHaveText(/nothing is quoted/);
});

test('all three quotes are the same shape on screen', async ({ page }) => {
  // The example only makes its point if nothing tells them apart by eye. The
  // failing blockquote needs its own bar and its own margin reset, because the
  // UA's `margin-inline: 40px` survives once there is no <figure> to style.
  const shape = (sel) =>
    page.locator(sel).evaluate((el) => {
      const s = getComputedStyle(el);
      return [
        s.borderInlineStartWidth,
        s.borderInlineStartStyle,
        s.paddingInlineStart,
        s.marginInlineStart,
      ].join(' ');
    });
  const figure = await shape('#ps3c-fig');
  expect(await shape('#ps3a')).toBe(figure);
  expect(await shape('#ps3b')).toBe(figure);
});

test('the figure keeps the attribution out of the quotation', async ({ page }) => {
  const quote = await page.locator('#ps3c').ariaSnapshot();
  expect(quote).toContain('blockquote');
  expect(quote).not.toContain('Ruby, on the door');

  // The figcaption is the figure's name, and it sits beside the quote.
  await expect(page.locator('#ps3c-fig')).toHaveAccessibleName('Ruby, on the door');

  await expect(readout(page, 'quote-role-figure')).toHaveText('blockquote');
  await expect(readout(page, 'quote-end-figure')).toHaveText(/in the morning\.$/);
});

/* --- example 4 · bullets and rules ----------------------------------------- */

test('typed bullets are paragraphs and a bordered div is not a separator', async ({ page }) => {
  const typed = page.locator('#ps4a');
  await expect(typed.getByRole('list')).toHaveCount(0);
  await expect(typed.getByRole('listitem')).toHaveCount(0);
  await expect(typed.getByRole('separator')).toHaveCount(0);

  // The bullet is a character in the text, so it is read as one.
  await expect(typed.locator('.ac-ps-fake-item').first()).toHaveText(/^•/);

  await expect(readout(page, 'flow-list-typed')).toHaveText('0');
  await expect(readout(page, 'flow-rule-typed')).toHaveText('—');
});

test('a real list has a count and an <hr> is a separator', async ({ page }) => {
  const real = page.locator('#ps4b');
  await expect(real.getByRole('list')).toHaveCount(1);
  await expect(real.getByRole('listitem')).toHaveCount(3);
  await expect(real.getByRole('separator')).toHaveCount(1);

  await expect(readout(page, 'flow-list-real')).toHaveText('1, of 3 items');
  await expect(readout(page, 'flow-rule-real')).toHaveText('separator');
});

test('the two dividers are the same line on screen', async ({ page }) => {
  const line = (sel) =>
    page.locator(sel).evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.borderTopWidth} ${s.borderTopStyle}`;
    });
  expect(await line('#ps4a .ac-ps-fake-rule')).toBe(await line('#ps4b hr'));
});

/* --- example 5 · clipping against scrolling -------------------------------- */

test('both boxes hold the same overflow, and only one can be read to the end', async ({ page }) => {
  const box = (id) =>
    page.locator(id).evaluate((el) => {
      el.scrollTop = 0;
      const before = el.scrollTop;
      el.scrollTop = 9999;
      const after = el.scrollTop;
      el.scrollTop = 0;
      return { hidden: el.scrollHeight - el.clientHeight, moved: after - before };
    });

  const clip = await box('#ps5a');
  const scroll = await box('#ps5b');

  // Same content, same height, same distance past the fold.
  expect(clip.hidden).toBe(scroll.hidden);
  expect(clip.hidden).toBeGreaterThan(0);

  await expect(readout(page, 'box-reach-clip')).toHaveText('no');
  await expect(readout(page, 'box-reach-scroll')).toHaveText('yes');
});

test('the clipped text is still announced, which is what makes it a bug', async ({ page }) => {
  await expect(page.locator('#ps5a-last')).toHaveText(/99 cents/);
  const snapshot = await page.locator('#ps5a').ariaSnapshot();
  expect(snapshot).toContain('99 cents');

  await expect(readout(page, 'box-tree-clip')).toHaveText('yes');
  await expect(readout(page, 'box-tree-scroll')).toHaveText('yes');
});

test('overflow: hidden buys no tab stop, so there is no route in at all', async ({ page }) => {
  // Chromium's free stop is given to a box a person could already scroll --
  // auto and scroll, not hidden. Corrected here; Copyable Result's clamp comment
  // used to say otherwise.
  const probe = (id) =>
    page.locator(id).evaluate((el) => {
      el.focus({ preventScroll: true });
      const got = document.activeElement === el;
      // Focus on something that cannot take it is a no-op, not a move, so put
      // the page back rather than leaving a reader parked here.
      document.activeElement.blur();
      return got;
    });

  expect(await probe('#ps5a')).toBe(false);
  expect(await probe('#ps5b')).toBe(true);
  expect(await page.evaluate(() => document.activeElement.tagName)).toBe('BODY');

  await expect(readout(page, 'box-stop-clip')).toHaveText('no');
  await expect(readout(page, 'box-stop-scroll')).toHaveText(/tabindex="0"/);
});

/* --- the surfaces that are not regions ------------------------------------- */

test('a surface that fits its content is not a region and not a stop', async ({ page }) => {
  // Examples 3 and 4 scroll nothing, so they carry none of the three
  // attributes: a named region is a landmark, and a stop with nothing to
  // scroll is a stop that does nothing.
  for (const id of ['#ps4a', '#ps4b']) {
    const box = page.locator(id);
    await expect(box).not.toHaveAttribute('role', /.+/);
    await expect(box).not.toHaveAttribute('tabindex', /.+/);
    const past = await box.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(past).toBe(0);
  }
});

test('every tab stop inside the demo has a name, except the one being shown', async ({ page }) => {
  const stops = await page.evaluate(() => {
    const grid = document.querySelector('.ac-demo-grid');
    return Array.from(grid.querySelectorAll('[tabindex="0"]')).map((el) => ({
      id: el.id,
      role: el.getAttribute('role'),
      named: Boolean(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')),
    }));
  });
  expect(stops.length).toBeGreaterThan(0);
  for (const stop of stops) {
    expect(stop.role, stop.id).toBe('region');
    expect(stop.named, stop.id).toBe(true);
  }
});

/* --- states ---------------------------------------------------------------- */

test('a link in prose is underlined as well as colored (SC 1.4.1)', async ({ page }) => {
  const link = page.locator('#ps1 a').first();
  const decoration = await link.evaluate((el) => getComputedStyle(el).textDecorationLine);
  expect(decoration).toContain('underline');
});

test('the surface declares no transitions, so the motion gate has nothing to do', async ({ page }) => {
  const durations = await page
    .locator('#ps1')
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  for (const part of durations.split(',')) expect(cssNumber(part)).toBe(0);
});

/* --- the deliberate absence ------------------------------------------------ */

test('nothing on the page announces', async ({ page }) => {
  // `output` is in the selector on purpose: it carries an implicit
  // role="status", so a sweep that greps for role= alone misses it.
  const regions = page.locator(
    '.ac-demo-grid [role="status"], .ac-demo-grid [role="alert"], .ac-demo-grid [role="log"], .ac-demo-grid [aria-live], .ac-demo-grid output',
  );
  await expect(regions).toHaveCount(0);
});

/* --- environments ---------------------------------------------------------- */

test.describe('forced colors', () => {
  test.beforeEach(async ({ page }) => {
    // test.use({ forcedColors }) is accepted and ignored in this setup.
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(PAGE);
  });

  test('the surface and its code block keep a border', async ({ page }) => {
    for (const id of ['#ps1', '#ps2c-pre']) {
      const border = await page.locator(id).evaluate((el) => getComputedStyle(el).borderTopStyle);
      expect(border).toBe('solid');
    }
  });

  test('the separator and the quote rule survive, because both are borders', async ({ page }) => {
    const hr = await page.locator('#ps4b hr').evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(cssNumber(hr)).toBeGreaterThan(0);

    const quote = await page
      .locator('#ps3c-fig')
      .evaluate((el) => getComputedStyle(el).borderInlineStartWidth);
    expect(cssNumber(quote)).toBeGreaterThan(0);
  });

  test('the ring is repainted in a system color', async ({ page }) => {
    const surface = page.locator('#ps1');
    await surface.focus();
    const outline = await surface.evaluate((el) => getComputedStyle(el).outlineColor);

    // Asserted against a measured CanvasText rather than a literal: what the
    // emulated palette resolves to is Chromium's business, and the claim is
    // that the [FORCED] block took effect at all.
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    expect(outline).toBe(canvasText);
  });
});

test.describe('reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);
  });

  test('nothing animates, because nothing animated to begin with', async ({ page }) => {
    const count = await page.evaluate(() => document.querySelectorAll('.ac-prose').length);
    expect(count).toBeGreaterThan(0);
    const animations = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll('.ac-prose')).flatMap((el) => el.getAnimations()).length,
    );
    expect(animations).toBe(0);
  });
});

test.describe('320px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('the page does not scroll sideways (SC 1.4.10)', async ({ page }) => {
    await page.goto(PAGE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the long code line scrolls inside the <pre>, not inside the page', async ({ page }) => {
    await page.goto(PAGE);
    const size = await page.locator('#ps2c-pre').evaluate((el) => ({
      client: el.clientWidth,
      scroll: el.scrollWidth,
    }));
    expect(size.scroll).toBeGreaterThan(size.client);
    expect(size.client).toBeLessThanOrEqual(320);
  });
});
