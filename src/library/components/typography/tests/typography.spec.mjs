import { test, expect } from '@playwright/test';

const PAGE = 'components/typography/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

// This component has no ARIA, no JavaScript and no keyboard map of its own. What
// it claims is that eight classes carry appearance and nothing else, that three
// specific failures are on the page and are really failing, and that four
// numbers quoted in the docs are the numbers the browser computes. So every
// assertion here is on the accessibility tree, on computed style, or on
// geometry.
//
// Locators are scoped to `.ac-demo-grid` throughout -- the site shell has its own
// headings and links, and the code panel below the demo repeats every class name
// on this page as source text. The selector matches two grids, the correct
// example and the mistakes, so anything reaching for the grid element itself is
// queried from the document instead.
const demo = (page) => page.locator('.ac-demo-grid');

/** Computed font sizes for the five sizing classes, in scale order. */
const scaleSizes = (page) =>
  page.evaluate(() =>
    ['ac-t-h1', 'ac-t-h2', 'ac-t-h3', 'ac-t-h4', 'ac-t-body'].map((cls) =>
      parseFloat(getComputedStyle(document.querySelector(`.ac-demo-grid .${cls}`)).fontSize),
    ),
  );

/** WCAG 2.x contrast ratio between two computed `rgb(...)` strings. */
function ratio(a, b) {
  const lum = (css) => {
    const [r, g, b_] = css.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    const lin = (c) => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b_);
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** What `el` is actually painted in, accounting for inherited opacity. */
const paintedColor = (locator) =>
  locator.evaluate((el) => {
    const parse = (css) => css.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    const over = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));

    // Walk up for the nearest painted background, then composite this element's
    // own opacity onto it -- which is the whole reason example 3's failure is
    // invisible to a linter.
    let bgEl = el;
    let bg = [0, 0, 0];
    while (bgEl) {
      const c = getComputedStyle(bgEl).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') {
        bg = parse(c);
        break;
      }
      bgEl = bgEl.parentElement;
    }

    const s = getComputedStyle(el);
    const fg = over(parse(s.color), bg, Number(s.opacity));
    return { color: `rgb(${fg.join(',')})`, background: `rgb(${bg.join(',')})` };
  });

/* --- example 1 · the scale ------------------------------------------------- */

test('the scale descends, and every step is set in rem', async ({ page }) => {
  const sizes = await scaleSizes(page);

  // Non-increasing, not strictly decreasing: h4 is deliberately body size and is
  // told apart by weight. A heading set smaller than the text it introduces
  // reads as a caption.
  for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]);
  expect(sizes[0]).toBeGreaterThan(sizes[4]);

  const [h4Weight, bodyWeight] = await page.evaluate(() =>
    ['ac-t-h4', 'ac-t-body'].map((cls) =>
      Number(getComputedStyle(document.querySelector(`.ac-demo-grid .${cls}`)).fontWeight),
    ),
  );
  expect(h4Weight).toBeGreaterThan(bodyWeight);

  // Then the claim rem actually makes: change the root font size, which is what
  // a browser's own preference does, and every step moves with it. A px scale
  // would not move at all. Full-page zoom is not this -- it scales px too, which
  // is why a px scale survives the obvious test.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '24px';
  });
  const bigger = await scaleSizes(page);
  bigger.forEach((px, i) => expect(px).toBeGreaterThan(sizes[i]));
});

test('body copy ships above the line-height SC 1.4.12 lets a reader force', async ({ page }) => {
  const body = demo(page).locator('.ac-t-body').first();
  const { size, height } = await body.evaluate((el) => {
    const s = getComputedStyle(el);
    return { size: parseFloat(s.fontSize), height: parseFloat(s.lineHeight) };
  });
  // 1.5 is the floor the reader is allowed to impose. Shipping above it means
  // their setting changes nothing here.
  expect(height / size).toBeGreaterThanOrEqual(1.5);
});

test('muted sets a color and nothing else, so it composes', async ({ page }) => {
  const plain = demo(page).locator('.ac-t-body').first();
  const muted = demo(page).locator('.ac-t-body.ac-t-muted').first();

  const read = (l) =>
    l.evaluate((el) => {
      const s = getComputedStyle(el);
      return { color: s.color, size: s.fontSize, weight: s.fontWeight, family: s.fontFamily };
    });

  const [a, b] = [await read(plain), await read(muted)];
  expect(b.color).not.toBe(a.color);
  // If it changed anything but the color it could not be stacked on a heading.
  expect(b.size).toBe(a.size);
  expect(b.weight).toBe(a.weight);
  expect(b.family).toBe(a.family);
});

test('mono keeps the size it was given', async ({ page }) => {
  const mono = demo(page).locator('.ac-t-mono').first();
  const { own, parent, family } = await mono.evaluate((el) => ({
    own: parseFloat(getComputedStyle(el).fontSize),
    parent: parseFloat(getComputedStyle(el.parentElement).fontSize),
    family: getComputedStyle(el).fontFamily,
  }));

  // font-size: 1em, deliberately. Browsers keep a separate, smaller default for
  // the generic `monospace` family, and a relative size compounds when code sits
  // inside code. Neither happens if the class refuses to resize anything.
  expect(own).toBe(parent);
  expect(family).toMatch(/mono/i);
});

test('long unbroken words cannot widen the page', async ({ page }) => {
  const wrap = await demo(page)
    .locator('.ac-t-h1')
    .first()
    .evaluate((el) => getComputedStyle(el).overflowWrap);
  // SC 1.4.10: an order id at h1 size is wider than a 320px viewport, and an
  // unbroken word does not wrap without this.
  expect(wrap).toBe('break-word');
});

/* --- example 2 · a heading class on a div ------------------------------------ */

test('the two identical lines are one heading and one paragraph', async ({ page }) => {
  const real = demo(page).getByRole('heading', { name: 'Activity this month' });
  await expect(real).toBeVisible();
  // h5, because the demo title above it is the h4. The level comes from the
  // document, and the size came from the class -- which is the whole example.
  expect(await real.evaluate((el) => el.tagName)).toBe('H5');

  // Same class, same pixels, no role. This is the failure, live.
  const fake = demo(page).getByText('Activity last month', { exact: true });
  await expect(fake).toBeVisible();
  expect(await fake.evaluate((el) => el.tagName)).toBe('DIV');
  await expect(demo(page).getByRole('heading', { name: 'Activity last month' })).toHaveCount(0);
});

test('the two lines really are visually identical', async ({ page }) => {
  // If they ever stop matching, example 2 stops making its argument -- the
  // reader would be able to tell them apart on screen, which is exactly what
  // they cannot do.
  //
  // text-transform and text-shadow are in the list because they are what caught
  // this: the site's own h1-h6 rules cascade into every property .ac-t-h2 does
  // not set, so the <h4> rendered in uppercase with a glow and the <div> did
  // not. The class declares both now.
  const read = (l) =>
    l.evaluate((el) => {
      const s = getComputedStyle(el);
      return [
        s.fontSize,
        s.fontWeight,
        s.lineHeight,
        s.color,
        s.fontFamily,
        s.textTransform,
        s.textShadow,
        s.letterSpacing,
      ].join('|');
    });

  const real = demo(page).getByRole('heading', { name: 'Activity this month' });
  const fake = demo(page).getByText('Activity last month', { exact: true });
  expect(await read(fake)).toBe(await read(real));
});

test('the printed heading list matches the real accessibility tree', async ({ page }) => {
  // Found by the list it contains rather than by position, so splitting the page
  // into two sections cannot silently point this at a different example.
  const example = demo(page)
    .locator('.ac-demo')
    .filter({ has: page.locator('[data-ac-t-outline]') });

  // The list on the page is written by hand. This is what stops it drifting: pull
  // the actual headings out of the same example and compare.
  const actual = await example.evaluate((el) =>
    [...el.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')]
      .filter((h) => !h.classList.contains('ac-demo__title'))
      .map((h) => `${h.tagName.toLowerCase()} ${h.textContent.trim()}`),
  );

  const printed = await example
    .locator('[data-ac-t-outline] li')
    .evaluateAll((items) => items.map((li) => li.textContent.trim().replace(/\s+/g, ' ')));

  expect(printed).toEqual(actual);
  expect(printed).toHaveLength(1);
});

/* --- example 3 · muted text has a floor (SC 1.4.3) -------------------------- */

test('muted text clears 4.5:1 as rendered, whatever theme is loaded', async ({ page }) => {
  const muted = demo(page).locator('.ac-t-body.ac-t-muted').first();
  const { color, background } = await paintedColor(muted);
  // SC 1.4.3. De-emphasized is not exempt, and the site loads a theme, so this
  // is the criterion measured against whatever the theme resolved to -- not
  // against the standalone defaults below.
  expect(ratio(color, background)).toBeGreaterThanOrEqual(4.5);
});

test('the 9.5:1 the docs quote is the library default pairing', async ({ page }) => {
  // A component pasted into a bare app gets the literal fallbacks at the end of
  // the token chain and nothing else, so that pair is what the quoted number is
  // about. Read them out of tokens.css rather than retyping them here, or the
  // number in docs.md and the color in the CSS drift apart silently -- which is
  // the exact failure this example warns about.
  const css = await page.evaluate(async () =>
    (await fetch(new URL('../../library/tokens/tokens.css', location.href))).text(),
  );

  const literal = (name) =>
    css.match(new RegExp(`--ac-${name}:\\s*var\\(--[\\w-]+,\\s*(#[0-9a-f]{6})`, 'i'))[1];
  const rgb = (hex) =>
    `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',')})`;

  const r = ratio(rgb(literal('text-muted')), rgb(literal('surface')));
  expect(r).toBeGreaterThan(9.4);
  expect(r).toBeLessThan(9.6);
});

test('the opacity paragraph is a live SC 1.4.3 failure', async ({ page }) => {
  const faint = demo(page).locator('.ac-t-broken-faint');
  const { color, background } = await paintedColor(faint);

  // Under 4.5:1 -- and the ratio exists nowhere in the CSS, which is the point:
  // the declaration names no color, so nothing can lint it.
  //
  // 4.0, not 4.5. The shared gate asserts axe still reports this node, so the
  // example has to fail its threshold by a margin rather than sit against it.
  // At opacity 0.45 the default theme measured 4.36:1 and the gate's verdict
  // came down to rounding. Assert the margin here, where the cause is, rather
  // than let it surface as axe going quiet in the gate.
  expect(ratio(color, background)).toBeLessThan(4.0);
  expect(await faint.evaluate((el) => getComputedStyle(el).color)).toBe(
    await demo(page).locator('.ac-t-body').first().evaluate((el) => getComputedStyle(el).color),
  );
});

/* --- example 4 · a link is not a color (SC 1.4.1) --------------------------- */

test('the good link is underlined, so its cue is not the color', async ({ page }) => {
  const link = demo(page).locator('.ac-t-link').first();
  const s = await link.evaluate((el) => {
    const c = getComputedStyle(el);
    return { line: c.textDecorationLine, thickness: c.textDecorationThickness };
  });

  expect(s.line).toContain('underline');
  expect(s.thickness).not.toBe('0px');
});

test('the color-only link fails the 3:1 test against the text beside it', async ({ page }) => {
  const broken = demo(page).locator('.ac-t-broken-link');
  await expect(broken).toHaveCSS('text-decoration-line', 'none');

  const linkColor = await broken.evaluate((el) => getComputedStyle(el).color);
  const textColor = await broken.evaluate((el) => getComputedStyle(el.parentElement).color);
  const { background } = await paintedColor(broken);

  // Against the background it passes comfortably, which is the number people
  // check and the reason this ships.
  expect(ratio(linkColor, background)).toBeGreaterThan(4.5);
  // Against the text one word away it does not, which is the number SC 1.4.1
  // asks about. docs.md quotes 1.27:1 for this theme.
  expect(ratio(linkColor, textColor)).toBeLessThan(3);
});

/* --- example 5 · text spacing and reflow (SC 1.4.12, 1.4.10) ---------------- */

/** Does this box hold all of its text? */
const clipped = (locator) =>
  locator.evaluate((el) => el.scrollHeight > el.clientHeight + 1);

/**
 * Unused vertical space, in lines. scrollHeight floors at clientHeight, so it
 * cannot answer this — the content has to be measured directly.
 */
const headroomInLines = (locator) =>
  locator.evaluate((el) => {
    const ps = [...el.querySelectorAll('.ac-t-prose')];
    const line = parseFloat(getComputedStyle(ps[0]).lineHeight);
    const content = ps.reduce(
      (n, p) => n + p.getBoundingClientRect().height + parseFloat(getComputedStyle(p).marginBottom),
      0,
    );
    return (el.clientHeight - content) / line;
  });

test('both boxes hold their text until the reader changes the spacing', async ({ page }) => {
  await expect(demo(page).locator('#t-spacing')).not.toBeChecked();
  expect(await clipped(demo(page).locator('.ac-t-broken-clip'))).toBe(false);
  expect(await clipped(demo(page).locator('.ac-t-box:not(.ac-t-broken-clip)'))).toBe(false);
});

test('the clipping box has a line to spare before the reader touches anything', async ({ page }) => {
  // The example only proves its point if the clip is caused by the spacing.
  // Fonts differ by machine -- a box tuned to the exact line count wraps to one
  // more line wherever the stack falls through to a wider face, and then it
  // clips at rest and the demo argues for nothing. Assert the margin, not just
  // the outcome, so the drift fails here rather than on someone else's CI.
  expect(await headroomInLines(demo(page).locator('.ac-t-broken-clip'))).toBeGreaterThan(1);
});

test('the fixed-height box loses the end of the sentence, and min-height does not', async ({ page }) => {
  const check = demo(page).locator('#t-spacing');
  const broken = demo(page).locator('.ac-t-broken-clip');
  const good = demo(page).locator('.ac-t-box:not(.ac-t-broken-clip)');

  const before = (await good.boundingBox()).height;
  await check.check();

  // SC 1.4.12: the reader is allowed to force all four values. `height` plus
  // overflow: hidden takes the rest of the sentence, with no scrollbar and
  // nothing to see in a screenshot.
  expect(await clipped(broken)).toBe(true);
  expect(await clipped(good)).toBe(false);
  expect((await good.boundingBox()).height).toBeGreaterThan(before);
});

test('the toggle applies all four SC 1.4.12 values', async ({ page }) => {
  await demo(page).locator('#t-spacing').check();

  const p = demo(page).locator('.ac-t-broken-clip .ac-t-prose').first();
  const s = await p.evaluate((el) => {
    const c = getComputedStyle(el);
    const size = parseFloat(c.fontSize);
    return {
      line: parseFloat(c.lineHeight) / size,
      letter: parseFloat(c.letterSpacing) / size,
      word: parseFloat(c.wordSpacing) / size,
      after: parseFloat(c.marginBottom) / size,
    };
  });

  expect(s.line).toBeGreaterThanOrEqual(1.5);
  expect(s.letter).toBeGreaterThanOrEqual(0.12);
  expect(s.word).toBeGreaterThanOrEqual(0.16);
  expect(s.after).toBeGreaterThanOrEqual(2);
});

test('nothing here widens the page at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  // SC 1.4.10. The risks are the fluid h1, the two-column specimen sheet, and
  // the side-by-side pairs in examples 2 and 5.
  await demo(page).locator('#t-spacing').check();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('the spacing checkbox is a real target', async ({ page }) => {
  // SC 2.5.8 asks for 24x24, and a native checkbox is 13px until you say
  // otherwise.
  const box = await demo(page).locator('#t-spacing').boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(24);
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

  test('both links lose their color and only one is still identifiable', async ({ page }) => {
    const good = demo(page).locator('.ac-t-link').first();
    const broken = demo(page).locator('.ac-t-broken-link');

    // LinkText for both, so the color cue is gone from the pair at once.
    expect(await good.evaluate((el) => getComputedStyle(el).color)).toBe(
      await broken.evaluate((el) => getComputedStyle(el).color),
    );
    await expect(good).toHaveCSS('text-decoration-line', 'underline');
    await expect(broken).toHaveCSS('text-decoration-line', 'none');
  });

  test('the faint paragraph is still faint, because opacity is not dropped', async ({ page }) => {
    const faint = demo(page).locator('.ac-t-broken-faint');
    // The one failure on this page high contrast mode does not rescue, and the
    // reason to set a color rather than an opacity.
    expect(await faint.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(1);
  });

  test('every text class is drawn in a system color', async ({ page }) => {
    const canvasText = await demo(page)
      .locator('.ac-t-key')
      .first()
      .evaluate((el) => getComputedStyle(el).color);

    for (const cls of ['ac-t-h1', 'ac-t-h2', 'ac-t-h3', 'ac-t-h4', 'ac-t-body', 'ac-t-muted']) {
      const color = await demo(page)
        .locator(`.${cls}`)
        .first()
        .evaluate((el) => getComputedStyle(el).color);
      expect(color, cls).toBe(canvasText);
    }
  });
});
