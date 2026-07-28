## Before you copy

There is no JavaScript here, and there should not be in yours either. The arrow-key behavior that
custom radio components carefully reimplement is already in the browser, and it is the thing they
most often get wrong.

**Check three things** in whatever your framework gives you: that the group is a real `<fieldset>`,
that its name comes from a real `<legend>`, and that every radio shares one `name`. If all three
hold, the rest of this page is styling.

Each example is separately copyable: the HTML sections are numbered, and the CSS sections say which
examples need them.

## The shared `name` is the component

One attribute is doing almost everything:

- The browser treats the radios as **one control**, so Tab enters and leaves the group as a single
  stop rather than walking every option.
- The **arrow keys move between options and select as they go**. That is native radio behavior, and
  it is correct — for radios, moving *is* choosing.
- Only the checked radio is in the tab order, so returning to the form later lands on the answer.

Miss the `name` and you have three unrelated radios: Tab stops on each one, the arrow keys do
nothing, and the group is not a group to any screen reader.

## Keyboard

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | Enter the group (at the checked option, or the first), or leave it |
| <kbd>↓</kbd> / <kbd>→</kbd> | Next option, selecting it, wrapping at the end |
| <kbd>↑</kbd> / <kbd>←</kbd> | Previous option, selecting it, wrapping at the start |
| <kbd>Space</kbd> | Select the focused option |

All of it is the browser's. None of it is in this component.

## The `<legend>` is the group's name

A real `<legend>`, as the **first child** of the fieldset. Not a `<div>` styled to look like one, and
not `aria-label` on the fieldset.

Screen readers announce the legend when focus enters the group — "Pressing format, group, 7-inch, radio
button, 1 of 3" — which is the only thing that makes the individual options make sense. A radio
announced as "7-inch" alone tells the user nothing about what question they are answering.

And **no `role="radiogroup"`**. A fieldset with a legend already is one. Adding the role does not
improve anything and quietly signs you up for maintaining `aria-required` and the rest by hand.

## Errors go on every radio

```html
<input type="radio" name="policy" required aria-invalid="true"
       aria-describedby="policy-hint policy-error" />
```

The error's id is repeated on **every** radio's `aria-describedby` rather than sitting on the fieldset
alone. A fieldset's own description is read inconsistently — NVDA and JAWS read it entering the group,
VoiceOver often skips it, and none of them read it again once focus is on the third option, which is
exactly where someone will be when they try to fix the error.

The border thickens on the **group**, not on each radio, because the missing answer belongs to the
question. That plus the message is two cues, so nothing rests on color (SC 1.4.1).

The error text lives in a `role="alert"` that is present in the markup from the start. Inserting an
alert element and its text together gives a screen reader nothing to notice.

## Do not pre-check a default

None of the options in example 1 is checked, on purpose. A pre-checked radio is an answer the user
never gave, and it is submitted as though they had. Check one only when it genuinely is the expected
choice — never on a question with money, permissions, or data retention attached.

If you need "no answer yet" to be selectable *back*, radios cannot do it: once one is chosen the group
cannot be cleared without a script. Add an explicit "No preference" option instead.

## Per-option text belongs in the label

```html
<label for="door">
  <span class="ac-choice__text">
    Door deal
    <span class="ac-choice__note">99% of the door after costs.</span>
  </span>
</label>
```

Inside the `<label>`, the note is part of that radio's accessible name, so it is read in one pass and
cannot come apart from the option it explains. A separate `aria-describedby` also works, but
descriptions are skippable and verbosity settings vary.

Keep it to a line. It is announced every time the user arrows *past* the option, not only when they
settle on it.

## Targets

The whole row is the `<label>`, so the text is part of the target. A 1rem radio is a 16px target and
fails SC 2.5.8 on its own; the row is 44px tall.

## Disabled

A disabled **radio** stays in the group and is announced as unavailable — keep it, so the user learns
the option exists, and put the reason in its label, because a disabled control cannot explain itself.

`disabled` on the **`<fieldset>`** disables every control inside it. One attribute, no loop. Note that
`input.disabled` still reads `false` for those inputs: the IDL property reflects the control's own
attribute, while the fieldset's disabling is inherited. Test with `:disabled` — which is also what your
CSS has to select on.

The legend stays at full strength on a locked group. It is what tells someone what the group was for.

## Drawing your own control

If `accent-color` is not enough, keep the real input and hide it with **`opacity: 0`** — never
`display: none` or `visibility: hidden`, either of which removes it from the accessibility tree and
takes the keyboard with it.

Everything visible is then a sibling reacting to `:checked` and `:focus-visible` on the real input, and
the focus ring has to be drawn on that sibling, since the input itself is transparent.

Under `forced-colors: active` the drawn dot loses `box-shadow` and `color-mix` and would go blank, so
this component re-declares it with `forced-color-adjust: none` and system colors — the user's palette,
our geometry.

Prefer `accent-color` where you can. It keeps the platform's dot, animation, and High Contrast
handling, and changes only the hue.

## Two fieldset quirks

- **`min-width: 0`.** A fieldset's default `min-inline-size` is `min-content`, so one long unbreakable
  child pushes it wider than its container and the page scrolls sideways at 320px (SC 1.4.10).
- **Wrap the contents in a `<div>`.** A `<legend>` cannot be a flex item, and older Safari refuses to
  make a fieldset a flex container at all.

## Related

`.ac-group` and `.ac-group__legend` are canonical in `fieldset-group`; `.ac-choice` is canonical here
and reused by `checkbox`. Repeated where needed so each file stands alone — change one, change both.
