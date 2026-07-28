## Before you copy

Your framework has an `<IconButton>` already and you should use it. **The four decisions on this page
are the same either way** — they are about which attribute carries the name and how big the box is,
not about how the component is built. Take the CSS, keep the contract, and let your framework own the
rendering. This is enough for a person or an agent to start from.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## One sentence

A text button gets its accessible name for free from the word on it, and gets its width for free from
the same word. An icon button has neither. Everything else here follows from that.

## The contract

| Piece | What it is | Why |
| --- | --- | --- |
| `.ac-btn .ac-btn-icon` | both classes | the base is [Button](../button/)'s, copied. The icon part is four rules |
| `--solid` `--outline` `--ghost` | weight | unchanged from `button` |
| `--pink` `--green` `--blue` `--purple` | accent | unchanged. The accent is a custom property the weights read, so an icon button needs no rules of its own |
| `--sm` | 24×24 | still on the floor exactly. There is nothing below it |
| `aria-label` **or** clipped text | the name | one of the two, always. Never neither |
| `aria-hidden="true"` on the glyph | keeps the SVG out of the name | otherwise the name can gain a second, worse half |
| `focusable="false"` on the glyph | keeps it out of the tab order | IE-era Edge, and some AT still honor it |
| `type="button"` | not submitting a form | the default is `submit` |

## The accessible name is the only name

With no `aria-label` and no text, an icon button announces as **"button"**. Not "unlabeled button",
not the file name of the icon — "button". A screen reader user gets the role and nothing else, and a
row of them is "button, button, button".

The name is computed in a fixed order, and the first source that produces text wins:

| Order | Source | Notes |
| --- | --- | --- |
| 1 | `aria-labelledby` | points at other elements. Wins even if they are empty of useful text |
| 2 | `aria-label` | replaces everything below it |
| 3 | the element's own text | with `aria-hidden` subtrees removed — which is why the glyph is hidden |
| 4 | `title` | the last resort, and the one to avoid |

Example 3 prints that resolution live under four buttons that look identical. Two of them come out
with no name at all:

- **Nothing on it.** The common one, and it is invisible in review: the markup is valid, the icon
  renders, and nothing reports anything.
- **`aria-label` on the wrapping `<span>`.** The label is in the file, one line above the button, and
  it is discarded. A `<span>` is generic, ARIA prohibits naming a generic element, and **a name on a
  parent is never inherited by a child**. Put it on the element that has the role.

The third case *has* a name, from `title`, and is still wrong. A `title` tooltip appears on hover,
unreliably or not at all on keyboard focus, and never on touch — so the name exists for AT and the
visible affordance exists for mouse users only. See [Tooltip](../tooltip/) for what to do instead.

## `aria-label`, or real text?

Both announce the same. They are not the same thing, and the clipped-text version is the better
default whenever the label *can* be a phrase.

| | `aria-label` | clipped text inside the button |
| --- | --- | --- |
| Announced | yes | yes |
| Found by Ctrl+F | no | **yes** |
| Picked up by a translation tool | inconsistently | **yes** — it is page text |
| Selectable, copyable | no | yes |
| Can be revealed at a wider viewport | **no** | yes — one class |
| Cost | an attribute | a `<span>` |

The last row is the one that decides it. Example 2's third button is the second one with
`--labeled` added: the same markup becomes a labeled button, because text can be un-clipped and an
attribute cannot. `.ac-btn-icon__label` is a local copy of
[Visually Hidden](../visually-hidden/)'s recipe, which is also where the full argument for why
`aria-label` is a *different tool* rather than a shorter spelling lives.

`aria-label` is still right when there is no phrase to write — a close button in a corner, an
established glyph in a dense toolbar — and it is always better than nothing.

## The word on the screen has to be in the name

**SC 2.5.3 Label in Name.** If a control has visible text near it that reads as its label — the
caption under an icon in a rail, a tooltip — that text has to be part of the accessible name.

Voice control does not read the caption. It matches what you say against the accessible name, so a
button captioned **Share** and named **"Send this track to a friend"** cannot be operated by saying
"click Share" — by the person looking straight at the word Share. Example 4 mocks that lookup: type a
command and it reports what matched.

Start the name with the visible text and add to it if you need to: `aria-label="Share this track"`
under a caption reading *Share* passes. `aria-label="Send this track to a friend"` does not.

## The icon is not the target

**SC 2.5.8** asks for 24×24 CSS pixels. `.ac-btn-icon` is 44 by default — the size a finger wants —
and `--sm` is 24 exactly. The glyph inside both is about 20 and 14 pixels: the padding is the target.

This is the criterion icon buttons fail, and they fail it in a specific way. A text button is held
open by its label whatever you do to the box. Take the label away and `min-width` is the only thing
left, so a box shrink-wrapped to a 20px glyph looks completely finished at 20×20. Example 5 measures
the button and the glyph separately so the difference is a number rather than a claim.

The only way out from under the floor is spacing: a 24px circle centered on the target must not
overlap the circle of any other target. That is a property of the page the button lands in, not of
the button — which is why there is no size below `--sm` here.

## Why the glyph is an inline `<svg>`

It is stroked with `currentColor`, so it inherits the button's own text color and follows it into
every state — hover, disabled, focus, and the system colors under Windows High Contrast — with no
rule of its own.

An `<img>` or a `background-image` cannot do that. Under `forced-colors: active` the browser replaces
the button's background with a system color and leaves a raster icon exactly the color it was drawn
in, which is how a dark glyph ends up on a dark fill. There is no declaration that fixes it. (A
`background-image` is dropped there outright, so the icon simply disappears.)

## States

| State | Signaled by | Not by |
| --- | --- | --- |
| hover | the fill moves toward the theme's text color | — |
| focus | a 3px `:focus-visible` ring at 2px offset, identical on all three weights | never the border — ghost has none |
| active | `translate` + `scale`, both multiplied by `--ac-motion` | not transitioned; a press that eases in is not a press |

Under `forced-colors: active` the three weights **collapse** into `ButtonFace` inside a
`ButtonBorder`, and ghost — no fill, no border of its own — stops reading as a control, which is why
the `@media` block gives it one. The glyph needs no rule there at all.

## Keyboard

Nothing to write. A native `<button>` arrives with a tab stop, and <kbd>Enter</kbd> and
<kbd>Space</kbd> both wired to a click.

| Key | Result |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | move to and from the button |
| <kbd>Enter</kbd> | activate |
| <kbd>Space</kbd> | activate |

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: "Play, button" for example 1's
first control, the same for both of example 2's first two, and — for example 3 — "button" alone,
twice, with nothing to distinguish the two failing controls from each other or from anything else.

`title` announcements vary: with no other source, NVDA and JAWS commonly read it as the name, and
some verbosity settings read it as a description *after* the role. That variance is part of the
argument against it.

## API

```js
const c = AC.createIconButton(container);

c.resolveName(button);   // { name, from } — the accessible name, and its source
c.refresh();             // re-run the two readouts on this page
c.destroy();
```

Idempotent: calling it twice on the same element returns the existing instance. An icon button needs
no JavaScript — the only part worth lifting is `resolveName`, and it is worth lifting into a test:

```js
document.querySelectorAll('.ac-btn-icon').forEach((el) => {
  console.assert(c.resolveName(el).name, 'unnamed icon button', el);
});
```

It implements the name computation in order for the simple cases here. It does not follow
`aria-labelledby` chains, `alt` text, or CSS generated content, so it is a check rather than a
replacement for a real accessibility tree inspector.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const c = AC.createIconButton(ref.current);
  return () => c.destroy();
}, []);
```

## What to watch for

- **No name at all.** Announces as "button". This is the whole component.
- **`aria-label` on a wrapper.** A `<span>` cannot be named, and a child never inherits a name.
- **`title` as the label.** No touch, no reliable keyboard, and an announcement that varies by AT.
- **A visible caption the name does not contain.** SC 2.5.3, and it locks out voice control.
- **The glyph left in the accessibility tree.** Without `aria-hidden="true"` on it, an SVG carrying a
  `<title>` contributes to the name and you get it twice, or in the wrong order.
- **A box shrink-wrapped to the icon.** Under 24×24 with nothing visibly wrong. `min-width` matters
  as much as `min-height` here, and only here.
- **A raster icon.** It cannot follow `currentColor`, so it cannot follow the button into a state or
  into High Contrast.
- **Two icon buttons with the same name in one view.** "button, Delete" three times is a list nobody
  can navigate; name them for the row they act on.
