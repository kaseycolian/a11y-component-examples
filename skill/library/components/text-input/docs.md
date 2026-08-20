## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

There is **no JavaScript here**, and that is the point: everything an accessible text input needs is
an attribute.

Every example on this page is numbered and separately copyable. The CSS sections name which examples
need them.

## Required markup

Five attributes. There is no ARIA widget here — every one of them is native HTML.

| Element | Attribute | What it does |
| --- | --- | --- |
| `<label>` | `for` = the input's `id` | The only association that works everywhere. Clicking the label focuses the input, and the name is announced with no ARIA. |
| `<input>` | `type` | Picks the on-screen keyboard and the browser's own validation. |
| `<input>` | `autocomplete` | SC 1.3.5. Lets a password manager fill the form, and saves anyone with a motor impairment from typing an address by hand. |
| `<input>` | `inputmode` | Changes the keyboard without changing behavior. For digits that are not a number. |
| `<input>` | `aria-describedby` | Points at the hint, and at the error when there is one. A space-separated list — see [Form Field](../field/). |

## Keyboard

Everything here is a native `<input>`, so there is no key handler in this component and nothing to
learn.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Moves to and from the input. A `readonly` input keeps its stop; a `disabled` one does not. |
| <kbd>↑</kbd> / <kbd>↓</kbd> | On `type="number"` only, steps the value. One more reason not to use it for a digit string. |

**Keys deliberately not bound.** All of them. If a text input needs JavaScript to be operable from a
keyboard, something has been replaced that should not have been.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| hover | The border takes the blue accent. Skipped when disabled or read-only. | — |
| focus | A 3px outline at 2px offset, via `:focus-visible` — keyboard only, not on click. | — |
| read-only | A flatter surface, no hover cue, full-contrast text, and it keeps its focus ring. | — |
| disabled | A dashed border plus reduced opacity. | — |
| invalid | The border goes to 2px in the danger color, **and** there is a message to read. | Color alone (SC 1.4.1). Two cues, always. |

Under `forced-colors` the accent collapses to the user's text color: the invalid border widens to 3px,
and read-only falls back to a `GrayText` border, since both surfaces become `Canvas`.

### Read-only is not disabled

The distinction people get wrong most often after `autocomplete`.

| Behavior | `readonly` | `disabled` |
| --- | --- | --- |
| In the tab order | yes | no |
| Announced | yes | no |
| Selectable and copyable | yes | no |
| Submitted with the form | yes | **no** |

If the user still needs to read or copy the value — an API key, a generated ID, a confirmed total —
it is `readonly`. `disabled` removes it from the accessibility tree entirely, so a screen reader user
cannot even discover that the field exists.

When a control is unavailable *and* the user needs to know why, neither is right: use
`aria-disabled="true"`, keep it focusable, and put the reason in `aria-describedby`.

## Screen reader behavior

Expected: `"<label>, edit text, <hint>"`, plus `"required"` and `"invalid entry"` when those apply.
Announcement of `type` varies — some assistive technology says "edit text" for everything, some
distinguishes email and phone fields.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## `autocomplete` is the one to get right

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

`current-password` against `new-password` is worth the extra thought: it decides whether a password
manager fills the field or offers to generate a value, and getting it backwards is a common reason
"my password manager doesn't work on this site".

Turning it off is legitimate for genuinely one-off values — a 2FA code, a "type DELETE to confirm" box
— but `autocomplete="off"` is widely ignored by browsers for credential fields, so do not rely on it
for privacy.

## `type` and `inputmode`

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

## Common mistakes

- **No `autocomplete`.** SC 1.3.5, the most-skipped criterion in this group, and a guessed token is
  the same as no token at all.
- **A placeholder used as the label.** A placeholder is allowed as an *example of the format*. It is
  never the label, and never the only place a requirement is explained: it disappears on the first
  keystroke — exactly when someone is checking their work; the default UA placeholder color fails
  4.5:1 in most browsers (the CSS here sets it to the muted token with `opacity: 1`, because Firefox
  otherwise applies its own fade on top); translation tooling and some voice-control software skip
  it; and it is not a reliable accessible name — with no label, some assistive technology reads the
  placeholder and some reads nothing.
- **`type="text"` for an email or a phone number.** The phone keyboard is then the wrong one, and the
  browser validates nothing.
- **`type="number"` for a card number or a ZIP.** See above — it is for quantities.
- **`disabled` where `readonly` was meant.** The value is no longer submitted, and the field is no
  longer discoverable.
- **`aria-label` instead of a visible label.** Find-in-page never sees it, translation tooling misses
  it, and a voice-control user cannot say a word they cannot read.
- **`font: inherit` left off.** Not cosmetic: an unstyled input drops to about 13px in most browsers,
  which also defeats a user's page-level font-size preference.
- **The focus ring removed** without an equal-or-better replacement. A border color change alone is
  not enough — it fails 3:1 against the unfocused state in most palettes.
- **`maxlength` with no explanation.** It silently truncates. If the limit matters, say so in the hint
  too; a value that stops accepting keystrokes with no reason reads as a broken page.
- **`size` used for width.** It sets width in characters and ignores the box model. Use CSS.
- **A label beside the field rather than above it.** At 200% zoom or 320px a side label either wraps
  into a column of two words or pushes the input off-screen (SC 1.4.10).

## Related

`.ac-field`, `.ac-field__label`, `.ac-field__hint` and `.ac-field__error` are **canonical in the
[Form Field](../field/) component**, which also covers the `aria-describedby` list and the
`role="alert"` timing rules. They are repeated here so this file stands alone — change one, change
both. `.ac-input` is canonical *here*; Form Field carries a copy for its own demo.

- [Input Group](../input-group/) — an input with a trailing button: a search submit, a copy button, a
  password reveal.
- [Textarea](../textarea/) — the multi-line version.

Reference: the [WAI forms tutorial](https://www.w3.org/WAI/tutorials/forms/), not the APG — the APG
covers widgets with no native element, and this is nothing but a native element.
