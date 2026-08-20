import { test, expect } from '@playwright/test';

const PAGE = 'components/tabs/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

/* Every claim on this page is about what the keyboard reaches and what the
   accessibility tree holds, so that is what is asserted — with real Tab
   presses rather than with the page's own walk, which is the thing being
   checked. */

/** Enough of the focused element to identify it in a failure message. */
const active = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    const tag = el.tagName.toLowerCase();
    return {
      id: el.id || '',
      role: el.getAttribute('role') || (tag === 'a' && el.href ? 'link' : tag),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24),
    };
  });

/** Everything Tab reaches inside a widget, starting from a known first stop. */
async function stopsIn(page, widgetSelector, firstId) {
  await page.locator(`#${firstId}`).focus();
  const stops = [await active(page)];

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(
      (sel) => document.querySelector(sel).contains(document.activeElement),
      widgetSelector,
    );
    if (!inside) break;
    stops.push(await active(page));
  }
  return stops;
}

/* --- the contract -------------------------------------------------------- */

test('the tablist is named, and one of its tabs is selected', async ({ page }) => {
  const list = page.locator('#tabs1-tab-1').locator('xpath=..');
  await expect(list).toHaveAttribute('role', 'tablist');
  await expect(list).toHaveAccessibleName('Project 462');

  const tabs = page.locator('.ac-tabs__list[aria-label="Project 462"] [role="tab"]');
  await expect(tabs).toHaveCount(3);
  await expect(page.locator('#tabs1-tab-1')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tabs1-tab-2')).toHaveAttribute('aria-selected', 'false');
  await expect(page.locator('#tabs1-tab-3')).toHaveAttribute('aria-selected', 'false');
});

test('only the selected tab is in the tab order', async ({ page }) => {
  await expect(page.locator('#tabs1-tab-1')).toHaveAttribute('tabindex', '0');
  await expect(page.locator('#tabs1-tab-2')).toHaveAttribute('tabindex', '-1');
  await expect(page.locator('#tabs1-tab-3')).toHaveAttribute('tabindex', '-1');
});

test('each tab points at its panel and each panel is named by its tab', async ({ page }) => {
  for (const i of [1, 2, 3]) {
    const tab = page.locator(`#tabs1-tab-${i}`);
    await expect(tab).toHaveAttribute('aria-controls', `tabs1-panel-${i}`);

    const panel = page.locator(`#tabs1-panel-${i}`);
    await expect(panel).toHaveAttribute('role', 'tabpanel');
    await expect(panel).toHaveAttribute('aria-labelledby', `tabs1-tab-${i}`);

    // Selected first: a hidden panel is out of the accessibility tree, so its
    // accessible name is "" no matter how correct the markup is. That is the
    // right answer and it is not the one being checked here.
    await tab.click();
    await expect(panel).toHaveAccessibleName(await tab.innerText());
  }
});

test('the unselected panels are hidden, not merely out of sight', async ({ page }) => {
  await expect(page.locator('#tabs1-panel-1')).toBeVisible();
  for (const i of [2, 3]) {
    await expect(page.locator(`#tabs1-panel-${i}`)).toHaveAttribute('hidden', '');
    await expect(page.locator(`#tabs1-panel-${i}`)).toBeHidden();
    // The explicit display rule, because the UA's [hidden] loses to any author
    // display and there is nothing in the markup to show it.
    await expect(page.locator(`#tabs1-panel-${i}`)).toHaveCSS('display', 'none');
  }
});

test('the panel carries tabindex="0" in the markup, so the script is not what puts it in reach',
  async ({ page }) => {
    await expect(page.locator('#tabs1-panel-1')).toHaveAttribute('tabindex', '0');
    // Served bytes, before any script ran.
    const raw = await page.request.get('library/components/tabs/component.html');
    const html = await raw.text();
    expect(html).toContain('id="tabs1-panel-1"');
    expect(html).toMatch(/aria-labelledby="tabs1-tab-1" tabindex="0"/);
  });

/* --- the keyboard map ---------------------------------------------------- */

test('the arrows move and select together', async ({ page }) => {
  await page.locator('#tabs1-tab-1').focus();

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tabs1-tab-2')).toBeFocused();
  await expect(page.locator('#tabs1-tab-2')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tabs1-panel-2')).toBeVisible();
  await expect(page.locator('#tabs1-panel-1')).toBeHidden();

  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#tabs1-tab-1')).toBeFocused();
  await expect(page.locator('#tabs1-tab-1')).toHaveAttribute('aria-selected', 'true');
});

test('the arrows wrap at both ends', async ({ page }) => {
  await page.locator('#tabs1-tab-1').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#tabs1-tab-3')).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tabs1-tab-1')).toBeFocused();
});

test('Home and End jump to the ends', async ({ page }) => {
  await page.locator('#tabs1-tab-2').focus();
  await page.keyboard.press('End');
  await expect(page.locator('#tabs1-tab-3')).toBeFocused();

  await page.keyboard.press('Home');
  await expect(page.locator('#tabs1-tab-1')).toBeFocused();
});

test('a horizontal strip leaves the up and down arrows to the page', async ({ page }) => {
  await page.locator('#tabs1-tab-1').focus();

  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#tabs1-tab-1')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#tabs1-tab-1')).toBeFocused();
  await expect(page.locator('#tabs1-tab-1')).toHaveAttribute('aria-selected', 'true');
});

test('one Tab crosses the whole strip and lands on the panel', async ({ page }) => {
  await page.locator('#tabs1-tab-1').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#tabs1-panel-1')).toBeFocused();
});

/* --- example 3 · what the Tab key reaches -------------------------------- */

test('the specimen is three stops, and the two failures are five and four', async ({ page }) => {
  const good = await stopsIn(page, '[data-ac-tb-stop-case="good"]', 'tabs2c-tab-1');
  expect(good.map((s) => s.role)).toEqual(['tab', 'tabpanel', 'link']);

  // Every tab is tabindex="0", so the strip is one stop per tab.
  const roving = await stopsIn(page, '[data-ac-tb-stop-case="roving"]', 'tabs2a-tab-1');
  expect(roving.map((s) => s.role)).toEqual(['tab', 'tab', 'tab', 'tabpanel', 'link']);

  // Faded panels keep their links.
  const faded = await stopsIn(page, '[data-ac-tb-stop-case="opacity"]', 'tabs2b-tab-1');
  expect(faded.map((s) => s.role)).toEqual(['tab', 'link', 'link', 'link']);
});

test('two of the faded strip\'s stops cannot be seen', async ({ page }) => {
  for (const id of ['tabs2b-panel-2', 'tabs2b-panel-3']) {
    await expect(page.locator(`#${id}`)).toHaveCSS('opacity', '0');
    // Opacity removes nothing: the panel is still laid out and still in the
    // accessibility tree, which is why its link is still a stop.
    await expect(page.locator(`#${id}`)).toHaveCSS('display', 'block');
    await expect(page.locator(`#${id}`)).not.toHaveAttribute('hidden', '');
  }
});

test('the readout agrees with what the Tab key actually did', async ({ page }) => {
  await expect(page.locator('[data-ac-tb-out="stops-good"]')).toContainText('3 stops');
  await expect(page.locator('[data-ac-tb-out="stops-roving"]')).toContainText('5 stops');
  await expect(page.locator('[data-ac-tb-out="stops-opacity"]')).toContainText('4 stops');
  await expect(page.locator('[data-ac-tb-out="stops-opacity"]')).toContainText('not visible');
});

/* --- example 2 · activation ---------------------------------------------- */

test('automatic activation opens every panel on the way across', async ({ page }) => {
  await page.locator('#tabs3a-tab-1').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');

  await expect(page.locator('[data-ac-tb-out="act-auto-count"]')).toHaveText('2');
  await expect(page.locator('[data-ac-tb-out="act-auto-pair"]')).toHaveText('Billing / Billing');
});

test('manual activation moves focus without selecting, and Enter selects', async ({ page }) => {
  await page.locator('#tabs3b-tab-1').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');

  await expect(page.locator('#tabs3b-tab-3')).toBeFocused();
  await expect(page.locator('#tabs3b-tab-1')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-ac-tb-out="act-manual-count"]')).toHaveText('0');
  await expect(page.locator('[data-ac-tb-out="act-manual-pair"]')).toHaveText('Billing / Overview');

  // The roving tabindex follows focus under manual activation, or Tab out and
  // back in returns to a tab the person had already left.
  await expect(page.locator('#tabs3b-tab-3')).toHaveAttribute('tabindex', '0');
  await expect(page.locator('#tabs3b-tab-1')).toHaveAttribute('tabindex', '-1');

  await page.keyboard.press('Enter');
  await expect(page.locator('#tabs3b-tab-3')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-ac-tb-out="act-manual-count"]')).toHaveText('1');
});

test('Space selects too, because a native button dispatches a click for both', async ({ page }) => {
  await page.locator('#tabs3b-tab-1').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('#tabs3b-tab-2')).toHaveAttribute('aria-selected', 'true');
});

/* --- example 4 · where Tab lands ----------------------------------------- */

test('a panel with no tabindex is stepped over, and the specimen is arrived at', async ({ page }) => {
  await page.locator('#tabs4a-tab-1').focus();
  await page.keyboard.press('Tab');
  expect((await active(page)).text).toBe('Save changes');

  // Focusable content in the panel is not the same thing as reaching the
  // panel: the name never gets read.
  await page.locator('#tabs4b-tab-1').focus();
  await page.keyboard.press('Tab');
  expect((await active(page)).text).toBe('Open tasks');

  await page.locator('#tabs4c-tab-1').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#tabs4c-panel-1')).toBeFocused();
  await expect(page.locator('#tabs4c-panel-1')).toHaveAccessibleName('Overview');
});

/* --- example 5 · links wearing role=tab ---------------------------- */

test('the links wearing role=tab control panels that do not exist', async ({ page }) => {
  const item = page.locator('[data-ac-tb-cur-case="tabs"] [aria-selected="true"]');
  await expect(item).toHaveAttribute('role', 'tab');

  const controls = await item.getAttribute('aria-controls');
  await expect(page.locator(`#${controls}`)).toHaveCount(0);
  await expect(page.locator('[data-ac-tb-out="cur-tabs-controls"]')).toContainText('no such element');
});

test('the specimen is a nav whose active link says where you are', async ({ page }) => {
  const nav = page.locator('[data-ac-tb-cur-case="nav"]');
  await expect(nav).toHaveRole('navigation');
  await expect(nav).toHaveAccessibleName('Workspace');

  const current = nav.locator('[aria-current]');
  await expect(current).toHaveCount(1);
  // "location" and not "page": these move you within the page you are on.
  await expect(current).toHaveAttribute('aria-current', 'location');
  await expect(current).toHaveRole('link');
});

test('picking another link moves aria-current and leaves exactly one', async ({ page }) => {
  const nav = page.locator('[data-ac-tb-cur-case="nav"]');
  await nav.getByText('Invoices', { exact: true }).click();

  await expect(nav.locator('[aria-current]')).toHaveCount(1);
  await expect(nav.locator('[aria-current]')).toHaveText('Invoices');
  await expect(page.locator('[data-ac-tb-out="cur-nav"]')).toContainText('Invoices');
});

/* --- the selected cue ---------------------------------------------------- */

test('selected is carried by more than color', async ({ page }) => {
  // Reduced motion first: a computed color read straight after a state flip is
  // the transition, not the state.
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const on = page.locator('#tabs1-tab-1');
  const off = page.locator('#tabs1-tab-2');

  const cue = (locator) =>
    locator.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        background: style.backgroundColor,
        border: style.borderTopColor,
        edge: style.borderBottomColor,
        width: style.borderBottomWidth,
      };
    });

  const selected = await cue(on);
  const unselected = await cue(off);

  expect(selected.background).not.toBe(unselected.background);
  expect(selected.border).not.toBe(unselected.border);
  expect(selected.edge).not.toBe(unselected.edge);
  // Declared at full width in both states, so the row cannot reflow when the
  // selection moves.
  expect(selected.width).toBe(unselected.width);
});

test('the selected cue is not generated content, so the tab is not renamed', async ({ page }) => {
  const tab = page.locator('#tabs1-tab-1');
  await expect(tab).toHaveAccessibleName('Overview');

  const generated = await tab.evaluate((el) =>
    ['::before', '::after'].map((which) => getComputedStyle(el, which).content),
  );
  expect(generated.every((value) => value === 'none' || value === 'normal')).toBe(true);
});

test.describe('forced colors', () => {
  // test.use({ forcedColors: 'active' }) is accepted and silently ignored here,
  // so every assertion would pass against the ordinary stylesheet.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  });

  test('selected and unselected are still told apart', async ({ page }) => {
    const read = (id) =>
      page.locator(`#${id}`).evaluate((el) => {
        const style = getComputedStyle(el);
        return { background: style.backgroundColor, edge: style.borderBottomColor };
      });

    const selected = await read('tabs1-tab-1');
    const unselected = await read('tabs1-tab-2');

    expect(selected.background).not.toBe(unselected.background);
    // The accent edge is repainted in HighlightText, or it disappears into the
    // system fill it is drawn on.
    expect(selected.edge).not.toBe(selected.background);
  });
});

/* --- the rest of the contract -------------------------------------------- */

test('reduced motion removes the transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const duration = await page
    .locator('#tabs1-tab-1')
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(duration.split(',').every((value) => parseFloat(value) === 0)).toBe(true);
});

test('every tab clears the 24px target floor', async ({ page }) => {
  const boxes = await page.locator('.ac-tabs__tab, .ac-tb-nav__link').all();
  expect(boxes.length).toBeGreaterThan(0);

  for (const box of boxes) {
    const rect = await box.boundingBox();
    expect(rect.width).toBeGreaterThanOrEqual(24);
    expect(rect.height).toBeGreaterThanOrEqual(24);
  }
});

test('the page reflows to 320px without scrolling sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('nothing is left holding focus after load', async ({ page }) => {
  // The readouts probe elements with focus() to find out what is reachable.
  // A probe that forgets to blur parks a keyboard reader mid-page.
  await expect
    .poll(() => page.evaluate(() => document.activeElement.tagName))
    .toBe('BODY');
});

test('the factory is idempotent and destroy is its inverse', async ({ page }) => {
  const result = await page.evaluate(() => {
    const el = document.querySelector('[data-ac-tabs]');
    const first = el._acTabs;
    const again = window.AC.createTabs(el);
    return { same: first === again, selected: again.selected(), tabs: again.tabs.length };
  });

  expect(result.same).toBe(true);
  expect(result.selected).toBe(0);
  expect(result.tabs).toBe(3);

  // Minted attributes are removed; the ones the markup carried are left alone.
  const after = await page.evaluate(() => {
    const el = document.querySelector('[data-ac-tabs]');
    el._acTabs.destroy();
    return {
      instance: !!el._acTabs,
      controls: el.querySelector('[role="tab"]').getAttribute('aria-controls'),
    };
  });

  expect(after.instance).toBe(false);
  expect(after.controls).toBe('tabs1-panel-1');
});

test('a selection dispatches ac:tabs:change with the index, tab and panel', async ({ page }) => {
  const detail = await page.evaluate(async () => {
    const el = document.getElementById('tabs1-tab-1').closest('[data-ac-tabs]');
    return new Promise((resolve) => {
      el.addEventListener(
        'ac:tabs:change',
        (event) =>
          resolve({
            index: event.detail.index,
            tab: event.detail.tab.id,
            panel: event.detail.panel.id,
            bubbles: event.bubbles,
          }),
        { once: true },
      );
      el._acTabs.select(2);
    });
  });

  expect(detail).toEqual({
    index: 2,
    tab: 'tabs1-tab-3',
    panel: 'tabs1-panel-3',
    bubbles: true,
  });
});
