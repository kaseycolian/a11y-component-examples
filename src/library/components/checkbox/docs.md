## Before you copy

A `<input type="checkbox">` with a real `<label>` is already accessible, and four of the five examples
here have no script at all. **Check two things** in your framework's version: that the real input is
still in the tab order (not `display: none` behind a styled `div`), and that the tri-state parent sets
the `indeterminate` *property* rather than inventing `aria-checked="mixed"`.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## How this differs from a radio group

| | Checkbox | Radio |
| --- | --- | --- |
| Tab | one stop **per box** | one stop for the whole group |
| Arrow keys | nothing | move *and* select |
| Space | toggles | selects the focused option |
| Grouping | `<fieldset>` + `<legend>` when there is a set | always |
| A single one | needs no fieldset — its own label is its name | meaningless on its own |

The row that gets broken is the first one. There is no "one of" in a set of checkboxes, so there is
nothing for the arrow keys to move between, and a checkbox group that intercepts <kbd>Tab</kbd> to
build one is strictly worse than the browser.

## Indeterminate is a property

```js
el.indeterminate = true;   // the only way
```

There is no attribute. `<input type="checkbox" indeterminate>` does nothing whatsoever, which has two
consequences worth planning around:

- **A mixed parent cannot be server rendered.** The page arrives unchecked and the script fixes it, so
  do not build a layout that depends on the dash being there before hydration.
- **It cannot be done in CSS either** — but it can be *styled* in CSS: `:indeterminate` is a real
  pseudo-class, so once the property is set, the drawn dash in example 5 follows for free.

Set the property and stop. **Do not also write `aria-checked="mixed"`** on a native checkbox: the
browser already exposes mixed from the element, and a hand-written value can only end up disagreeing
with it. Screen readers announce "mixed" from the property alone.

`indeterminate` also survives a change to `checked`, so clear it explicitly whenever you resolve the
parent — otherwise you get a box that is checked *and* dashed.

## Select all

The parent is checked when every child is, mixed when some are, unchecked when none are. Clicking a
mixed parent **selects everything** — the behavior of every desktop file manager, and what people
expect.

Two details in the demo:

- The count appears twice: a visible `aria-hidden` line, and an off-screen `role="status"`. Same
  number, announced once. (The live region is positioned off screen rather than `display: none`, which
  would take it out of the accessibility tree and stop it announcing anything.)
- The parent is separated by a rule, not by indenting the children. Indentation is invisible to a
  screen reader; what actually conveys the relationship is the parent announcing "mixed".

If the set is long enough that "select all" matters, also consider whether the children need their own
`<fieldset>` — nesting groups is legal and announces cleanly.

## Required

A single required checkbox is the one case where `required` means "this exact box must be checked", so
the error can sit on the control itself with `aria-describedby`.

For a *set* where at least one must be chosen, `required` on one box does not express that — the
browser will insist on that specific box. Validate the set yourself and put the message on the
fieldset's children the way [Radio Group](../radio-group/) does.

## Drawing your own box

Keep the real input and hide it with **`opacity: 0`** — never `display: none` or `visibility: hidden`,
either of which removes it from the accessibility tree and takes the keyboard with it. The input is
also kept over the drawn box and at the same size, so a pointer still lands on a real control if the
label wiring ever breaks.

The tick is two borders of an empty box, rotated 45°, and the dash is the same pseudo-element with one
border. Nothing to load, and no font that can be missing.

Under `forced-colors: active` our fill and tick colors are both discarded, which would leave the box
blank in every state — so it is re-declared with `forced-color-adjust: none` and system colors: our
geometry, the user's palette.

Prefer `accent-color` where you can. It keeps the platform's box, tick, dash, animation and High
Contrast handling, and changes only the hue.

## API

```js
const c = AC.createCheckbox(el, { onChange: (n) => console.log(n) });

c.state();     // -> { checked, total, mixed }
c.refresh();   // re-read the children after changing them from code
c.element;
c.destroy();   // unbinds, clears indeterminate, empties the count
```

Idempotent: calling it twice on the same element returns the existing instance.

`refresh()` is not optional if you set `.checked` from code — assigning it fires no `change` event, so
the parent would keep showing the old state.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const c = AC.createCheckbox(ref.current);
  return () => c.destroy();
}, []);
```

If your framework owns the state, skip the factory and set the property in a ref callback:
`ref.current.indeterminate = someChecked && !allChecked`.

## Related

`.ac-choice` is canonical in [Radio Group](../radio-group/) and `.ac-group` in `fieldset-group`, both
repeated here so this file stands alone — change one, change both. `switch` is the same native input
with a different visual and a stricter promise: it applies immediately.
