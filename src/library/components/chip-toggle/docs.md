## Before you copy

Your framework has a `<Chip selected>` already and you should use it. **The decisions on this page
are the same either way** — they are about which attribute carries the state and what draws it, not
about how the component is built. Take the CSS, keep the contract, and let your framework own the
state. This is enough for a person or an agent to start from.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## One sentence

A chip is a toggle button. `aria-pressed` is the state, and the state has to be visible without
color.

## The contract

| Piece | What it is | Why |
| --- | --- | --- |
| `.ac-btn .ac-chip` | both classes | the base is [Button](../button/)'s, copied |
| `aria-pressed="false"` | present from the start | a chip with the attribute only when down is a control that appears mid-page |
| the same attribute in CSS | `[aria-pressed="true"]` draws the pressed look | there is no `--pressed` class, so you cannot draw one without saying so |
| `type="button"` | not submitting a form | the default is `submit` |
| `role="group"` + a name on the row | the set is a set | otherwise it is four loose buttons with a paragraph above them |
| the accessible name | **unchanged**, always | see below |

## Toggle button, checkbox, or switch

All three are legal and they are not interchangeable. Example 4 has them side by side, looking
identical.

| | `aria-pressed` button | checkbox | `role="switch"` |
| --- | --- | --- | --- |
| Announces | "toggle button, pressed" | "checkbox, checked" | "switch, on" |
| Takes effect | immediately | when the form is submitted | immediately |
| Submits a value | **no** | yes, `name=value` | no |
| Use it for | a filter that reruns now | a choice that travels with a form | a setting that is on or off |

The chips in a filter row are toggle buttons: nothing is submitted, and pressing one reruns the
query. The moment the value has to arrive on the server with everything else, use a real checkbox —
example 4's "What would submit?" prints the `FormData` and only one of the three chips is in it.
`role="switch"` reads oddly for a filter, and older JAWS announces the role inconsistently; the
whole argument is on [Switch](../switch/).

Never write both. `aria-pressed` and `aria-checked` on one element is a contradiction, and a native
checkbox with a hand-written `aria-checked` is a second copy of a state the browser already
maintains.

## Pressed cannot be a color

A chip that changes only its fill fails SC 1.4.1, and it fails a second time under
`forced-colors: active`, where that fill is replaced by a system color the user picked. So this chip
changes three things: **the fill, the border, and a tick that appears**. The tick is the one that
survives, because it is a shape.

Example 2 samples the computed styles of three chips in both states and prints what actually
differs. The **fill only** chip differs by `background-color` and nothing else.

## The tick cannot be a character

This is the part that surprised us. The tick is a `::before` with `content: ""` and a checkmark
drawn from two borders — deliberately not `content: "✓"`, because **CSS generated content is folded
into the accessible name**. A tick written as a character renames the control every time it goes
down:

```
Matinee          →   ✓Matinee
```

So the well-meaning fix for SC 1.4.1 walks straight into the SC 2.5.3 problem below. A drawn shape
contributes an empty string and is invisible to the name. The same trap applies to any decorative
`::before` on a button, an `<a>`, or a heading.

## The name has to stay still

Swapping "Follow" for "Following" says the state twice, in two words that do not agree: a screen
reader reads *"Following, toggle button, pressed"*, and after the second press, *"Follow, toggle
button, not pressed"* — a control that has just changed its name and its state at once. A
voice-control user who said "click Follow" a second earlier now finds nothing (SC 2.5.3).

`aria-pressed` already carries it. Change one or the other, never both.
[Loading Button](../loading-button/) and [Switch](../switch/) make the same rule for their own
states.

## Target size

Chips are where the SC 2.5.8 floor gets broken, because a row of them looks tidier small.
`.ac-chip` inherits `.ac-btn`'s 44px minimum; `.ac-chip--sm` is 32px, which clears the 24px minimum
with room to spare, and the row's `0.4rem` gap is the spacing that goes with it. Do not go under the
one and then tighten the other to compensate.

## A row of chips is a row of tab stops

Ten chips are ten stops between the reader and whatever follows them. The alternative is APG's
toolbar: `role="toolbar"` with a name, one tab stop for the row, and the arrow keys moving between
chips. Example 5 has both, live, with the stops counted.

It is a real tradeoff, not an upgrade. A toolbar's keyboard map has to be discovered, so below about
six chips the plain group is kinder. `tabindex` is managed in JS rather than written in the markup,
because the chip holding the `0` has to be the one focus left from.

## States

| State | Signaled by | Not by |
| --- | --- | --- |
| pressed | the tick, the border, and the fill | never the fill alone |
| hover | border and a lighter fill | — |
| focus | a 3px `:focus-visible` ring at 2px offset | never the border |
| pressed + hover | a stronger fill, at (0,3,0) so it beats plain hover | — |

Under `forced-colors: active` the fill becomes `Highlight` / `HighlightText`, the way the OS draws a
selected control, and hover keeps `ButtonFace` and moves its border instead — otherwise a hovered
chip is indistinguishable from a pressed one. The tick keeps working with no rule of its own,
because it is a border on `currentColor`.

## Keyboard

Nothing to write for a plain row. A native `<button>` arrives with a tab stop, and <kbd>Enter</kbd>
and <kbd>Space</kbd> are both wired to a click.

| Key | Result |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | move to and from each chip; in a toolbar, to and from the row |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | toggle |
| <kbd>←</kbd> / <kbd>→</kbd> | **toolbar only** — previous / next chip, wrapping |
| <kbd>Home</kbd> / <kbd>End</kbd> | **toolbar only** — first / last chip |

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: entering example 1's group,
*"Filter the crate, group"*, then *"Live, toggle button, not pressed"*; after a press, *"pressed"*,
and the status line reads the new count. The name is the same at both points.

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

Each toggle dispatches a bubbling `ac:chip-toggle` with `detail.pressed`. That is how the rest of
the page hears about it: a native `<button>` fires no `change` event, and a component that reached
out to rerun a query would have to know things it cannot.

```js
container.addEventListener('ac:chip-toggle', (e) => {
  rerunTheQuery();
  status.textContent = `${count} records`;
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

## What to watch for

- **`aria-pressed` added only when pressed.** Ship it as `"false"` — an attribute that appears is a
  control that appears.
- **A fill and nothing else.** Add a shape, not a second color.
- **A tick written as `content: "✓"`.** It renames the control.
- **A chip that renames itself.** One control, two names, and a voice command that stops working.
- **`aria-pressed` on a `<div>`.** It is ignored on a role that does not support it, and the div has
  no tab stop and no keyboard. Use a button — [Button](../button/) example 4 has the failure live.
- **A result that changes silently.** Pressing a filter changes something elsewhere; say so in a
  `role="status"`. See [Live Region](../live-region/).
- **Chips under 24×24.** The row is where this happens.
