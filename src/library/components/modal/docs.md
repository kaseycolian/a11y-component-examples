## Before you copy

Your framework almost certainly has a nicer idiom for a dialog than this. The ARIA attributes and
their wiring are the same either way, and this is enough for a person — or an agent — to start from.
**Check one thing** in whatever you use: that it is a real `<dialog>` opened with `showModal()`. If it
renders a `<div role="dialog">`, it owes you the top layer, the inertness, the focus trap, Escape and
the focus return by hand, and most implementations pay only some of that.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## Ask first whether it should be a modal

A modal takes the page away. Everything behind it is inert, keyboard users cannot leave without
answering, and on a phone it is the whole screen. That is the right trade for a confirmation with
consequences and for a short form that interrupts a task. It is the wrong one for anything the person
might want to read *alongside* what they were doing — that is a [disclosure](../disclosure/), or a page.

## What `showModal()` gives you

`<dialog>` plus `showModal()` is not a convenience. It is most of the pattern:

| What you get | Handled by the browser |
| --- | --- |
| The top layer | no ancestor can clip it, no `z-index` can beat it — including your sticky header |
| `::backdrop` | a real pseudo-element to dim the page with |
| Inertness | everything behind it stops taking clicks and focus |
| <kbd>Tab</kbd> | stays inside, and wraps at both ends. No trap to write |
| <kbd>Esc</kbd> | closes, and fires `cancel` first so you can intervene |
| Focus return | back to whatever was focused when it opened |

Set the `open` attribute instead of calling `showModal()` and you get none of it: a non-modal dialog,
in the normal flow, with no backdrop and no trap.

## The contract

| Element | Attribute | Why |
| --- | --- | --- |
| `<dialog>` | — | already `role="dialog"`, already modal once `showModal()` runs |
| `<dialog>` | `aria-labelledby` | points at the visible `<h2>`. The dialog's name |
| `<dialog>` | `role="alertdialog"` | example 3 only, and then `aria-describedby` is **required** |
| a `<button>` inside | a real accessible name | touch has no <kbd>Esc</kbd> key |

**Add no `role="dialog"` and no `aria-modal="true"`.** Both are already implied, and `aria-modal` on a
native `<dialog>` has made VoiceOver skip the dialog's own content. This is the rare case where the
extra attribute is worse than nothing.

**The trigger is a plain `<button>` with no `aria-expanded`.** A disclosure reports whether the thing
it controls is open, because the person stays outside it. A modal moves them inside, so there is
nothing to report from out here — and `aria-expanded="true"` on a button they can no longer reach is
noise. This is the one place this library's [drawer](../drawer/) markup differs on purpose.

## The four things it does not do

Everything in `component.js` is one of these:

**1 · Focus placement.** `showModal()` focuses the first focusable element, which is usually the close
button — so the announcement is "Close, button" and the person has to go looking for what the dialog
says. Choose deliberately:

| The dialog is | Focus |
| --- | --- |
| mostly words (examples 1, 4) | the dialog itself, `tabindex="-1"` — the name and body are read |
| a form (example 2) | the first field |
| a confirmation (example 3) | the **safe** button, never the destructive one |

Focusing the dialog is the default here because it is right more often than not. <kbd>Enter</kbd> is
the key people press to make a dialog go away, so what sits under it in example 3 matters more than
anything else on this page.

**2 · The scroll lock.** `showModal()` makes the page inert and leaves it scrolling. `overflow: hidden`
on `:root` fixes that and shifts the whole layout sideways as the scrollbar disappears;
`scrollbar-gutter: stable` alongside it reserves the space. A counter keeps a dialog opened from a
dialog from unlocking the page early.

**3 · The outcome.** Closing a dialog announces nothing — focus is back on a trigger the person
already knew about. So examples 2 and 3 write what happened into a `role="status"`, and two details
about that are not obvious:

- **The region lives outside the dialog.** One inside it is removed from the page along with the
  dialog and never gets to speak.
- **The words are written after the close, not on the click.** While a modal is open everything behind
  it is inert, and a live region in inert content does not announce.

**4 · Escape not being the only way out.** There is nothing to write for this. It is a visible close
button in the markup, at 44px, with a real name (SC 2.1.1 in spirit and SC 2.5.8 in fact) — because
touch has no <kbd>Esc</kbd> key and a modal with no visible exit is a trap.

## Keyboard

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | cycles inside the dialog, wrapping at both ends |
| <kbd>Esc</kbd> | closes — fires `cancel`, then `close` |
| <kbd>Enter</kbd> | activates the focused button; in a form, submits it |

None of the first two is ours. That is the argument for the native element in one line.

## Dismissing by the backdrop

Off by default, opt in with `data-ac-backdrop-close="true"` (example 1). A stray click should not be
able to throw away half-typed work, and there is no undo for it.

Two details in the implementation: a click on `::backdrop` is dispatched to the **dialog element
itself**, which is what `event.target === dialog` detects — and it is also why the dialog carries no
padding of its own, since padding would be a strip of the dialog that closes it when clicked. The
`pointerdown` target is checked as well, or a text selection that starts inside and ends on the
backdrop closes the dialog under the user's hand.

## Refusing to close

`cancel` fires before `close`, so a dialog with unsaved work can call `preventDefault()` on it:

```js
AC.createModal(el, { onCancel: () => hasUnsavedWork ? false : true });
```

Do this rarely, and never without telling the person what to do instead — visibly, in the dialog. A
dialog that swallows <kbd>Esc</kbd> silently is worse than one that loses a draft.

## Screen reader behavior

- **NVDA and JAWS** announce the dialog's name on entry, then read from the focus point. Focusing the
  dialog element reads the whole body; focusing a control reads the name, the description, then that
  control.
- **VoiceOver (macOS and iOS)** announces "dialog" and the name. This is the combination that broke on
  older versions when `aria-modal="true"` was added by hand, which is why it is not here.
- **TalkBack** treats the modal as the whole screen, which is why the visible close button is not
  optional.
- **All four** say nothing at all when the dialog closes. See point 3 above.

## Sizing and zoom

The dialog is `min(32rem, calc(100vw - 2rem))` wide and capped at `min(85dvh, calc(100dvh - 2rem))`,
so it never touches the edges at 320px and never grows past the viewport at 200% zoom (SC 1.4.10).
Long content scrolls inside the body, and the head and foot stay put so the way out is reachable from
anywhere in the text.

Three CSS rules make that work, and each one is a bug when it is missing:

```css
.ac-modal[open]     { display: flex; flex-direction: column; }  /* a <dialog> is none -> block */
.ac-modal[open] > form { display: flex; flex-direction: column; min-height: 0; }
.ac-modal__body     { min-height: 0; overflow-y: auto; }        /* or it refuses to shrink */
```

`::backdrop` is styled through the same three-level token chain as everything else, and here the third
level earns its place: `::backdrop` did not inherit custom properties from its dialog in older
browsers, so the literal is what actually paints.

## Watch for

- **A `<div role="dialog">` with a hand-written focus trap.** The most common bug in it is that focus
  can be moved out by the browser's own UI, or by a screen reader's virtual cursor, which the top
  layer's inertness handles and a `keydown` handler cannot.
- **Two modals at once.** Legal — the top layer stacks — but a second dialog over the first is almost
  always a design that should have been one dialog. If you do it, keep the scroll-lock counter.
- **Opening a modal on page load.** It moves focus before the person has done anything, and it is a
  SC 3.2.2 problem as well as a rude one.
- **`autofocus` on the destructive button.** It is what a framework will do if you list the primary
  action first and let it decide.
- **Losing the `<dialog>` in a portal.** The top layer already puts it above everything; rendering it
  into `document.body` to escape a `z-index` is solving a problem that no longer exists.
- **A modal with no `<h2>`.** `aria-labelledby` has to point at something, and a dialog with no visible
  title has nothing to point at.

## API

```js
const m = AC.createModal(el, {
  focus: '#first-field',        // or data-ac-focus on the dialog
  backdropClose: true,         // or data-ac-backdrop-close="true"
  onCancel: () => true,        // return false to refuse Esc
  onClose: (returnValue) => {},
});

m.open();            // also bound to [data-ac-modal-open="<dialog id>"]
m.close('saved');    // sets dialog.returnValue
m.isOpen();          // -> boolean
m.destroy();
```

Idempotent: calling it twice on the same element returns the existing instance. It returns `null` in a
browser with no `showModal()` — where a `<dialog>` is `display: none` and there is nothing to enhance,
so **put nothing behind a modal that has no other route to it**.

`<form method="dialog">` (example 2) is worth knowing: a submit button inside it closes the dialog and
sets `dialog.returnValue` to its `value`, with constraint validation still running first, so an empty
required field keeps the dialog open. No JavaScript is involved in any of that.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const m = AC.createModal(ref.current, { onClose: (v) => setResult(v) });
  return () => m.destroy();
}, []);
```

Keep the element mounted and let `showModal()` do the showing. Unmounting the dialog to close it
throws away the browser's focus return, and mounting it on open is how the focus placement ends up on
whatever renders first.

## Related

[Drawer](../drawer/) is the same modality anchored to an edge of the viewport, and it can also be
non-modal — which is why it uses `popover` rather than `<dialog>`.
[Disclosure](../disclosure/) is the non-modal answer: content that opens in place, with the page still
usable around it. Prefer it unless the interruption is the point.
