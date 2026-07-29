## Before you copy

Your data-grid library renders all of this for you, and you should probably let it. **The elements
and the two attributes below are the same either way** — they are what a grid library is or is not
emitting, and checking that is the whole review. Take the markup and the CSS, keep the contract, and
let your framework own the data.

Each example is separately copyable: the HTML sections are numbered, and the CSS sections say which
examples need them. There is no JavaScript in this component.

## One sentence

A table is markup that says which cell belongs to which row and column, and every way it goes wrong
is a way of drawing that instead of saying it.

## The contract

| Piece | Attribute | Why |
| --- | --- | --- |
| `<caption>` | none | the table's accessible name, and the only naming route that is also visible text |
| `<thead>` `<th>` | `scope="col"` | the cell names its column |
| `<th>` in a row | `scope="row"` | the cell names its row |
| `.ac-table-scroll` | `tabindex="0"`, `role="region"`, `aria-labelledby` | a wide table scrolls, and a scroll container is a tab stop with no name (SC 2.1.1) |

Nothing else. No `role="table"`, no `aria-rowcount`, no `summary` — a real `<table>` already carries
all of it, and the ARIA table pattern exists for the case where you cannot use one.

## What a screen reader does with it

Table navigation is the reason any of this matters. In NVDA and JAWS, <kbd>Ctrl</kbd> +
<kbd>Alt</kbd> + arrows move a cell at a time, and on each move the headers that point at the new
cell are read before its contents: moving right into `37` reads *"Left, 37"*, and moving down into it
reads *"Clear pressing, 37"*. The headers are the orientation — without them you are being read a
sequence of numbers.

That association is what `<th>` buys and `<td>` does not. Example 3 has the same two columns three
ways and prints the role of each label.

## `scope` when the browser could guess

Browsers infer column headers from `<thead>` and row headers from a leading `<th>`, and for a simple
table they get it right — Chromium reports `columnheader` and `rowheader` with or without `scope`.
Write it anyway. It is one attribute, it states the thing rather than depending on a heuristic, and
the heuristic is only defined for the simple shape: a second header row, a header in the middle of
the table, or a `<th>` that heads a group and the guess is gone.

For a table too complicated for `scope`, `headers="id id"` on the cell names its headers explicitly.
If you are reaching for that, consider splitting the table first — a table nobody can navigate is not
made navigable by more attributes.

## The caption is the name

```html
<table class="ac-table">
  <caption class="ac-table__caption">Merch table, second night</caption>
```

A `<p>` above the table looks identical and names nothing. Example 5 has both, and the readouts are
what tells them apart.

When the design has no room for a caption, clip it rather than dropping it:

```html
<caption class="ac-table__caption ac-table__caption--clipped">Merch table, second night</caption>
```

Clipped text stays in the accessibility tree, so the table is still named. `display: none` on the
caption is not the same thing and leaves the table anonymous.

There is a second reason to keep it. Chromium runs a heuristic to decide whether a `<table>` is data
or old-fashioned page layout, and a table with no caption, no `<th>` and no borders is demoted to
`LayoutTable` — not exposed as a table at all, with no table navigation. A caption on its own is
enough to promote it. `aria-label` is not.

## A wide table scrolls, it does not restack

```html
<div class="ac-table-scroll" tabindex="0" role="region" aria-labelledby="cap-id">
  <table class="ac-table">
    <caption class="ac-table__caption" id="cap-id">…</caption>
```

The three attributes are one decision. Chromium gives any scroll container a tab stop with no role,
no name and a 1px near-black UA ring; Safari gives it no stop at all, so a keyboard user cannot
scroll the table (SC 2.1.1). `tabindex="0"` makes the stop reliable, `role="region"` makes it
announce, and `aria-labelledby` pointing at the caption's `id` writes the name once for both.
[Effects](../effects/) owns that finding, and example 4 has the bare wrapper beside this one.

The wrapper needs `min-width: 0`. A scroll container's automatic minimum size is its content's, so
without it the wrapper grows to the table's width and takes the page sideways at 320px instead of
scrolling (SC 1.4.10).

## The card restyle

The pattern is `display: block` on every part of the table so the cells stack, the header row hidden
because it no longer lines up with anything, and the column name put back per cell:

```css
td::before { content: attr(data-label) ": "; }   /* don't */
```

Two things are wrong with it, and neither is the one usually given.

**The generated content is part of the cell's accessible name.** accname folds `::before` and
`::after` into anything named from its contents, so the cell is named `Left: 37` — and it is still
associated with the `Left` column header, which is still in the tree because clipping does not remove
it. The column is announced twice. [Chip Toggle](../chip-toggle/) found the same trap on a button.

**The column is gone for everyone who could see it.** Stacked, the cells of a row no longer share a
top edge, so there is no column to compare down. Example 2 measures it.

The reason usually given — that `display: block` drops the table role — was true and is not any more:
Chromium 151 still reports `table`, `row` and `cell` for the restyled table. The advice survives its
justification, which is worth knowing if someone shows you a passing axe run.

If a table genuinely does not fit, scroll it. If the data is not tabular, do not put it in a table.

## States

| State | Signaled by | Not by |
| --- | --- | --- |
| header row | a heavier weight, a tinted fill, and a 2px rule under it | never the fill alone (SC 1.4.1) |
| row header | a heavier weight, and the row's first column | — |
| zebra rows | a 4% tint, decoration only | never as the only way to tell rows apart |
| scroll region focused | the 3px ring | never the UA hairline |

Under `forced-colors: active` the tint and the zebra are `color-mix` and are dropped, so the header
row is repainted `ButtonFace` / `ButtonText`. The weight and the 2px rule survive on their own, which
is why the header is not told apart by fill alone in the first place.

## Keyboard

| Key | Where | Does |
| --- | --- | --- |
| <kbd>Tab</kbd> | the page | one stop on `.ac-table-scroll`, and none inside the table |
| <kbd>←</kbd> <kbd>→</kbd> | on the scroll region | scrolls a wide table sideways |
| <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+arrows | in NVDA or JAWS | moves a cell at a time and reads the headers |

A table of text has no tab stops of its own, and should not be given any. If a cell contains a link
or a button, that is the stop.

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: arriving reads *"Merch table,
second night, table with 5 rows and 4 columns"*; moving into a cell reads its row and column headers
before its contents.

The roles are checked against Chromium's accessibility tree by the spec, which is what the readouts
on the page are showing — `columnheader`, `rowheader`, `cell`, and the table's name.

## What to watch for

- **A bold first row instead of `<th>`.** It looks like a header and associates with nothing.
- **Column headers only.** Common, and half of it: you learn which column a number is in and never
  which row.
- **No `<caption>`.** The table is anonymous, and in Chromium an unstyled one is not a table.
- **A `<p>` above the table doing the caption's job.** Pixel-identical, names nothing.
- **`display: none` on a caption you wanted hidden.** Clip it instead.
- **The card restyle.** It announces the column twice and removes it from the screen.
- **A bare `overflow-x: auto` wrapper.** A silent tab stop in Chromium, and no stop at all in Safari.
- **A layout table.** If it is not data, it is not a table — and if it is data with no headers, it is
  not one either.
