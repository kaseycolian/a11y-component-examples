## Before you copy

Your framework has a `<Button>` already and you should use it. **The four decisions on this page are
the same either way** — they are about which element you reach for and which attribute you set, not
about how the component is built. Take the CSS, keep the contract, and let your framework own the
rendering. This is enough for a person or an agent to start from.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## There is no ARIA here

A `<button>` arrives with the role, a tab stop, <kbd>Enter</kbd> and <kbd>Space</kbd> wired to a
click, its name taken from its own text, and a disabled state the browser enforces. There is nothing
left to add, and `role="button"` on one is redundant.

Everything after example 1 is about what you lose by using something else, or by switching a native
button off in the wrong way.

## The contract

| Piece | What it is | Why |
| --- | --- | --- |
| `.ac-btn` | the base. Works on `<button>` and on `<a href>` | example 4 is when each is right |
| `--solid` `--outline` `--ghost` | weight. Pick one | ghost has no border at rest, so the focus ring cannot be built from one |
| `--pink` `--green` `--blue` `--purple` | accent. Optional | decoration only. Never the thing carrying meaning |
| `--sm` | the compact size | still over 24×24. There is nothing below it |
| `type="button"` | on every button not submitting a form | the default is `submit` |
| `aria-disabled="true"` | unavailable **and** explained | an announcement, not an enforcement — see the guard |

Weight and accent are independent, so the accent is a local custom property the weights read:

```css
.ac-btn        { --ac-btn-accent: /* … */; --ac-btn-on-accent: /* … */; }
.ac-btn--green { --ac-btn-accent: /* … */; --ac-btn-on-accent: /* … */; }
.ac-btn--solid { background: var(--ac-btn-accent); color: var(--ac-btn-on-accent); }
```

Twelve combinations out of seven rules, and one property to override for a brand color — set
`--ac-btn-accent` on the element or on any ancestor.

## `type` is not optional

A `<button>` with no `type` is `type="submit"`. Outside a form that does nothing, which is exactly
why the habit survives: it is invisible until the day someone wraps the markup in a `<form>` and
three unrelated controls start reloading the page.

There is no way to tell from reading the button. Its label says "Add to queue"; its behavior is
"submit this form". Example 2 is that, live.

Two related things worth knowing about the same form:

- **Implicit submission** — <kbd>Enter</kbd> in a text field submits through the form's *default
  button*: the first submit button in DOM order, whatever it is called. If that is a bare button
  somewhere in the middle of your layout, that is the one that runs.
- **`event.submitter`** tells you which button did it, and it is **not** `null` for implicit
  submission — the browser nominates the default button as the submitter even though nobody pressed
  it. Press <kbd>Enter</kbd> in example 2's field and the status line names "Add to queue". It is
  `null` only when the form has no submit button to nominate.

## `disabled` versus `aria-disabled`

They look the same and behave completely differently.

| Behavior | `disabled` | `aria-disabled="true"` |
| --- | --- | --- |
| In the tab order | no | **yes** |
| Announced | not reached at all | "unavailable" / "dimmed" |
| Click fires | no | **yes** — you have to block it |
| `aria-describedby` on it | never read, nothing lands there | read on focus |
| Form value submitted | no | yes |

`disabled` is right when there is nothing to explain. The moment the answer to "why can't I press
this?" matters, `disabled` is the wrong tool: the reader cannot get to the control, so they cannot
get to the sentence next to it either. `aria-disabled` keeps the tab stop, and the reason travels
with the button in `aria-describedby`.

The cost is that you now have to enforce it yourself. `aria-disabled` is a statement about the
control, and the browser does not act on statements:

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
before anything the button's own author wrote ever sees it. One listener also covers buttons added
later.

`preventDefault` handles the keyboard for free: a native button fires a *click* for <kbd>Enter</kbd>
and <kbd>Space</kbd>, so there is no key event to catch separately.

## Not everything that looks like a button is one

Three elements, one stylesheet, three different things.

| Element | Announced as | Keyboard | Use it when |
| --- | --- | --- | --- |
| `<button type="button">` | button | Enter and Space | it *does* something on this page |
| `<a href="…">` | link | Enter only — Space scrolls | it *goes* somewhere |
| `<div>` | nothing | none | never |

Styling a link as a button is fine. Do not then add `role="button"` to it: the role promises
<kbd>Space</kbd>, so you have to implement <kbd>Space</kbd>, and you have told a screen reader user
that nothing will navigate when something will. And never `<a href="#">` with a click handler — that
is the `<div>` failure with an extra tab stop and a broken back button.

The `<div>` in example 4 is the common one, and it is common because it *works*: it has a handler, it
has the class, and it is indistinguishable from the real button until you put the mouse down. What it
does not have is a role, a tab stop, an accessible name, or <kbd>Enter</kbd>. The fix is not
`role="button"` plus `tabindex="0"` plus a keydown handler for two keys — that is four things to
maintain in place of one element name.

## Target size

SC 2.5.8 asks for 24×24 CSS pixels. `.ac-btn` is 44 by default, which is the size a finger wants;
`--sm` is 24 with room to spare. Example 5 measures all three buttons on the page live rather than
claiming anything, and the third is under the floor on purpose.

Under the floor there is exactly one way out and it is spacing: a 24px circle centered on the target
must not overlap the circle of any other target. That is a property of the page the button lands in,
not of the button, so a component cannot promise it — which is the argument for not shipping a size
below `--sm` at all.

## States

| State | Signaled by | Not by |
| --- | --- | --- |
| hover | the fill moves toward the theme's text color | color alone would be the only cue for a pointer user, who has one anyway |
| focus | a 3px `:focus-visible` ring at 2px offset, identical on all three weights | never the border — ghost has none |
| active | `translate` + `scale`, both multiplied by `--ac-motion` | not transitioned; a press that eases in is not a press |
| unavailable | a dashed border, muted text, `not-allowed` | not `opacity` — it reads as "ignore this" and costs contrast |

Under `forced-colors: active` the three weights **collapse**: solid and outline are both `ButtonFace`
inside a `ButtonBorder`, and ghost — no fill, no border of its own — stops looking like a control at
all. The `@media (forced-colors: active)` block gives ghost a border for exactly that reason. The
press survives untouched; `translate` and `scale` are not colors.

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: "Solid, button" from the text
content, "Publish the set, button, unavailable" plus the described reason for the `aria-disabled`
one, "Tour dates, link" for the anchor, and nothing at all for the `<div>` — it is not in the
accessibility tree as a control, so it is not announced and cannot be reached.

`disabled` announcements vary by AT and verbosity setting: NVDA and JAWS commonly say "unavailable",
VoiceOver "dimmed". Both `disabled` and `aria-disabled` produce it, which is the point — the
difference is not what they say, it is whether the reader ever gets there to hear it.

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

## What to watch for

- **A `<button>` with no `type`.** It is a submit button. This is the single most common bug on the
  page and it is one attribute.
- **`disabled` on something that needs explaining.** The explanation is unreachable. Use
  `aria-disabled` plus the guard.
- **`aria-disabled` with no guard.** The button announces "unavailable" and then does the thing.
- **A `<div>` or `<span>` with a click handler.** No role, no tab stop, no keyboard, no name.
- **`role="button"` on an `<a href>`.** You have promised <kbd>Space</kbd> and hidden the navigation.
- **`outline: none` on `:focus`.** Every weight here shares one ring; there is no border to fall back
  on for ghost.
- **`opacity` for the disabled look.** It reads as decoration and takes the contrast with it.
- **A target under 24×24.** The spacing exception exists, but it is the page's promise to keep, not
  the component's.
