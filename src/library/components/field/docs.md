## How it works

Four parts, and the wiring between them is the whole component:

| Element | Attribute | Why |
| --- | --- | --- |
| `<label for>` | the control's `id` | A real `<label for>` is the only association that works everywhere. Clicking it focuses the control, and the name is announced on focus with no ARIA at all. |
| the control | `aria-describedby="<hint id> <error id>"` | Both ids, always, written once at init &mdash; see below. |
| the control | `aria-invalid="true"` | The machine-readable half of the error. The invalid styling is driven from it, so the two cannot disagree. |
| `.ac-field__hint` | an `id` | Persistent instructions. Announced after the label and the value. |
| `.ac-field__error` | an `id` and `role="alert"` | Announced the moment text is put into it. |

### aria-describedby is a list, and it is written once

The bug this component exists to prevent is one line long:

```js
// Wrong. The hint just disappeared, permanently.
input.setAttribute('aria-describedby', errorId);
```

`aria-describedby` takes a **space-separated list of ids**. Assigning to it replaces the whole list,
so the usual "add the error when it appears" instinct silently deletes the hint &mdash; and nothing
puts it back, because the code that removes the error only knows about the error.

So `createField` builds the list **once, at init**, naming the hint *and* the error together, in DOM
order. Anything the author already had in the attribute is kept, and kept first. Showing an error
then only sets that element's `textContent`; the list is never rewritten, so there is nothing left to
clobber:

```html
<input id="email" aria-describedby="email-hint email-error" />
<p class="ac-field__hint"  id="email-hint">Only used to send your sign-in link.</p>
<p class="ac-field__error" id="email-error" role="alert"></p>
```

An empty referenced element contributes nothing to the description, so pointing at the error before
there is an error costs nothing.

### The error element is never hidden

`.ac-field__error` stays in the DOM and stays rendered even while empty. That is deliberate, and it
is the part most implementations get wrong:

- A `role="alert"` element **inserted** with its text already in it announces nothing.
- The same is true if it was `hidden` or `display: none` and you unhide it and set the text in the
  same tick. The region has to already be in the accessibility tree for the insertion to register as
  a change.

Empty, it is a block with no content, so it generates no line box and has no height. The only cost is
one flex `gap` on the wrapper &mdash; about 5px of trailing space, in exchange for an alert that
actually fires.

It is deliberately **not** a flex container, either. Flex would promote every inline element in the
message to its own flex item, so a `<code>` or a link inside the text would break onto its own line.
The warning marker is an absolutely-positioned `::before` with `content: ""` &mdash; a shape rather
than a glyph, because a "!" or a warning emoji gets read out ahead of the message it decorates.

Replacing one message with a *different* one needs a frame in between, because some screen readers
coalesce a same-tick clear-and-set into no change at all. `setError` handles that itself and cycles
only the text: `aria-invalid` and the invalid styling stay put, so there is no frame in which the
control claims to be valid.

Re-asserting the **same** message is a no-op. Validating on blur fires twice for one mistake more
often than you would expect, and nobody wants to hear it twice.

### Which element gets the ARIA

For a single input, the input. For a group of them &mdash; radios, related checkboxes &mdash; the
`<fieldset>`, whose `<legend>` is already the group's accessible name. Describing one radio would
describe only that radio, and a user who lands on the third one hears nothing.

`createField` resolves it in this order: an explicit `[data-ac-control]`, then a `<fieldset>`, then
the first `input:not([type="hidden"]), select, textarea`.

## Keyboard

There is nothing to learn, and that is the point of building on real form elements. Every control
here is native, so <kbd>Tab</kbd>, typing, <kbd>Space</kbd> on a checkbox, and arrows within a radio
group all behave exactly as the platform intends.

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | Move to the control. A radio group is one stop, not one per radio. |
| <kbd>&darr;</kbd> <kbd>&uarr;</kbd> | Within a radio group: move **and** select. Native behaviour; do not reimplement it. |
| <kbd>Space</kbd> | Toggle a checkbox or select the focused radio. |

This component binds no key handlers at all. The only listeners it adds are `blur` and `input`, and
only when you opt into validation.

## States

| State | How it is signalled |
| --- | --- |
| Default | 1px border. |
| Hover | Border takes the blue accent. Skipped on a disabled control (`:hover:enabled`). |
| Focus | 3px outline at a 2px offset, from `:focus-visible`, so it appears for keyboard use and not on click. |
| Disabled | Dashed border plus reduced opacity, and the hint stays fully readable &mdash; which is the reason the hint lives outside the control rather than in a `placeholder`. |
| Invalid | Border goes to **2px** and takes the danger color, *and* there is a message to read. Two cues, so nothing depends on hue (SC 1.4.1). |
| Empty (no error) | The error element is present but has no height. Nothing reserves space or jumps when a message appears &mdash; the layout shift is one line of text, below everything else. |

Under `@media (forced-colors: active)` the accent collapses to the user's own text color, so the
invalid border widens again to 3px: width is the only cue left once hue is gone. Disabled loses its
opacity too, leaving the dashed border to carry it.

## Screen reader behaviour

Expected announcement on focus is `"<label>, edit text, <hint>"`, and on a failed check the alert
interrupts with the message, then the message is included in the description from then on.

**Not yet verified against real assistive technology.** The behaviours this component depends on
&mdash; alert timing, and whether a description list is read in full &mdash; are exactly the ones
that vary between NVDA, JAWS, VoiceOver and TalkBack. `docs/at-support.md` is where tested
combinations get recorded; until a row exists there for this component, treat the above as the
intent rather than a measurement.

## Validation

Opt in per field with `data-ac-validate`. It runs the browser's own constraint validation
(`required`, `type="email"`, `pattern`, `min`&hellip;) and puts the result in the error element
instead of the native bubble, which is transient, unstyleable, and not announced reliably.

| When | What happens |
| --- | --- |
| `blur` | Validate. Show a message if the value is not acceptable. |
| `input` / `change` | Only ever *removes* a message, the instant the value becomes valid. Nothing new appears while you are still typing. |

Browser messages say what is wrong but never what to do, so override them per control:

```html
<input type="email" required
       data-ac-error-missing="Enter the email address you use at work."
       data-ac-error-invalid="Enter an address in the form name@example.com." />
```

`data-ac-error-missing` covers `validity.valueMissing`; `data-ac-error-invalid` covers everything
else. Without either, `control.validationMessage` is the last resort.

**Validate-on-blur is a real tradeoff, which is why it is opt-in.** Tab through a required field
without touching it and it will error at you about a mistake you have not made yet. It is defensible
&mdash; the requirement surfaces early rather than after a failed submit &mdash; but on a long form
prefer validating on submit: call `check()` on each field, `focus()` the first one that failed, and
put an error summary at the top of the form linking to each. If you validate on submit, set
`novalidate` on the `<form>` so the browser's own bubble stays out of the way.

A `role="alert"` populated in the **server-rendered HTML** is deliberately not announced on page
load. The user has not done anything yet, so nothing should interrupt them; they hear the message
when they reach the field, through `aria-describedby`. The third demo above is exactly that case.

## Writing the message

The hardest part of this component is not the code.

- Say **what to do**, not that something is wrong. "Enter a date in the past" beats "Invalid date".
- Name the field if the message could be read out of context: "Enter your work email address".
- Never use `placeholder` as the label. It vanishes the moment anyone types, it fails contrast in
  most implementations, and translation tooling frequently misses it.
- The asterisk on a required field is decoration. It is `aria-hidden`, the control's `required`
  attribute is what gets announced, and if you use one you owe the user a visible legend explaining
  it &mdash; there is one at the top of the demo.

## API

```js
const f = AC.createField(el, {
  validate: true,                    // same as the data-ac-validate attribute
  messages: {                        // fallbacks, below the per-control data attributes
    missing: 'This one is needed.',
    invalid: 'That format will not work.',
  },
});

f.setError('Enter a date in the past.');   // '' or null clears it
f.clearError();
f.isInvalid();   // -> boolean, read back from aria-invalid
f.check();       // run constraint validation now -> boolean
f.focus();       // focus the control (the first real control, for a group)
f.control;       // the element carrying aria-describedby / aria-invalid
f.destroy();
```

`setError` writes `textContent`, never HTML &mdash; a validation message is very often an echo of
something the user typed.

Idempotent: calling it twice on the same element returns the existing instance. `destroy()` is a true
inverse, restoring the original `aria-describedby`, the original `aria-invalid` (or removing it, if
the markup never had one), and any message that was in the HTML to begin with.

## Using it in a framework

Most frameworks already own form state, so you usually want the markup and the CSS and not the
script. The contract is small enough to reproduce in JSX directly: put both ids in
`aria-describedby` unconditionally, render an always-present `role="alert"` element, and drive
`aria-invalid` from your own validation state.

If you do want the factory, delete the auto-init block at the bottom of `component.js`:

```jsx
const ref = useRef(null);

useEffect(() => {
  const f = AC.createField(ref.current);
  return () => f.destroy();
}, []);
```

## What to watch for

- **Do not put the error inside the label.** It becomes part of the accessible name, so the control
  announces as "Work email Enter an address in the form name@example.com, edit text" &mdash; every
  time focus lands on it, forever.
- **One `role="alert"` per field, not one per form.** A shared alert region means the second error to
  appear overwrites the first, and someone who fixes field two hears nothing about field one.
- **`aria-required` is redundant** when the control has `required`. Both is harmless; only
  `aria-required` means the browser never validates and `:invalid` never matches.
- **Do not take `resize` off a textarea.** `resize: none` is a reflow problem for anyone who needs
  the text larger to proof-read what they wrote (SC 1.4.4).
- **`autocomplete` is a success criterion, not a nicety.** SC 1.3.5 asks for it on any field
  collecting information about the user, and it is the most-skipped criterion in this whole group.

## Related

`.ac-field`, `.ac-field__label` and `.ac-field__hint` are also carried inside the Dropdown
component's own CSS. That duplication is deliberate &mdash; every component here has to work pasted
on its own &mdash; but **this file is the canonical version**. If you change one, change both.

`.ac-input` and `.ac-textarea` are here so the demo has controls to sit in; the Text Input and
Textarea components own the canonical versions of those.

The [WAI forms tutorial](https://www.w3.org/WAI/tutorials/forms/) is the reference for this pattern,
rather than the APG &mdash; the APG covers widgets that have no native element, and this one is
nothing but native elements.
