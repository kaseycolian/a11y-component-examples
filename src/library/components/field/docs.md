## Before you copy

Your framework probably has a better idiom for form state than this factory — React Hook Form,
Angular's `FormControl`, Vue's `vee-validate`. Use it. **The ARIA wiring below is the same either
way**, and it is the part almost every implementation gets wrong. Take the markup and the CSS, keep
the attribute contract, and let your framework own the state.

Each example on this page is separately copyable: the HTML sections are numbered, and the CSS and JS
sections say which examples need them.

## The contract

| Element | Attribute | Why |
| --- | --- | --- |
| `<label for>` | the control's `id` | The only association that works everywhere. Clicking it focuses the control; the name is announced with no ARIA at all. |
| the control | `aria-describedby="<hint id> <error id>"` | Both ids, always, from init. |
| the control | `aria-invalid="true"` | Only while a message is showing. The invalid styling is driven from it, so the two cannot disagree. |
| `.ac-field__hint` | an `id` | Instructions. Announced after the label and the value. |
| `.ac-field__error` | an `id` and `role="alert"` | Announced the moment text lands in it. |

### aria-describedby is a list, written once

```js
control.setAttribute('aria-describedby', errorId);   // wrong: the hint is now gone
```

It takes a **space-separated list of ids**, so assigning replaces the whole thing. The usual "add the
error when it appears" instinct deletes the hint permanently, because the code that removes the error
only knows about the error.

So the list is built once, at init, naming hint *and* error together. An empty referenced element
contributes nothing to the description, so pointing at the error before there is one costs nothing.
Showing an error only sets that element's text.

### The error element is never hidden

A `role="alert"` announces nothing if it is **inserted** with its text already in it, or if it was
`hidden` / `display: none` and you unhide it and set the text in the same tick. The region has to
already be in the accessibility tree for the insertion to register as a change. So it ships empty and
rendered — which costs one flex `gap`, because an empty block generates no line box.

Two consequences in the CSS: it is not a flex container (flex would promote a `<code>` or a link in
the message onto its own line), and the warning marker is a `::before` with `content: ""` — a shape,
because "!" or a warning emoji gets read out ahead of the message.

Swapping one message for a different one needs a frame in between; some screen readers coalesce a
same-tick clear-and-set into no change at all. `setError` handles that and cycles only the text, so
`aria-invalid` never claims the control is valid mid-swap. Re-asserting the *same* message is a no-op.

### Which element gets the ARIA

One input: the input. A group of them: the `<fieldset>`, whose `<legend>` is already the group's name
— on one radio it would describe only that radio. Resolution order is `[data-ac-control]`, then
`<fieldset>`, then the first `input:not([type="hidden"]), select, textarea`.

## Keyboard

Every control is native, so there is nothing to learn and no key handler in this component.

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | To the control. A radio group is one stop, not one per radio. |
| <kbd>&darr;</kbd> <kbd>&uarr;</kbd> | In a radio group: move **and** select. Native; do not reimplement. |
| <kbd>Space</kbd> | Toggle a checkbox, select the focused radio. |

## States

| State | Signaled by |
| --- | --- |
| Hover | Border takes the blue accent. Skipped when disabled (`:hover:enabled`). |
| Focus | 3px outline, 2px offset, via `:focus-visible` — keyboard only, not on click. |
| Disabled | Dashed border plus reduced opacity. The hint stays readable, which is why it is not a `placeholder`. |
| Invalid | Border goes to 2px in the danger color, **and** there is a message to read. Two cues, so nothing rests on hue (SC 1.4.1). |
| Empty | The error element is present with no height, so nothing jumps when a message appears. |

Under `forced-colors` the accent collapses to the user's text color, so the invalid border widens to
3px — width is the only cue left. Disabled loses its opacity, leaving the dashed border.

## Screen reader behavior

Expected: `"<label>, edit text, <hint>"` on focus; on a failed check the alert interrupts with the
message, which then stays in the description.

**Not yet verified against real assistive technology.** Alert timing and whether a description list
is read in full are exactly what varies across NVDA, JAWS, VoiceOver and TalkBack. Until
`docs/at-support.md` has a row for this component, treat the above as intent, not measurement.

## Validation

Opt in with `data-ac-validate`. It runs native constraint validation and puts the result in the error
element instead of the browser's bubble, which is transient, unstyleable and unreliably announced.

| When | What happens |
| --- | --- |
| `blur` | Validate; show a message if the value is not acceptable. |
| `input` / `change` | Only *removes* a message, the moment the value becomes valid. |

Browser messages say what is wrong but never what to do, so override per control:

```html
<input type="email" required
       data-ac-error-missing="Enter the email address you use at work."
       data-ac-error-invalid="Enter an address in the form name@example.com." />
```

`missing` covers `validity.valueMissing`, `invalid` covers the rest; `control.validationMessage` is
the fallback.

**Validate-on-blur is a tradeoff, hence opt-in.** Tabbing through an untouched required field errors
at you for a mistake you have not made. On a long form prefer submit-time: `check()` each field,
`focus()` the first failure, and add an error summary at the top linking to each. Set `novalidate` on
the `<form>` so the native bubble stays out of the way.

An alert populated in **server-rendered HTML** is deliberately not announced at load — the user has
done nothing yet. They hear it on reaching the field. Example 3 is that case.

## Writing the message

The hardest part of this component is not the code.

- Say **what to do**: "Enter a date in the past" beats "Invalid date".
- Name the field if the message could be read out of context.
- Never use `placeholder` as the label. It vanishes on first keystroke, usually fails contrast, and
  translation tooling misses it.
- The asterisk is decoration (`aria-hidden`); `required` is what announces. If you use one, add a
  visible legend explaining it.

## API

```js
const f = AC.createField(el, {
  validate: true,                             // same as data-ac-validate
  messages: { missing: '…', invalid: '…' },   // fallbacks under the data attributes
});

f.setError('Enter a date in the past.');   // '' or null clears
f.clearError();
f.isInvalid();   // read back from aria-invalid
f.check();       // run constraint validation -> boolean
f.focus();
f.control;       // the element carrying the ARIA
f.destroy();
```

`setError` writes `textContent`, never HTML — a validation message is often an echo of user input.

Idempotent; a second call returns the existing instance. `destroy()` restores the original
`aria-describedby`, the original `aria-invalid`, and any message the HTML shipped with.

To drive it from a framework lifecycle, delete the auto-init block:

```jsx
useEffect(() => {
  const f = AC.createField(ref.current);
  return () => f.destroy();
}, []);
```

## What to watch for

- **Never put the error inside the label.** It becomes part of the accessible name, so the control
  announces the whole message every time focus lands on it, forever.
- **One `role="alert"` per field, not per form.** A shared region means the second error overwrites
  the first, and fixing field two announces nothing about field one.
- **`aria-required` is redundant** when `required` is present. Only `aria-required` means the browser
  never validates and `:invalid` never matches.
- **`autocomplete` is a success criterion** (SC 1.3.5), not a nicety — and the most-skipped one in
  this group.

## Related

`.ac-field*` is canonical here; Dropdown carries its own copy so it stands alone. Change one, change
both. `.ac-input`, `.ac-textarea`, `.ac-group` and `.ac-choice` are provisional — `text-input`,
`textarea` and `fieldset-group` will own them.

Reference: the [WAI forms tutorial](https://www.w3.org/WAI/tutorials/forms/), not the APG — the APG
covers widgets with no native element, and this is nothing but native elements.
