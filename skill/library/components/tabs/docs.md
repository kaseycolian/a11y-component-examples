## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

The strip is one stop, the arrows move inside it, and the panel is the next stop.

| Piece | Attributes | What it does |
| --- | --- | --- |
| `[role="tablist"]` | `aria-label` or `aria-labelledby` | Names the set, not the tabs. |
| `[role="tab"]` | `aria-selected`, `aria-controls`, `tabindex="0"` on the selected one and `-1` on the rest | The selected tab is the strip's only Tab stop. |
| `[role="tabpanel"]` | `aria-labelledby` the tab, `tabindex="0"`, `hidden` when unselected | It is a destination, so it has to be reachable and named. |

Every tab is a `<button type="button">`. A `<div role="tab">` needs a `tabindex` and a keydown handler
for <kbd>Enter</kbd> and <kbd>Space</kbd> before it is even a control, and it still will not be one for
voice input.

### `aria-selected` or `aria-current`

They look identical on screen and they say opposite things.

| Aspect | Tabs | Navigation |
| --- | --- | --- |
| markup | `<button role="tab">` in a `role="tablist"` | `<a href>` in a `<nav>` |
| state | `aria-selected="true"` | `aria-current="page"` or `"location"` |
| keyboard | one stop, arrows inside | one stop per link |
| what happens | a panel on this page is swapped | you are moved somewhere |

If the row changes the URL, it is navigation. Dressing it in `role="tab"` announces a widget that does
not exist, takes the links out of the tab order one by one, and leaves `aria-controls` naming panels
nobody built — which is invisible on screen, and is what example 5 prints.

`page` is for a link to the page you are already on. `location` is for a position within it, which is
what an in-page anchor is. [In-Page Navigation](../jump-nav/) is that pattern in full.

## Keyboard

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> | Reaches the selected tab, and only that one. From a tab, leaves the strip for the panel. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Selects the focused tab. Under automatic activation the arrow already did. |
| <kbd>←</kbd> / <kbd>→</kbd> | Previous or next tab, wrapping at both ends. |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Nothing, unless the tablist is `aria-orientation="vertical"` — then these move and <kbd>←</kbd>/<kbd>→</kbd> do nothing. |
| <kbd>Home</kbd> / <kbd>End</kbd> | First tab, last tab. |

**Keys deliberately not bound.** <kbd>↑</kbd> and <kbd>↓</kbd> on a horizontal strip. Answering to all
four arrows would take the keys the page scrolls with, and a vertical strip says which pair it wants
through `aria-orientation`.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| selected | A tint, a border, and a 3px accent edge along the bottom. | The color alone (SC 1.4.1). |
| focused | The 3px ring. | A change of tint. |
| unselected panel | The `hidden` attribute. | `opacity`, an off-screen position, or `height: 0`. |

None of the three cues is generated content. `content: "▾"` or a tick is folded into the accessible
name and renames the tab every time the selection moves, which is
[Filter Chip](../chip-toggle/)'s finding. The accent edge is a `border-bottom` declared at its full
3px in both states — transparent when the tab is not the selected one — so the row cannot reflow and
shift the next tab out from under a pointer already heading for it.

Nothing draws a rail across the whole strip, which is what lets it wrap. A rail belongs to one row, so
a six-tab strip on a phone leaves the first row hanging over nothing.

Under `forced-colors: active` the tint is a dropped `color-mix`, so the selected tab is repainted as
`Highlight` / `HighlightText` — a system-selected control, which is what it is — with the accent edge
in `HighlightText` so it still reads against the new fill. The unselected tabs take `ButtonFace` and a
border rather than staying transparent: with the tint gone there is otherwise nothing to say the row
is made of controls.

### Hide the panel with `hidden`

An unselected panel has to leave the accessibility tree, and it has to take its tab stops with it.
`hidden` — or `display: none`, or `visibility: hidden` — does that. These do not:

```css
/* All three leave every link inside the panel in the tab order. */
.panel { opacity: 0 }
.panel { position: absolute; left: -9999px }
.panel { height: 0 }            /* and overflow visible, or the text still paints */
```

The `opacity` one is the one that ships, because it is how a cross-fade between panels is built. In
example 3 that strip has four Tab stops and two of them cannot be seen.

`.ac-tabs__panel[hidden] { display: none }` is declared explicitly in `component.css`. The UA rule for
`[hidden]` loses to any author `display`, so a component that sets one anywhere on that element has
silently disabled the attribute.

## Screen reader behavior

Expected: arriving at example 1's strip reads *"Project 462, tab list, Overview, tab, 1 of 3,
selected"*; <kbd>→</kbd> reads *"Activity, tab, 2 of 3, selected"*; <kbd>Tab</kbd> then reads
*"Activity, tab panel"* and its contents.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## Roving tabindex

Only the selected tab is `tabindex="0"`. The rest are `-1`, which keeps them focusable by script and
takes them out of the Tab order, so:

```
Tab  →  the selected tab      ← the whole strip, one stop
←/→  →  moves inside the strip
Tab  →  the panel
```

Six tabs would otherwise be six stops between whatever is above them and whatever is below.
[Filter Chip](../chip-toggle/)'s example 3 argues the other side of this — a row of chips keeps its
stops, because a chip row has no arrow-key map anyone would guess at. Tabs are the case where the
convention is old enough to be worth the trade.

Example 3 walks three strips and prints every stop each one has, so the difference is a number rather
than a claim.

### The panel gets a Tab stop

The APG makes `tabindex="0"` on the panel conditional: add it when the panel has no focusable content
of its own. This library adds it unconditionally, for two reasons.

The condition is about the panel's *content*, and the content is the part that changes. A panel that
qualified when it was written stops qualifying the moment somebody adds a link, and nothing fails
loudly when it does.

And arriving on the panel is what reads its name. `aria-labelledby` points at the tab, so landing
there announces *"Overview, tab panel"* — the confirmation that the arrow key did what it looked like
it did. Tab straight past to a link inside and the panel is never mentioned.

Example 4 has all three cases, with the next stop after the selected tab printed under each.

## Automatic or manual activation

**Automatic** — the arrows move *and* select. Right whenever the panels are already in the DOM, which
is most of the time: there is nothing to press, and nothing to know.

**Manual** — the arrows move focus, and <kbd>Enter</kbd> or <kbd>Space</kbd> selects. Reach for it
when activating a panel costs a fetch, a spinner or a scroll reset. It buys that at the price of a key
nobody was told about, and of a state where the focused tab and the selected tab disagree.

```html
<div class="ac-tabs" data-ac-tabs data-ac-activation="manual">
```

Under manual activation the roving `tabindex` follows *focus*, not the selection — otherwise tabbing
out and back in returns a person to a tab they had already left.

Example 2 arrows across both and counts the panels opened.

## API

```js
const t = AC.createTabs(container);                          // automatic
const m = AC.createTabs(other, { activation: 'manual' });    // or [data-ac-activation]

t.select(2);        // by index, in DOM order
t.selected();       // → 2
t.tabs;             // the tab elements
t.panels;           // the panel elements, paired by index
t.destroy();
```

Idempotent: calling the factory twice on the same element returns the existing instance. Ids are minted
where the markup has none, and `destroy()` removes exactly the attributes the factory added.

Every selection dispatches a bubbling `ac:tabs:change` carrying `{ index, tab, panel }`. That is the
hook a lazily loaded panel needs, and it is what example 2's counter listens to.

The factory pairs by `aria-controls` when the markup has it and by DOM order when it does not, and it
wires `aria-labelledby` back the other way. **It never sets the panel's `tabindex`** — that lives in the
markup, so the keyboard map is the same before the script loads and after.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const t = AC.createTabs(ref.current);
  return () => t.destroy();
}, []);
```

The part that does not survive the port is the panel.
`{selected === i && <div role="tabpanel">…</div>}` unmounts the unselected ones, which is right for the
accessibility tree and wrong for everything the panel was holding — a scroll position, a half-typed
field, a playing video. Render them all and toggle `hidden`.

## Common mistakes

- **Every tab `tabindex="0"`.** The strip becomes as many stops as it has tabs. Example 3.
- **Panels hidden with `opacity`, an off-screen position or `height: 0`.** Still in the tab order,
  still in the accessibility tree. Example 3.
- **A panel with no `tabindex`.** Tab steps over it and its name is never read. Example 4.
- **`content: "✓"` as the selected cue.** It renames the tab.
- **`role="tab"` on links.** If the row changes the URL it is navigation, and `aria-current` is the
  attribute. Example 5.
- **`aria-controls` pointing at an id that does not exist.** Nothing on screen changes and nothing
  reports it.
- **A tab strip that scrolls sideways.** A scroll container is a tab stop with no role and no name in
  Chromium — [Background Effects](../effects/) has that finding. Let the strip wrap instead.

## Related

- [In-Page Navigation](../jump-nav/) — the pattern for a row that moves you around a page rather than swapping a
  panel.
- [Filter Chip](../chip-toggle/) — the other side of the roving-tabindex trade, and where the
  generated-content finding comes from.
- [Disclosure](../disclosure/) — one trigger, one panel. Reach for it when the panels are independent
  rather than alternatives.
