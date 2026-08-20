## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS sections name which examples
need them, and there is no JavaScript in this component at all.

## Required markup

A table is markup that says which cell belongs to which row and column, and every way it goes wrong
is a way of drawing that instead of saying it.

| Piece | Attribute | What it does |
| --- | --- | --- |
| `<caption>` | none | The table's accessible name, and the only naming route that is also visible text. |
| `<thead>` `<th>` | `scope="col"` | The cell names its column. |
| `<th>` in a row | `scope="row"` | The cell names its row. |
| `.ac-table-scroll` | `tabindex="0"`, `role="region"`, `aria-labelledby` | A wide table scrolls, and a scroll container is a tab stop with no name (SC 2.1.1). |

Nothing else. No `role="table"`, no `aria-rowcount`, no `summary` — a real `<table>` already carries
all of it, and the ARIA table pattern exists for the case where you cannot use one.

### `scope` when the browser could guess

Browsers infer column headers from `<thead>` and row headers from a leading `<th>`, and for a simple
table they get it right — Chromium reports `columnheader` and `rowheader` with or without `scope`.
Write it anyway. It is one attribute, it states the thing rather than depending on a heuristic, and
the heuristic is only defined for the simple shape: a second header row, a header in the middle of
the table, or a `<th>` that heads a group and the guess is gone.

For a table too complicated for `scope`, `headers="id id"` on the cell names its headers explicitly.
If you are reaching for that, consider splitting the table first — a table nobody can navigate is not
made navigable by more attributes.

### A wide table scrolls, it does not restack

```html
<div class="ac-table-scroll" tabindex="0" role="region" aria-labelledby="cap-id">
  <table class="ac-table">
    <caption class="ac-table__caption" id="cap-id">…</caption>
```

The three attributes are one decision. Chromium gives any scroll container a tab stop with no role,
no name and a 1px near-black UA ring; Safari gives it no stop at all, so a keyboard user cannot
scroll the table (SC 2.1.1). `tabindex="0"` makes the stop reliable, `role="region"` makes it
announce, and `aria-labelledby` pointing at the caption's `id` writes the name once for both.
[Background Effects](../effects/) owns that finding, and example 4 has the bare wrapper beside this
one.

The wrapper needs `min-width: 0`. A scroll container's automatic minimum size is its content's, so
without it the wrapper grows to the table's width and takes the page sideways at 320px instead of
scrolling (SC 1.4.10).

## Keyboard

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> | One stop on `.ac-table-scroll`, and none inside the table. |
| <kbd>←</kbd> / <kbd>→</kbd> | Scrolls a wide table sideways, from the scroll region. |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + arrows | Moves a cell at a time and reads the headers. NVDA and JAWS, not the browser. |

**Keys deliberately not bound.** All of them. A table of text has no tab stops of its own and should
not be given any; if a cell contains a link or a button, that is the stop. The cell-at-a-time
navigation in the third row is the screen reader's own and no page can provide it.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| header row | A heavier weight, a tinted fill, and a 2px rule under it. | The fill alone (SC 1.4.1). |
| row header | A heavier weight, and the row's first column. | — |
| zebra rows | A 4% tint, decoration only. | Being the only way to tell rows apart. |
| scroll region focused | The 3px ring. | The UA hairline, which is 1px and near-black. |

Under `forced-colors: active` the tint and the zebra are `color-mix` and are dropped, so the header
row is repainted `ButtonFace` / `ButtonText`. The weight and the 2px rule survive on their own, which
is why the header is not told apart by fill alone in the first place.

## Screen reader behavior

Table navigation is the reason any of this matters. In NVDA and JAWS, <kbd>Ctrl</kbd> +
<kbd>Alt</kbd> + arrows move a cell at a time, and on each move the headers that point at the new
cell are read before its contents: moving right into `37` reads *"In stock, 37"*, and moving down
into it reads *"Office chair, 37"*. The headers are the orientation — without them you are being read
a sequence of numbers.

That association is what `<th>` buys and `<td>` does not. Example 3 has the same two columns three
ways and prints the role of each label.

Expected on arrival: *"Stock by item, table with 5 rows and 4 columns"*, then a cell's row and column
headers before its contents.

**Not yet verified against real assistive technology.** The roles *are* checked against Chromium's
accessibility tree by the spec, which is what the readouts on the page are showing —
`columnheader`, `rowheader`, `cell`, and the table's name. Until `docs/at-support.md` has a row for
this component, the announcements above are intent rather than measurement.

## The caption is the name

```html
<table class="ac-table">
  <caption class="ac-table__caption">Stock by item</caption>
```

A `<p>` above the table looks identical and names nothing. Example 5 has both, and the readouts are
what tells them apart.

When the design has no room for a caption, clip it rather than dropping it:

```html
<caption class="ac-table__caption ac-table__caption--clipped">Stock by item</caption>
```

Clipped text stays in the accessibility tree, so the table is still named. `display: none` on the
caption is not the same thing and leaves the table anonymous.

There is a second reason to keep it. Chromium runs a heuristic to decide whether a `<table>` is data
or old-fashioned page layout, and a table with no caption, no `<th>` and no borders is demoted to
`LayoutTable` — not exposed as a table at all, with no table navigation. A caption on its own is
enough to promote it. `aria-label` is not.

## The card restyle

The pattern is `display: block` on every part of the table so the cells stack, the header row hidden
because it no longer lines up with anything, and the column name put back per cell:

```css
td::before { content: attr(data-label) ": "; }   /* don't */
```

Two things are wrong with it, and neither is the one usually given.

**The generated content is part of the cell's accessible name.** accname folds `::before` and
`::after` into anything named from its contents, so the cell is named `In stock: 37` — and it is
still associated with the `In stock` column header, which is still in the tree because clipping does
not remove it. The column is announced twice. [Filter Chip](../chip-toggle/) found the same trap on a
button.

**The column is gone for everyone who could see it.** Stacked, the cells of a row no longer share a
top edge, so there is no column to compare down. Example 2 measures it.

The reason usually given — that `display: block` drops the table role — was true and is not any more:
Chromium 151 still reports `table`, `row` and `cell` for the restyled table. The advice survives its
justification, which is worth knowing if someone shows you a passing axe run.

If a table genuinely does not fit, scroll it. If the data is not tabular, do not put it in a table.

## Common mistakes

- **A bold first row instead of `<th>`.** It looks like a header and associates with nothing.
  Example 3.
- **Column headers only.** Common, and half of it: you learn which column a number is in and never
  which row. Example 3.
- **No `<caption>`.** The table is anonymous, and in Chromium an unstyled one is not a table.
  Example 5.
- **A `<p>` above the table doing the caption's job.** Pixel-identical, names nothing. Example 5.
- **`display: none` on a caption you wanted hidden.** Clip it instead.
- **The card restyle.** It announces the column twice and removes it from the screen. Example 2.
- **A bare `overflow-x: auto` wrapper.** A silent tab stop in Chromium, and no stop at all in Safari.
  Example 4.
- **A layout table.** If it is not data, it is not a table — and if it is data with no headers, it is
  not one either.

## Related

- [Background Effects](../effects/) — where the scroll-container finding comes from: a tab stop with
  no role and no name.
- [Rich Text Content](../prose-surface/) — the same wrapper, applied to a table inside prose you do
  not control.
- [Typography](../typography/) — the other component where a visual class is not a semantic, and
  where the same hand-written-readout arrangement is used.
