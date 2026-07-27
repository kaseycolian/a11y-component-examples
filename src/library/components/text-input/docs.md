## Before you copy

There is **no JavaScript here**, and that is the point: everything an accessible text input needs is
an attribute. Your framework's input component almost certainly renders a `<label>` and an `<input>`
too — keep it, and check it sets the four attributes below. That is where implementations fail, not in
the styling.

Each example on this page is separately copyable: the HTML sections are numbered, and the CSS
sections say which examples need them.

## The contract

| Attribute | Why |
| --- | --- |
| `<label for>` → `input.id` | The only association that works everywhere. Clicking the label focuses the input, and the name is announced with no ARIA. |
| `type` | Picks the on-screen keyboard and the browser's own validation. |
| `autocomplete` | SC 1.3.5. Lets a password manager fill the form and saves anyone with a motor impairment from typing an address by hand. |
| `aria-describedby` | Points at the hint, and at the error when there is one. A space-separated list — see Field. |

## autocomplete is the one to get right

It is the most-skipped criterion in this group and the one with the widest payoff, because it is not
only for convenience: SC 1.3.5 exists so that assistive technology and personalization tools can
identify what a field is *for*, independent of its label wording or language.

Use a token from the HTML spec's [autofill field list](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill).
A guess does nothing at all — there is no partial credit, and no error to tell you.

| Instead of | Use |
| --- | --- |
| `autocomplete="name"` on a first-name box | `given-name`, and `family-name` on the other |
| `autocomplete="password"` | `current-password` to sign in, `new-password` to register |
| `autocomplete="phone2"` | `tel`, or `tel-national` |
| `autocomplete="zip"` | `postal-code` |
| `autocomplete="on"` | the specific token; `on` tells the browser nothing |

`current-password` vs `new-password` is worth the extra thought: it decides whether a password manager
fills the field or offers to generate a value, and getting it backwards is a common reason "my
password manager doesn't work on this site".

Turning it off is legitimate for genuinely one-off values — a 2FA code, a "type DELETE to confirm" box
— but `autocomplete="off"` is widely ignored by browsers for credential fields, so do not rely on it
for privacy.

## type and inputmode

`type` changes behavior. `inputmode` changes only the keyboard. Use `inputmode` when the value is
digits but is not a *number*:

```html
<input type="text" inputmode="numeric" autocomplete="cc-number" />
```

**Avoid `type="number"` for anything that is not a quantity.** It accepts `e`, `+` and `-`, drops
leading zeros (so a ZIP of `01234` becomes `1234`), changes value on a stray mouse wheel over a
focused field, and its spinner buttons are usually well under the 24×24 target floor. Card numbers,
ZIPs, PINs and phone numbers are digit *strings*. Quantities and prices are numbers.

| Value | Use |
| --- | --- |
| Email | `type="email"` |
| Phone | `type="tel"` |
| URL | `type="url"` |
| Card number, ZIP, PIN | `type="text"` + `inputmode="numeric"` |
| Quantity, price | `type="number"` with `min`, `max`, `step` |
| Search | `type="search"` |

## Read-only is not disabled

The distinction people get wrong most often after `autocomplete`:

| | `readonly` | `disabled` |
| --- | --- | --- |
| In the tab order | yes | no |
| Announced | yes | no |
| Selectable / copyable | yes | no |
| Submitted with the form | yes | **no** |

If the user still needs to read or copy the value — an API key, a generated ID, a confirmed total —
it is `readonly`. `disabled` removes it from the accessibility tree entirely, so a screen reader user
cannot even discover that the field exists.

When a control is unavailable *and* the user needs to know why, neither is right: use
`aria-disabled="true"`, keep it focusable, and put the reason in `aria-describedby`.

## Placeholders

A placeholder is allowed as an **example of the format**. It is never the label, and never the only
place a requirement is explained, because:

- It disappears on the first keystroke, so it is gone exactly when someone is checking their work.
- Default UA placeholder color fails 4.5:1 in most browsers. The CSS here sets it to the muted token
  with `opacity: 1`, because Firefox otherwise applies its own fade on top.
- Translation tooling and some voice-control software skip it.
- It is not a reliable accessible name: if the label is missing, some AT reads the placeholder and
  some reads nothing.

## States

| State | Signaled by |
| --- | --- |
| Hover | Border takes the blue accent. Skipped when disabled or read-only. |
| Focus | 3px outline, 2px offset, via `:focus-visible` — keyboard only, not on click. |
| Read-only | Flatter surface, no hover cue, full-contrast text, keeps its focus ring. |
| Disabled | Dashed border plus reduced opacity. |
| Invalid | Border to 2px in the danger color, **and** a message to read. Two cues, so nothing rests on hue (SC 1.4.1). |

Under `forced-colors` the accent collapses to the user's text color: the invalid border widens to 3px,
and read-only falls back to a `GrayText` border, since both surfaces become `Canvas`.

## Screen reader behavior

Expected: `"<label>, edit text, <hint>"`, plus `"required"` and `"invalid entry"` when those apply.
Announcement of `type` varies — some AT says "edit text" for everything, some distinguishes email and
phone fields.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## What to watch for

- **`font: inherit` is not cosmetic.** An unstyled input drops to about 13px in most browsers, which
  also defeats a user's page-level font-size preference. Set it.
- **Never remove the focus ring** without an equal-or-better replacement. A border color change alone
  is not enough — it fails 3:1 against the unfocused state in most palettes.
- **`maxlength` silently truncates.** If the limit matters, say so in the hint too; a value that stops
  accepting keystrokes with no explanation reads as a broken page.
- **Don't use `size`.** It sets width in characters and ignores the box model. Use CSS.
- **A label above the field, not beside it.** At 200% zoom or 320px a side label either wraps into a
  column of two words or pushes the input off-screen (SC 1.4.10).

## Related

`.ac-field`, `.ac-field__label`, `.ac-field__hint` and `.ac-field__error` are **canonical in the
[Field](../field/) component**, which also covers the `aria-describedby` list and the `role="alert"`
timing rules. They are repeated here so this file stands alone — change one, change both.

`.ac-input` is canonical *here*. Field carries a copy for its own demo.

For an input with a trailing button — a search submit, a copy-to-clipboard, a password reveal — see
`input-group`. Multi-line goes to `textarea`.

Reference: the [WAI forms tutorial](https://www.w3.org/WAI/tutorials/forms/), not the APG — the APG
covers widgets with no native element, and this is nothing but a native element.
