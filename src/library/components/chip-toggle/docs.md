## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

A chip is a toggle button: a button that stays down. `aria-pressed` is the state, and the state has
to be visible without relying on color.

| Element | Attribute | What it does |
| --- | --- | --- |
| The row | `role="group"` | Announces the chips as one set rather than as loose buttons with a paragraph above them. |
| The row | `aria-labelledby` | Names the group, pointing at the label element above it. |
| `<button>` | `class="ac-btn ac-chip"` | Both classes. The base is [Button](../button/)'s, copied. |
| `<button>` | `aria-pressed="false"` | Present from the start, never removed. It is also the CSS selector that draws the pressed look, so you cannot draw a chip down without saying so. |
| `<button>` | `type="button"` | Required unless it is submitting a form. The default is `submit`. |
| A chip that is on/off rather than pressed | `role="switch"` + `aria-checked` | The switch spelling of the same look. Never both spellings on one element. |
| The accessible name | — | **Never changes.** Not when pressed, not when released. |

### Toggle button, checkbox, or switch

All three are legal and they are not interchangeable. Example 2 has them side by side, looking
identical.

| Behavior | `aria-pressed` button | checkbox | `role="switch"` |
| --- | --- | --- | --- |
| Announces | "toggle button, pressed" | "checkbox, checked" | "switch, on" |
| Takes effect | immediately | when the form is submitted | immediately |
| Submits a value | **no** | yes, `name=value` | no |
| Use it for | a filter that reruns now | a choice that travels with a form | a setting that is on or off |

The chips in a filter row are toggle buttons: nothing is submitted, and pressing one reruns the
query. The moment the value has to reach the server with everything else, use a real checkbox —
example 2's "What would submit?" prints the `FormData`, and only one of the three chips is in it.
`role="switch"` reads oddly for a filter, and older JAWS announces the role inconsistently; the whole
argument is on [Switch](../switch/).

Never write both spellings. `aria-pressed` and `aria-checked` on one element is a contradiction, and
a native checkbox with a hand-written `aria-checked` is a second copy of a state the browser already
maintains.

## Keyboard

A plain row needs no key handler — a native `<button>` supplies the tab stop and both activation
keys. The arrow keys exist only in the `role="toolbar"` variant, where JS manages `tabindex`.

| Key | In a `role="group"` row | In a `role="toolbar"` row |
| --- | --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Moves to and from each chip — one stop per chip. | Moves to and from the row — one stop for all of them. |
| <kbd>Enter</kbd> | Toggles the chip. | Toggles the chip. |
| <kbd>Space</kbd> | Toggles the chip. | Toggles the chip. |
| <kbd>←</kbd> / <kbd>→</kbd> | Nothing. | Previous / next chip, wrapping at both ends. |
| <kbd>Home</kbd> / <kbd>End</kbd> | Nothing. | First / last chip. |

**Keys deliberately not bound.** No <kbd>Esc</kbd>: a chip row traps nothing, so binding it would
take the key away from whatever surrounds it. No arrow keys in the plain group either — a keyboard
map a reader has to discover is a cost, and below about six chips it buys nothing.

`tabindex` in the toolbar is managed in JS rather than written in the markup, because the chip
holding the `0` has to be the one focus left from.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| pressed | A tick that appears, plus the border and the fill. | The fill alone. |
| hover | The border, and a lighter fill. | — |
| focus | A 3px `:focus-visible` ring at 2px offset. | The border. |
| pressed and hovered | A stronger fill, at (0,3,0) so it beats plain hover. | — |

Under `forced-colors: active` the fill becomes `Highlight` / `HighlightText`, the way the OS draws a
selected control, and hover keeps `ButtonFace` and moves its border instead — otherwise a hovered
chip is indistinguishable from a pressed one. The tick keeps working with no rule of its own, because
it is a border on `currentColor`.

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: entering example 1's group,
*"Filter orders, group"*, then *"Shipped, toggle button, not pressed"*; after a press, *"pressed"*,
and the status line reads the new count. The name is the same at both points.

## The tick cannot be a character

The tick is a `::before` with `content: ""` and a checkmark drawn from two borders — deliberately not
`content: "✓"`, because **CSS generated content is folded into the accessible name**. A tick written
as a character renames the control every time it goes down:

```
Refunded          →   ✓Refunded
```

So the well-meaning fix for SC 1.4.1 walks straight into SC 2.5.3. A drawn shape contributes an empty
string and is invisible to the name. The same trap applies to any decorative `::before` on a button,
an `<a>`, or a heading. Example 4 has it live.

## API

```js
const c = AC.createChipToggle(container);

c.toggle(chip);          // flip it
c.toggle(chip, true);    // set it
c.refresh();             // re-run this page's readouts
c.destroy();
```

Idempotent: calling it twice on the same element returns the existing instance. `toggle` is the only
part worth lifting — everything else in `component.js` is this page checking its own claims.

Each toggle dispatches a bubbling `ac:chip-toggle` with `detail.pressed`. That is how the rest of the
page hears about it: a native `<button>` fires no `change` event, and a component that reached out to
rerun a query would have to know things it cannot.

```js
container.addEventListener('ac:chip-toggle', (e) => {
  rerunTheQuery();
  status.textContent = `${count} orders`;
});
```

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const c = AC.createChipToggle(ref.current);
  return () => c.destroy();
}, []);
```

## Common mistakes

- **A checkbox where a toggle button belongs, or the reverse.** The table above is the decision. If
  nothing is submitted, it is a button.
- **`aria-pressed` added only once the chip is pressed.** Ship it as `"false"`. An attribute that
  appears is a control that appears mid-page to a screen reader.
- **A fill and nothing else.** SC 1.4.1, and it fails a second time under `forced-colors: active`
  where that fill is replaced by a system color the user picked. Add a shape, not a second color.
  Example 4 samples the computed styles of three chips in both states and prints what actually
  differs; the **fill only** chip differs by `background-color` and nothing else.
- **A tick written as `content: "✓"`.** It renames the control. Draw it.
- **A chip that renames itself.** Swapping "Follow" for "Following" says the state twice in two words
  that do not agree, and a voice-control user who said "click Follow" a second earlier now finds
  nothing (SC 2.5.3). `aria-pressed` already carries it — change one or the other, never both.
- **`aria-pressed` on a `<div>`.** Ignored on a role that does not support it, and the div has no tab
  stop and no keyboard. Use a button — [Button](../button/) example 4 has that failure live.
- **A result that changes silently.** Pressing a filter changes something elsewhere on the page. Say
  so in a `role="status"`. See [Live Region](../live-region/).
- **Chips under 24×24 (SC 2.5.8).** A row of them looks tidier small, which is exactly why this is
  where the floor gets broken. `.ac-chip` inherits `.ac-btn`'s 44px minimum and `.ac-chip--sm` is
  32px; the row's `0.4rem` gap is the spacing that goes with it. Do not go under the one and then
  tighten the other to compensate.

## Related

- [Button](../button/) — the base this is built on.
- [Switch](../switch/) — the `role="switch"` spelling, in full.
- [Checkbox](../checkbox/) — when the value has to travel with a form.
