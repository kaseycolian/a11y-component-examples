## Before you copy

Your framework has an input-with-addon component, and it may well be better integrated than this one.
**Check what it does with the three things below**, because these are what such components usually get
wrong: whether the addon is a sibling or an overlay, whether the addon button has its own accessible
name, and how a password reveal announces its state.

Each example on this page is separately copyable: the HTML sections are numbered, and the CSS and JS
sections say which examples need them. Examples 1, 4 and 5 need no JavaScript at all.

## The addon is a sibling, never an overlay

The most common build of this component is an input with a button absolutely positioned inside its
right-hand padding. It looks identical and it fails two ways:

- **It covers the value.** Padding sized for the button at 100% does not grow with the text. At 200%
  zoom, or in a language with longer words, the button sits on top of what the user typed (SC 1.4.4).
- **It eats clicks.** The overlay is on top, so clicks and taps near the end of the field hit the
  button instead of placing the caret.

Here the row is a flex container and every part — affix, input, button — is a real sibling. The joined
look comes from squaring the inner corners and pulling the shared border back with a `-1px` margin.

Two consequences worth knowing:

- **Never put `overflow: hidden` on the row.** It clips the focus ring off the children, and a focus
  indicator you cannot see is the same as not having one (SC 2.4.11).
- The focused part is raised with `z-index: 1`, because the negative margin means its neighbor would
  otherwise paint over its outline.

The row does not wrap. The input shrinks (`min-width: 4rem`) and the button holds its 44px, which keeps
the addon reading as attached down to 320px.

## Password reveal: change the name, not `aria-pressed`

The button's accessible name is `Show password`, and becomes `Hide password`. It carries **no
`aria-pressed`**.

A toggle button announces as "Show password, toggle button, pressed", which leaves the user working out
whether *pressed* describes the state of the field or the action the button will take next. Both
patterns are legal; mixing them is what confuses people. Pick one channel and say the whole thing in
it.

The visible text is `Show` while the name is `Show password` — the visible string starts the accessible
name, so speech input ("click Show") still reaches it (SC 2.5.3).

The script also puts the caret back where it was. Changing an input's `type` resets its selection, and
the reset lands *after* the current turn of the event loop on a field that has already lost focus — so
the position is snapshotted on `blur` and restored both synchronously and on the next frame.

## Copy: announce through a live region, not the button

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

## Text affixes are not a description

An affix like `https://` is ordinary text, read in reading order. The catch is that **reading order is
not where a form user is**: tabbing into the field puts a screen reader in forms mode, where static
text beside an input is skipped entirely.

So the format goes in the hint, wired up with `aria-describedby`. A visual affix that exists only on
screen is a format requirement the user is expected to guess.

There is no `aria-hidden` on the affix. It is genuine content when someone reads the page, and hiding
it would only remove it from the one mode where it *was* working.

## Invalid marks the input, not the group

`aria-invalid="true"` goes on the `<input>`: the value is what is wrong, and the button beside it is
still a perfectly good button. Two cues, never color alone (SC 1.4.1) — the border thickens and there
is a message to read.

`aria-describedby` is a space-separated list, so the input points at both its hint and its error and
the user hears both, in that order.

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

## Related

`.ac-field` and `.ac-field__hint` are canonical in [Field](../field/); `.ac-input` is canonical in
[Text Input](../text-input/). Both are repeated here so this file stands alone — change one, change
all three.
