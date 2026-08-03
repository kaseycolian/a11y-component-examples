## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

A text button gets its accessible name for free from the word on it, and gets its width for free from
the same word. An icon button has neither, so the name and the box are both explicit.

| Element | Attribute | What it does |
| --- | --- | --- |
| `<button>` | `class="ac-btn ac-btn-icon"` | Both classes. The base is [Button](../button/)'s, copied; the icon part is four rules. |
| `.ac-btn-icon` | `--solid` / `--outline` / `--ghost` | Weight, unchanged from Button. |
| `.ac-btn-icon` | `--pink` / `--green` / `--blue` / `--purple` | Accent, unchanged. The accent is a custom property the weight rules read, so an icon button needs no rule of its own. |
| `.ac-btn-icon` | `--sm` | 24×24, on the SC 2.5.8 floor exactly. There is nothing below it. |
| `<button>` | `aria-label`, **or** a clipped `<span>` inside it | The accessible name. One of the two, always — never neither. |
| `<button>` | `type="button"` | Required unless it is submitting a form. The default is `submit`. |
| `<svg>` glyph | `aria-hidden="true"` | Keeps the SVG out of the name. Without it, an SVG carrying a `<title>` gives the button a second and worse half. |
| `<svg>` glyph | `focusable="false"` | Keeps it out of the tab order. IE-era Edge, and some assistive technology, still honor it. |

### The name is computed in a fixed order

The first source that produces text wins.

| Order | Source | Notes |
| --- | --- | --- |
| 1 | `aria-labelledby` | Points at other elements. Wins even when they hold nothing useful. |
| 2 | `aria-label` | Replaces everything below it. |
| 3 | The element's own text | With `aria-hidden` subtrees removed — which is why the glyph is hidden. |
| 4 | `title` | The last resort, and the one to avoid. |

With no `aria-label` and no text, an icon button announces as **"button"**. Not "unlabeled button",
not the file name of the icon — "button". A row of them is "button, button, button".

## Keyboard

A native `<button>` supplies all of this. There is no key handler in `component.js`.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Moves to and from the button. One stop — the glyph is `aria-hidden` and takes none. |
| <kbd>Enter</kbd> | Activates the button. |
| <kbd>Space</kbd> | Activates the button. |

**Keys deliberately not bound.** None. `focusable="false"` on the `<svg>` exists so the glyph does
not become a second tab stop in browsers that made SVG focusable by default.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| hover | The fill moves toward the theme's text color. | — |
| focus | A 3px `:focus-visible` ring at 2px offset, identical on all three weights. | The border. Ghost has none. |
| active | `translate` and `scale`, both multiplied by `--ac-motion`. Not transitioned. | — |

Under `forced-colors: active` the three weights **collapse** into `ButtonFace` inside a
`ButtonBorder`, and ghost — no fill and no border of its own — stops reading as a control, which is
why the `@media` block gives it one. The glyph needs no rule there: `currentColor` follows the system
color the button was just given.

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: "Play, button" for example 1's
first control; the same name for all three of example 2's; and — for example 3 — "button" alone,
twice, with nothing to distinguish the two failing controls from each other or from anything else on
the page.

`title` announcements vary. With no other source, NVDA and JAWS commonly read it as the name, and
some verbosity settings read it as a description *after* the role. That variance is part of the
argument against it.

## `aria-label`, or clipped real text?

Both announce the same. They are not the same thing, and clipped text is the better default whenever
the label *can* be a phrase.

| Property | `aria-label` | Clipped text inside the button |
| --- | --- | --- |
| Announced | yes | yes |
| Found by Ctrl+F | no | **yes** |
| Picked up by a translation tool | inconsistently | **yes** — it is page text |
| Selectable and copyable | no | yes |
| Can be revealed at a wider viewport | **no** | yes, with one class |
| Cost | an attribute | a `<span>` |

The last row decides it. Example 2's third button is the second one with `--labeled` added: the same
markup becomes a labeled button, because text can be un-clipped and an attribute cannot.
`.ac-btn-icon__label` is a local copy of [Visually Hidden](../visually-hidden/)'s recipe.

`aria-label` is still right when there is no phrase to write — a close button in a corner, an
established glyph in a dense toolbar — and it is always better than nothing.

## The glyph is an inline `<svg>`, not an image

It is stroked with `currentColor`, so it inherits the button's own text color and follows it into
every state — hover, disabled, focus, and the system colors under Windows High Contrast — with no
rule of its own.

An `<img>` or a `background-image` cannot do that. Under `forced-colors: active` the browser replaces
the button's background with a system color and leaves a raster icon exactly the color it was drawn
in, which is how a dark glyph ends up on a dark fill. There is no declaration that fixes it. A
`background-image` is dropped there outright, so the icon simply disappears.

## API

```js
const c = AC.createIconButton(container);

c.resolveName(button);   // { name, from } — the accessible name, and its source
c.refresh();             // re-run the two readouts on this page
c.destroy();
```

Idempotent: calling it twice on the same element returns the existing instance. An icon button needs
no JavaScript. The only part worth lifting is `resolveName`, and it is worth lifting into a test:

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

## Common mistakes

- **No name at all.** It announces as "button". The markup is valid, the icon renders, and nothing
  reports it — which is why this is the whole component.
- **`aria-label` on a wrapper.** A `<span>` is generic, ARIA prohibits naming it, and a name on a
  parent is never inherited by a child. Put it on the element that has the role.
- **`title` as the label.** No touch, no reliable keyboard, and an announcement that varies by
  assistive technology. See [Tooltip](../tooltip/) for what to do instead.
- **A visible caption the name does not contain.** SC 2.5.3 Label in Name. A button captioned *Share*
  and named "Send this project to a teammate" cannot be operated by saying "click Share". Start the
  name with the visible text and add to it: `aria-label="Share this project"` passes.
- **The glyph left in the accessibility tree.** Without `aria-hidden="true"`, an SVG carrying a
  `<title>` contributes to the name and you get it twice, or in the wrong order.
- **A box shrink-wrapped to the icon.** Under 24×24 with nothing visibly wrong (SC 2.5.8). `min-width`
  matters as much as `min-height` here, and only here, because there is no label holding the box open.
  The only way out from under the floor is spacing, and spacing is a property of the page rather than
  of the button — which is why there is no size below `--sm`.
- **A raster icon.** It cannot follow `currentColor`, so it cannot follow the button into a state or
  into High Contrast.
- **Two icon buttons with the same name in one view.** "Delete, button" three times is a list nobody
  can navigate. Name them for the row they act on.

## Related

- [Button](../button/) — the base this is built on.
- [Visually Hidden](../visually-hidden/) — the clipping recipe, and why `aria-label` is a different
  tool rather than a shorter spelling.
- [Tooltip](../tooltip/) — the replacement for `title`.
