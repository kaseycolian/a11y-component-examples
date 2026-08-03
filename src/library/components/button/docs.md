## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

A `<button>` arrives with the role, a tab stop, <kbd>Enter</kbd> and <kbd>Space</kbd> wired to a
click, its accessible name taken from its own text, and a disabled state the browser enforces. There
is no ARIA to add, and `role="button"` on one is redundant. Everything below is a class or a native
attribute.

| Element | Attribute | What it does |
| --- | --- | --- |
| `<button>` or `<a href>` | `class="ac-btn"` | The base. Example 4 covers which element to reach for. |
| `.ac-btn` | `--solid` / `--outline` / `--ghost` | Weight. Pick one. Ghost has no border at rest, which is why the focus ring is not built from a border. |
| `.ac-btn` | `--pink` / `--green` / `--blue` / `--purple` | Accent. Optional; pink is the default. Decoration only — never the thing carrying meaning (SC 1.4.1). |
| `.ac-btn` | `--sm` | The compact size. Still over 24×24. There is no size below it. |
| `<button>` | `type="button"` | Required on every button that is not submitting a form. The default is `submit`. |
| `<button>` | `aria-disabled="true"` | Unavailable **and** explained. Keeps the tab stop, so it needs the click guard in `component.js`. |
| `<button>` | `aria-describedby` | Points at the sentence saying why it is unavailable. Only useful with `aria-disabled`, never with `disabled`. |

### The accent is one custom property

Weight and accent are independent axes, so the accent is a local custom property that the weight
rules read:

```css
.ac-btn        { --ac-btn-accent: /* … */; --ac-btn-on-accent: /* … */; }
.ac-btn--green { --ac-btn-accent: /* … */; --ac-btn-on-accent: /* … */; }
.ac-btn--solid { background: var(--ac-btn-accent); color: var(--ac-btn-on-accent); }
```

Twelve combinations out of seven rules, and one property to override for a brand color. Set
`--ac-btn-accent` on the element or on any ancestor.

## Keyboard

A native `<button>` supplies all of this. There is no key handler in `component.js`.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Moves to and from the button. `disabled` removes the stop; `aria-disabled` keeps it. |
| <kbd>Enter</kbd> | Activates the button. On an `<a href>` it follows the link. |
| <kbd>Space</kbd> | Activates the button. On an `<a href>` it scrolls the page instead — that difference is why you do not put `role="button"` on a link. |

**Keys deliberately not bound.** None, and that is the point. A `<div>` with a click handler owes
you <kbd>Enter</kbd> and <kbd>Space</kbd> by hand, plus `tabindex="0"` and `role="button"` — four
things to maintain in place of one element name.

The click guard for `aria-disabled` needs no key handler either. A native button fires a *click* for
both <kbd>Enter</kbd> and <kbd>Space</kbd>, so `preventDefault` on the click covers the keyboard.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| hover | The fill moves toward the theme's text color. | — |
| focus | A 3px `:focus-visible` ring at 2px offset, identical on all three weights. | The border. Ghost has none. |
| active | `translate` and `scale`, both multiplied by `--ac-motion`. Not transitioned — a press that eases in does not read as a press. | — |
| unavailable | A dashed border, muted text, and `cursor: not-allowed`. | `opacity`. It reads as "ignore this" and costs contrast on the way. |

Under `forced-colors: active` the three weights **collapse**. Solid and outline are both `ButtonFace`
inside a `ButtonBorder`, and ghost — no fill and no border of its own — stops looking like a control
at all. The `@media (forced-colors: active)` block gives ghost a border for exactly that reason. The
press survives untouched, because `translate` and `scale` are not colors.

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: "Solid, button" from the text
content; "Publish project, button, unavailable" plus the described reason for the `aria-disabled`
one; "View pricing, link" for the anchor; and nothing at all for the `<div>`, which is not in the
accessibility tree as a control and cannot be reached.

Announcements for the unavailable state vary by assistive technology and verbosity setting. NVDA and
JAWS commonly say "unavailable"; VoiceOver says "dimmed". Both `disabled` and `aria-disabled` produce
it, which is the point — the difference is not what they say, it is whether the reader ever gets
there to hear it.

## `type` is not optional

A `<button>` with no `type` is `type="submit"`. Outside a form that does nothing, which is why the
habit survives: it is invisible until the day someone wraps the markup in a `<form>` and three
unrelated controls start reloading the page. Nothing about reading the button tells you. Its label
says "Add task"; its behavior is "submit this form". Example 3 is that, live.

Two related facts about the same form:

- **Implicit submission.** <kbd>Enter</kbd> in a text field submits through the form's *default
  button*: the first submit button in DOM order, whatever it is called. If that is a bare button in
  the middle of your layout, that is the one that runs.
- **`event.submitter`** names the button that did it, and it is **not** `null` for implicit
  submission — the browser nominates the default button even though nobody pressed it. Press
  <kbd>Enter</kbd> in example 3's field and the status line names "Add task". It is `null` only when
  the form has no submit button to nominate.

## `disabled` versus `aria-disabled`

They look the same and behave differently.

| Behavior | `disabled` | `aria-disabled="true"` |
| --- | --- | --- |
| In the tab order | no | **yes** |
| Announced | not reached at all | "unavailable" / "dimmed" |
| Fires a click | no | **yes** — you have to block it |
| `aria-describedby` on it | never read; nothing lands there | read on focus |
| Form value submitted | no | yes |

`disabled` is right when there is nothing to explain. The moment the answer to "why can't I press
this?" matters, it is the wrong tool: the reader cannot reach the control, so they cannot reach the
sentence beside it either. `aria-disabled` keeps the tab stop, and the reason travels with the button
in `aria-describedby`.

The cost is that you now enforce it yourself. `aria-disabled` is a statement about the control, and
the browser does not act on statements:

```js
container.addEventListener('click', (event) => {
  const el = event.target.closest('[aria-disabled="true"]');
  if (!el) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);          // capture, on an ancestor
```

**Capture, on a container, is the part that matters.** A guard bound on the button itself runs in the
target phase alongside every other handler, and only wins if it happened to be registered first. On
an ancestor in the capture phase it always runs first, and `stopImmediatePropagation` ends the event
before anything the button's own author wrote sees it. One listener also covers buttons added later.

## API

```js
const c = AC.createButton(container);

c.refresh();   // re-run the two measurements on this page
c.destroy();
```

Idempotent: calling it twice on the same element returns the existing instance. The only part worth
lifting is the guard — the rest of `component.js` is this page measuring its own claims.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const c = AC.createButton(ref.current);
  return () => c.destroy();
}, []);
```

## Common mistakes

- **A `<button>` with no `type`.** It is a submit button. The most common bug on this page, and it is
  one attribute.
- **`disabled` on something that needs explaining.** The explanation is unreachable. Use
  `aria-disabled` plus the guard.
- **`aria-disabled` with no guard.** The button announces "unavailable" and then does the thing.
- **A `<div>` or `<span>` with a click handler.** No role, no tab stop, no keyboard, no accessible
  name, and nothing for voice input to say.
- **`role="button"` on an `<a href>`.** You have promised <kbd>Space</kbd> and hidden the navigation.
- **`<a href="#">` with a click handler.** The `<div>` failure with an extra tab stop and a broken
  back button.
- **`outline: none` on `:focus`.** All three weights share one ring, and ghost has no border to fall
  back on.
- **`opacity` for the disabled look.** It reads as decoration and takes the contrast with it.
- **A target under 24×24 (SC 2.5.8).** The spacing exception exists, but spacing is a property of the
  page the button lands in, not of the button — which is the argument for shipping no size below
  `--sm`.

## Related

- [Icon Button](../icon-button/) — a button whose only label is an attribute.
- [Loading Button](../loading-button/) — the same button while it is working.
- [Filter Chip](../chip-toggle/) — a button that stays pressed.
