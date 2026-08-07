import { test, expect } from '@playwright/test';

const PAGE = 'components/data-table/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* The page's readouts are written by hand — this component has no JavaScript to
   compute them with. Every one of them is asserted here against the real
   accessibility tree, so a claim on the page cannot drift away from what the
   browser does. Typography's heading list is the same arrangement.

   Roles come from ariaSnapshot rather than from a selector: the whole subject
   is that a cell and a header look identical and are not the same node. */

const cssNumber = (value) => parseFloat(String(value));

/** The role Chromium reports for one element. `- cell "Price: $18"` -> `cell`. */
async function roleOf(locator) {
  const snapshot = (await locator.ariaSnapshot()).trim();
  const match = snapshot.match(/^-\s+'?([a-z]+)/);
  return match ? match[1] : snapshot;
}

/** The text a readout on the page claims. */
const readout = (page, key) => page.locator(`[data-ac-dt-out="${key}"]`);

/* --- the contract -------------------------------------------------------- */

test('the caption is the table name, and the region shares it', async ({ page }) => {
  const table = page.locator('#dt1-cap').locator('xpath=ancestor::table');
  await expect(table).toHaveAccessibleName('Stock by item');

  const region = page.getByRole('region', { name: 'Stock by item', exact: true });
  await expect(region).toHaveCount(1);
  await expect(region).toHaveAttribute('tabindex', '0');
});

test('the specimen exposes headers in both directions', async ({ page }) => {
  const table = page.locator('#dt1-cap').locator('xpath=ancestor::table');

  await expect(table.getByRole('columnheader')).toHaveCount(4);
  await expect(table.getByRole('rowheader')).toHaveCount(4);
  await expect(table.getByRole('row')).toHaveCount(5);
  await expect(table.getByRole('columnheader', { name: 'In stock', exact: true })).toHaveCount(1);
  await expect(table.getByRole('rowheader', { name: 'Office chair', exact: true })).toHaveCount(1);
});

test('the number columns are right aligned on the header as well as the cells', async ({ page }) => {
  const table = page.locator('#dt1-cap').locator('xpath=ancestor::table');
  const align = (loc) => loc.evaluate((el) => getComputedStyle(el).textAlign);

  expect(await align(table.getByRole('columnheader', { name: 'In stock' }))).toBe('right');
  expect(await align(table.getByRole('rowheader', { name: 'Desk lamp' }))).toBe('left');
});

/* --- example 2 · the card restyle ----------------------------------------- */

test('stacked cells stop sharing a top edge', async ({ page }) => {
  const tops = (id) =>
    page.locator(id).evaluate((cell) =>
      Array.from(cell.closest('tr').children).map((c) => Math.round(c.getBoundingClientRect().top)),
    );

  const rows = await tops('#dt2a-cell');
  const cards = await tops('#dt2b-cell');

  expect(new Set(rows).size).toBe(1);
  expect(new Set(cards).size).toBe(cards.length);

  await expect(readout(page, 'cards-align-rows')).toHaveText('yes');
  await expect(readout(page, 'cards-align-cards')).toHaveText('no');
});

test('the data-label is folded into the cell name, and the header still says it', async ({ page }) => {
  await expect(page.locator('#dt2a-cell')).toHaveAccessibleName('37');
  // ::before is part of the accessible name, so the column is now in the cell
  // as well as in the header it is still associated with.
  await expect(page.locator('#dt2b-cell')).toHaveAccessibleName('In stock: 37');

  const cards = page.locator('#dt2b-cap').locator('xpath=ancestor::table');
  // Clipped, not hidden -- so the columnheader is still in the tree, which is
  // exactly why the name is announced twice.
  await expect(cards.getByRole('columnheader', { name: 'In stock', exact: true })).toHaveCount(1);

  await expect(readout(page, 'cards-name-rows')).toHaveText('37');
  await expect(readout(page, 'cards-name-cards')).toHaveText('In stock: 37');
  await expect(readout(page, 'cards-head-rows')).toHaveText('In stock');
  await expect(readout(page, 'cards-head-cards')).toHaveText('In stock');
});

test('display: block no longer drops the roles in Chromium', async ({ page }) => {
  // The page says so, and this is the assertion behind it. If a future Chromium
  // goes back to demoting the restyled table, this fails and the note on the
  // page has to change with it.
  const cards = page.locator('#dt2b-cap').locator('xpath=ancestor::table');
  const snapshot = await cards.ariaSnapshot();

  expect(snapshot).toContain('table "Stock, cards"');
  expect(snapshot).toContain('rowheader "Office chair"');
  expect(snapshot).toContain('columnheader "In stock"');
});

/* --- example 3 · which cell is a header ----------------------------------- */

test('a bold row is a row of cells', async ({ page }) => {
  expect(await roleOf(page.locator('#dt3a-cell'))).toBe('cell');
  expect(await roleOf(page.locator('#dt3a-row'))).toBe('cell');
  await expect(readout(page, 'head-col-none')).toHaveText('cell');
  await expect(readout(page, 'head-row-none')).toHaveText('cell');

  // Nothing on screen tells it apart from the table that gets it right: the
  // fake header row carries the same weight and the same fill.
  const weight = (id) => page.locator(id).evaluate((el) => getComputedStyle(el).fontWeight);
  const fake = page.locator('.ac-dt-fake-head tr:first-child td').first();
  const real = page.locator('.ac-table__head').first();
  expect(await fake.evaluate((el) => getComputedStyle(el).fontWeight)).toBe(
    await real.evaluate((el) => getComputedStyle(el).fontWeight),
  );
  expect(await weight('#dt3c-row')).toBe('700');
});

test('column headers alone leave the row anonymous', async ({ page }) => {
  const table = page.locator('#dt3b-cell').locator('xpath=ancestor::table');
  expect(await roleOf(table.getByRole('columnheader', { name: 'In stock' }))).toBe('columnheader');
  expect(await roleOf(page.locator('#dt3b-row'))).toBe('cell');

  await expect(readout(page, 'head-col-half')).toHaveText('columnheader');
  await expect(readout(page, 'head-row-half')).toHaveText('cell');
});

test('scope both ways names the cell from two directions', async ({ page }) => {
  const table = page.locator('#dt3c-cell').locator('xpath=ancestor::table');
  expect(await roleOf(table.getByRole('columnheader', { name: 'In stock' }))).toBe('columnheader');
  expect(await roleOf(page.locator('#dt3c-row'))).toBe('rowheader');

  await expect(readout(page, 'head-col-both')).toHaveText('columnheader');
  await expect(readout(page, 'head-row-both')).toHaveText('rowheader');
});

/* --- example 4 · the scroll wrapper --------------------------------------- */

test('both wrappers really scroll, so both are the same problem', async ({ page }) => {
  const overflow = (id) =>
    page.locator(id).evaluate((el) => el.scrollWidth - el.clientWidth);

  expect(await overflow('#dt4a-wrap')).toBeGreaterThan(0);
  expect(await overflow('#dt4b-wrap')).toBeGreaterThan(0);
});

test('the bare wrapper is a tab stop with no role and no name', async ({ page }) => {
  // Chromium hands any scroll container a stop with no tabindex at all. The
  // walk is made with real Tab presses, starting from the stop before it.
  await page.locator('.ac-table-scroll').nth(2).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#dt4a-wrap')).toBeFocused();

  const bare = page.locator('#dt4a-wrap');
  await expect(bare).not.toHaveAttribute('role', /.+/);
  await expect(bare).toHaveAccessibleName('');

  await page.keyboard.press('Tab');
  await expect(page.locator('#dt4b-wrap')).toBeFocused();
});

test('the named wrapper announces, and shows a ring when it takes focus', async ({ page }) => {
  const named = page.locator('#dt4b-wrap');
  await expect(named).toHaveAttribute('role', 'region');
  await expect(named).toHaveAccessibleName('Stock by month');

  await named.focus();
  const width = await named.evaluate((el) => getComputedStyle(el).outlineWidth);
  expect(cssNumber(width)).toBeGreaterThanOrEqual(3);

  await expect(readout(page, 'scroll-named')).toHaveText('Stock by month, region');
  await expect(readout(page, 'scroll-bare')).toHaveText(/no role, no name/);
});

/* --- example 5 · the name -------------------------------------------------- */

test('only a caption names the table', async ({ page }) => {
  await expect(page.locator('#dt5a')).toHaveAccessibleName('');
  await expect(page.locator('#dt5b')).toHaveAccessibleName(''); // the <p> names nothing
  await expect(page.locator('#dt5c')).toHaveAccessibleName('Stock');
  await expect(page.locator('#dt5d')).toHaveAccessibleName('Stock'); // clipped, still the name

  await expect(readout(page, 'name-none')).toHaveText('—');
  await expect(readout(page, 'name-p')).toHaveText('—');
  await expect(readout(page, 'name-caption')).toHaveText('Stock');
  await expect(readout(page, 'name-clipped')).toHaveText('Stock');
});

test('the clipped caption is off screen and the visible one is not', async ({ page }) => {
  const box = await page.locator('#dt5d caption').boundingBox();
  expect(box.width).toBeLessThanOrEqual(1);
  expect(box.height).toBeLessThanOrEqual(1);

  const visible = await page.locator('#dt5c caption').boundingBox();
  expect(visible.height).toBeGreaterThan(1);
});

/* --- states --------------------------------------------------------------- */

test('the header row is carried by more than its fill', async ({ page }) => {
  const head = page.locator('#dt1-cap').locator('xpath=ancestor::table').locator('.ac-table__head').first();
  const cell = page.locator('#dt1-cap').locator('xpath=ancestor::table').locator('td').first();

  const read = (loc, prop) => loc.evaluate((el, p) => getComputedStyle(el)[p], prop);

  expect(await read(head, 'backgroundColor')).not.toBe(await read(cell, 'backgroundColor'));
  expect(await read(head, 'fontWeight')).toBe('700');
  expect(cssNumber(await read(head, 'borderBottomWidth'))).toBeGreaterThan(
    cssNumber(await read(cell, 'borderBottomWidth')),
  );
});

test('the table declares no transitions, so the motion gate has nothing to do', async ({ page }) => {
  const durations = await page
    .locator('.ac-table')
    .first()
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

/* --- environments --------------------------------------------------------- */

test.describe('forced colors', () => {
  test.beforeEach(async ({ page }) => {
    // test.use({ forcedColors }) is accepted and ignored in this setup.
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(PAGE);
  });

  test('the header row survives the dropped tint', async ({ page }) => {
    const table = page.locator('#dt1-cap').locator('xpath=ancestor::table');
    const head = table.locator('.ac-table__head').first();
    const cell = table.locator('td').first();

    const read = (loc, prop) => loc.evaluate((el, p) => getComputedStyle(el)[p], prop);

    expect(await read(head, 'backgroundColor')).not.toBe(await read(cell, 'backgroundColor'));
    expect(cssNumber(await read(head, 'borderBottomWidth'))).toBeGreaterThan(
      cssNumber(await read(cell, 'borderBottomWidth')),
    );
  });

  test('the fake header row is not repaired by the [FORCED] block', async ({ page }) => {
    // The good rule matches header cells only, so the drawn one keeps its own
    // tint and never becomes a system button face. A broken example its own
    // file repairs stops being an example.
    const fake = page.locator('.ac-dt-fake-head tr:first-child td').first();
    const real = page.locator('#dt1-cap').locator('xpath=ancestor::table').locator('.ac-table__head').first();
    const bg = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await bg(fake)).not.toBe(await bg(real));
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

  test('the wide table scrolls inside its wrapper instead of widening the page', async ({ page }) => {
    await page.goto(PAGE);
    const wrap = page.locator('#dt4b-wrap');
    const size = await wrap.evaluate((el) => ({
      client: el.clientWidth,
      scroll: el.scrollWidth,
    }));
    expect(size.scroll).toBeGreaterThan(size.client);
    expect(size.client).toBeLessThanOrEqual(320);
  });
});
