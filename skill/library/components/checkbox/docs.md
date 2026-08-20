## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

An `<input type="checkbox">` with a real `<label>` is already accessible, and four of the five examples
here have no script at all. The script exists for one reason: the mixed state has no attribute.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

| Element | Attribute | What it does |
| --- | --- | --- |
| `<input>` | `type="checkbox"` | The control. Everything below is about not taking its behavior away. |
| `<input>` | `id` | What the label points at. |
| `<label>` | `for` = the input's `id` | Names the box, and makes the whole row the target (SC 2.5.8). |
| `<fieldset>` + `<legend>` | — | For a **set**. Same as a radio group: the legend is the question, and without it the options are announced with nothing to hang them on. |
| the running count | `role="status"` | Announces "3 of 4 selected" politely, once the DOM settles. The visible copy of the same number is `aria-hidden`. |

A single checkbox needs no fieldset. Its own label is its name, and a group announcement with one
thing in it just adds noise.

### `required`

A single required checkbox is the one case where `required` means "this exact box must be checked", so
the error can sit on the control itself with `aria-describedby`.

For a *set* where at least one must be chosen, `required` on one box does not express that — the
browser will insist on that specific box. Validate the set yourself and put the message on the
fieldset's children the way [Radio Group](../radio-group/) does.

## Keyboard

Both keys are the browser's. This component adds none.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Moves to the next control. Every box is its own stop, including inside a fieldset. |
| <kbd>Space</kbd> | Toggles the focused box. |

**Keys deliberately not bound.** The arrow keys, deliberately and importantly. A set of checkboxes has
no "one of" for them to move between, and intercepting <kbd>Tab</kbd> to build a roving-tabindex group
is strictly worse than the browser.

### How this differs from a radio group

| Keyboard and grouping | Checkbox | Radio |
| --- | --- | --- |
| Tab | one stop **per box** | one stop for the whole group |
| Arrow keys | nothing | move *and* select |
| Space | toggles | selects the focused option |
| Grouping | `<fieldset>` + `<legend>` when there is a set | always |
| A single one | needs no fieldset — its own label is its name | meaningless on its own |

The row that gets broken is the first one.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| checked | The native tick, or the drawn one in example 5. | — |
| mixed | The `indeterminate` property, which screen readers announce as "mixed", and a drawn dash. | `aria-checked="mixed"` on a native checkbox. The browser already exposes it. |
| hover | The row's surface lifts. The whole label is the hit area. | — |
| focus | A 3px outline at 2px offset. On a drawn box it is on the visible sibling, since the input is transparent. | — |
| disabled | Dimmed, kept in place, announced as unavailable, with the reason in its label. | Removing the option. |
| invalid | `aria-invalid="true"` on the input, only while the error shows, plus a thicker border and a message. | Color alone (SC 1.4.1). Two cues, always. |

Under `forced-colors: active` the fill and tick colors are both discarded, which would leave the box
blank in every state — so it is re-declared with `forced-color-adjust: none` and system colors: our
geometry, the user's palette.

## Screen reader behavior

Expected: `"<label>, checkbox, checked"` or `"not checked"`, and `"mixed"` for the tri-state parent.
Inside a set, the legend is announced on the way into the group. The running count is spoken from the
`role="status"`, once, after the change settles.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

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

### Select all

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

## Drawing your own box

Keep the real input and hide it with **`opacity: 0`** — never `display: none` or `visibility: hidden`,
either of which removes it from the accessibility tree and takes the keyboard with it. The input is
also kept over the drawn box and at the same size, so a pointer still lands on a real control if the
label wiring ever breaks.

The tick is two borders of an empty box, rotated 45°, and the dash is the same pseudo-element with one
border. Nothing to load, and no font that can be missing.

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

## Common mistakes

- **Arrow keys added to a set.** There is no "one of" to move between, and a group that traps
  <kbd>Tab</kbd> to build one is worse than what the browser already does.
- **`indeterminate` written as an attribute.** It exists only as a JS property. The markup version
  does nothing at all.
- **`aria-checked="mixed"` on a native checkbox.** The element already exposes mixed, so the
  hand-written value can only disagree with it.
- **`indeterminate` left set after resolving the parent.** It survives a change to `checked`, so the
  box ends up checked *and* dashed.
- **`display: none` on the input to draw your own box.** It leaves the accessibility tree and takes
  the keyboard with it. Use `opacity: 0`.
- **A drawn box that replaces the input** rather than sitting over it. Nothing is focusable, and
  nothing is submitted.
- **Related boxes with no fieldset and legend.** The options are announced without the question they
  answer.
- **A single checkbox wrapped in a fieldset.** A group announcement with one thing in it.
- **`required` on one box of a set**, meaning "at least one". The browser insists on that exact box.
- **The box as the only target.** A 1rem box is a 16px target and fails SC 2.5.8. The label row is
  the target.

## Related

`.ac-choice` is canonical in [Radio Group](../radio-group/) and `.ac-group` in
[Fieldset](../fieldset-group/), both repeated here so this file stands alone — change one,
change both.

- [Switch](../switch/) — the same native input with a different visual and a stricter promise: it
  applies immediately.
