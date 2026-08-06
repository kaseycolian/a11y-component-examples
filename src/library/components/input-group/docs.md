## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them. Examples 1, 4 and 5 need no JavaScript at all.

## Required markup

The addon is a real element in a flex row. Every attribute below exists because the row holds two
things a user can reach, not one.

| Element | Attribute | What it does |
| --- | --- | --- |
| wrapper | `role="search"` | Makes a search group a landmark. Only for search, and worth having once per page. |
| `<label>` | `for` = the input's `id` | Names the input. The addon is never the label. |
| `<input>` | `aria-describedby` | Points at the hint, and at the error when there is one. A space-separated list — see [Form Field](../field/). |
| addon `<button>` | `type` | `submit` inside a form, `button` everywhere else. A `<button>` with no `type` submits. |
| addon `<button>` | `aria-label` | The button's own name. The field's label does not reach it, so an unnamed addon announces as "button". |

The row is a flex container and the parts are siblings. Do not put `overflow: hidden` on it: that
clips the focus ring off the children, and a focus indicator you cannot see is the same as not
having one (SC 2.4.11).

### Text affixes are not a description

An affix like `https://` is ordinary text, read in reading order. Reading order is not where a form
user is: tabbing into the field puts a screen reader in forms mode, where static text beside an input
is skipped entirely.

So the format goes in the hint, wired up with `aria-describedby`. A visual affix that exists only on
screen is a format requirement the user is expected to guess.

There is no `aria-hidden` on the affix. It is genuine content when someone reads the page, and hiding
it would only remove it from the one mode where it *was* working.

## Keyboard

Every part of the row is a native control, so this component binds no keys of its own.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Moves between the input and the addon. The addon is a real sibling, so it is its own stop. |
| <kbd>Enter</kbd> | In the field, submits the form. On the addon, activates it. |
| <kbd>Space</kbd> | Activates the focused addon button. |

**Keys deliberately not bound.** All of them. An addon that needs a key handler has stopped being a
button, and the submit route through <kbd>Enter</kbd> only works because the form is a real form.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| hover | The border takes the blue accent, on the hovered part only. | — |
| focus | A 3px outline at 2px offset, and the focused part is raised out of the stack so its neighbor cannot paint over the ring. | — |
| read-only | A flatter surface and a dotted border. The field keeps its tab stop and its focus ring. | — |
| disabled | On the addon: a dashed border plus reduced opacity. | — |
| invalid | The input's border goes to 2px in the danger color, **and** there is a message to read. | Color alone (SC 1.4.1). Two cues, always. |
| revealed | The reveal button's name changes from `Show password` to `Hide password`. | `aria-pressed`. See below. |

Under `forced-colors` the accent collapses to the user's text color: the invalid border widens to 3px,
and the affix and read-only tints fall back to a `GrayText` border, since both surfaces become
`Canvas`.

### Invalid marks the input, not the group

`aria-invalid="true"` goes on the `<input>`. The value is what is wrong, and the button beside it is
still a perfectly good button — it keeps its tab stop and carries no `disabled` or `aria-disabled`.

`aria-describedby` is a space-separated list, so the input points at both its hint and its error and
the user hears both, in that order.

## Screen reader behavior

Expected: the field announces as `"<label>, edit text, <hint>"`, then the addon as its own control —
`"Search, button"`, `"Show password, button"`. The affixes in example 4 are not announced with the
field, which is why the format is in the hint.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## The addon is a sibling, never an overlay

The most common build of this component is an input with a button absolutely positioned inside its
right-hand padding. It looks identical and it fails two ways:

- **It covers the value.** Padding sized for the button at 100% does not grow with the text. At 200%
  zoom, or in a language with longer words, the button sits on top of what the user typed (SC 1.4.4).
- **It eats clicks.** The overlay is on top, so clicks and taps near the end of the field hit the
  button instead of placing the caret.

Here every part — affix, input, button — is a real sibling. The joined look comes from squaring the
inner corners and pulling the shared border back with a `-1px` margin.

The row does not wrap. The input shrinks to a `min-width: 4rem` floor and the button holds its 44px,
which keeps the addon reading as attached down to 320px.

## The two scripted addons

### Password reveal: change the name, not `aria-pressed`

The button's accessible name is `Show password`, and becomes `Hide password`. It carries **no
`aria-pressed`**.

A toggle button announces as "Show password, toggle button, pressed", which leaves the user working out
whether *pressed* describes the state of the field or the action the button will take next. Both
patterns are legal. Mixing them is what confuses people, so pick one channel and say the whole thing
in it.

The visible text is `Show` while the name is `Show password` — the visible string starts the accessible
name, so speech input ("click Show") still reaches it (SC 2.5.3).

The script also puts the caret back where it was. Changing an input's `type` resets its selection, and
the reset lands *after* the current turn of the event loop on a field that has already lost focus — so
the position is snapshotted on `blur` and restored both synchronously and on the next frame.

### Copy: announce through a live region, not the button

The confirmation goes into a `role="status"` that is **already in the DOM and empty**. Create the
element and its text in one go and there is nothing for a screen reader to notice changing, so nothing
is announced — the same timing rule as `role="alert"`.

`status`, not `alert`: a copy that worked is not an interruption.

The button's name stays `Copy API key` rather than flipping to "Copied". The name of the button under
your finger changing out from under you reads as a *different button*, and it also breaks the
label-in-name match for anyone driving by voice. The outcome is announced separately.

Without a secure context or clipboard permission the script falls back to selecting the value and
`document.execCommand('copy')`. If even that fails it says so, and the value is left selected — the
user can finish with their own copy shortcut, which is a usable outcome rather than a dead button.

## API

```js
const g = AC.createInputGroup(el, { copiedText: 'Copied', failedText: 'Press Ctrl C' });

g.reveal(true);   // show the password without going through the button
g.reveal(false);
g.element;
g.destroy();      // unbinds, remasks the field, clears the live region
```

Idempotent: calling it twice on the same element returns the existing instance.

Buttons point at their input by id — `data-ac-reveal="pw"`, `data-ac-copy="api-key"` — so one wrapper
can hold several fields without the script guessing which button belongs to which.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const g = AC.createInputGroup(ref.current);
  return () => g.destroy();
}, []);
```

## Common mistakes

- **The addon absolutely positioned over the input.** It covers the value at 200% zoom (SC 1.4.4) and
  swallows clicks aimed at the end of the field.
- **No name on the addon.** An icon-only or unlabeled addon announces as "button". The field's
  `<label>` names the input and nothing else.
- **`overflow: hidden` on the row**, to tidy up the joined corners. It clips the focus ring off every
  child (SC 2.4.11).
- **`aria-pressed` on a reveal button that also renames itself.** Two channels saying the same thing
  is what makes the announcement ambiguous. Pick one.
- **"Copied" written into the button.** The name of the button under the user's finger changes, and
  the label-in-name match for voice control breaks with it.
- **The confirmation element created at the moment of the copy.** A live region has to exist and be
  empty before the text lands in it, or nothing is announced.
- **`aria-invalid` on the group instead of the input.** The value is what is wrong. The button is
  still a button.
- **The affix left as the only statement of the format.** Forms mode skips it, so it has to reach
  `aria-describedby` as well.
- **The addon under 24×24.** A square icon addon fails SC 2.5.8 long before it looks too small.
- **`disabled` on the field to make it read-only.** A disabled field is not submitted, not focusable,
  and not announced — see [Text Input](../text-input/).

## Related

`.ac-field` and `.ac-field__hint` are canonical in [Form Field](../field/); `.ac-input` is canonical in
[Text Input](../text-input/). Both are repeated here so this file stands alone — change one, change
all three.

- [Icon Button](../icon-button/) — the naming rules for an addon with no visible text.
- [Live Region](../live-region/) — the announcement timing the copy confirmation depends on.
