## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

**This is the one page here whose subject is not a component this library owns.** `fx-grid`,
`fx-bar-top`, `fx-bar-bottom`, `fx-scroll` and `fx-pulse` belong to the theme-service this site's
colors come from, and they ship in one vendored file: `src/site/theme/effects.css`. Copy that file.
What this page adds is the `[PATCH]` section of `component.css` — two rules `effects.css` does not
have, both of them accessibility rules. Ship them next to it.

Every example on this page is numbered and separately copyable. The CSS sections name which examples
need them.

## Required markup

There is no ARIA here and no JavaScript. Decoration adds nothing to the accessibility tree, which is
correct: it says nothing, so it should announce nothing.

| Class | What it draws | The obligation it brings |
| --- | --- | --- |
| `fx-grid` | crossing 1px lines on a `::before` | needs a stacking context; text on it still needs 4.5:1 |
| `fx-bar-top` / `fx-bar-bottom` | mirrored diagonal gradients | contrast at the worst point, not the ends |
| `fx-scroll` | a gradient scrollbar thumb | a recolored scrollbar is a recolored control |
| `fx-pulse` | a 1.8s brightness loop | SC 2.2.2 — a way to stop it |

The one element on this page that needs attributes is the scroll region:

```html
<div class="fx-scroll" tabindex="0" role="region" aria-label="Recent orders">
```

### `fx-grid` needs `isolation: isolate`

The backdrop is a `::before` at `z-index: -1`. A negative `z-index` puts it in the negative layer of
the **nearest ancestor stacking context** — and if its own host is not one, "behind the host" includes
behind the host's own background. An opaque panel swallows it whole.

```css
.fx-grid { position: relative; isolation: isolate; }   /* both lines are load-bearing */
```

`effects.css` ships both. You lose them by retyping the recipe instead of copying it, and the failure
is silent in a way worth understanding: the pseudo-element is still there, still has the right
`background-image`, `inset`, `opacity` and `z-index`, and the element inspector shows all of it. The
computed style is correct. Only the paint order is wrong, and nothing reports paint order.

Example 2 has the two panels side by side. They differ by one declaration, and the spec asserts that
their computed `::before` styles are identical.

## Keyboard

Nothing on this page binds a key. The scroll region is the only tab stop, and every key that moves it
comes from the browser.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> | Moves onto the scroll region. Chromium makes a scrolling box a tab stop with no `tabindex` at all; Safari does not, which is why you write the attribute anyway. |
| <kbd>ArrowDown</kbd> / <kbd>ArrowUp</kbd> | Scroll the focused region by a line. |
| <kbd>Home</kbd> / <kbd>End</kbd> | Jump to the top or the bottom of the focused region. |

**Keys deliberately not bound.** All of them. Reaching the region is `tabindex="0"`, and moving it is
the browser's job — a scroll container that needs a key handler to scroll is a scroll container
something else has already broken.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| focus | A 3px `:focus-visible` ring at 2px offset, from the `[PATCH]`. | The UA outline. On the auto-focusable box it computes to `rgb(16, 16, 16) auto 1px` — a black hairline on a dark theme (SC 2.4.7). |
| motion off | `--motion` resolving to `0`, which zeroes the duration. Chromium then reports the element as having no running animations and renders it at its base style. | A shorter duration. A fast animation is still an animation. |
| forced colors | Borders. `fx-bar-top` and `fx-bar-bottom` keep a `border-bottom` and a `border-top`, and those survive. | The gradient, the glow or the tint. All three are dropped. |

### The two motion gates have different reach

`fx-pulse` loops forever, and anything that moves automatically for more than five seconds needs a
mechanism to pause, stop or hide it (**SC 2.2.2**). On this site that mechanism is **Reduce motion**
in the header. The reasoning, the cascade and the reason a page toggle can only ever *add* the
restriction are all on the [Reduced Motion](../motion-preferences/) page; this page adds one finding.

```css
[data-motion="off"] { --motion: 0; }                    /* the token gate    */
[data-motion="off"] .fx-pulse { animation: none; }      /* the selector gate */
@media (prefers-reduced-motion: reduce) { .fx-pulse { animation: none; } }
```

`effects.css` ships all three, and the first two do not reach the same elements. The token gate
matches the element carrying the attribute, and a custom property is inherited from there. The
selector gate is a descendant combinator, so it needs the attribute on an **ancestor**. An element
with `data-motion="off"` on itself therefore resolves `--motion` to `0` and keeps animating — which is
example 5's left-hand box, still moving next to a box that reads the token:

```css
animation: name calc(var(--ac-motion, var(--motion, 1)) * 1.8s) ease-in-out infinite alternate;
```

Neither rule is wrong. An app sets `data-motion` on `<html>`, where both work, and the media query
targets `.fx-pulse` directly so an OS preference always wins. It fails the moment you scope the
attribute to a subtree — which a component that *is* its own motion scope does by definition. Gate
through the token and the question does not come up.

### Forced colors

Every one of these effects disappears in Windows High Contrast, and that is the right outcome.
Chromium drops gradient `background-image`s and every `box-shadow`, so both grid panels in example 2
become identical, both bars in example 3 flatten to `Canvas`, and the failing bar's contrast problem
goes with them. Decoration that survives forced colors is decoration painting over colors the reader
chose.

Which is the argument for never letting decoration be the only carrier of anything: if the gradient
was what told your header from your footer, forced colors just deleted the distinction.

Three things are still yours to do, and the `[FORCED]` block in `component.css` does them:

1. **Declare it rather than inherit it.** `background-image` is not in the list of properties the
   spec forces, so Chromium's behavior is not a guarantee from every engine.
2. **Repaint the scrollbar thumb.** It is a gradient with a 2px border and
   `background-clip: padding-box`. Drop the gradient and the thumb is a transparent hole — the
   scrollbar loses the one part of it the reader aims at.
3. **Keep your borders.** Anything whose only edge was a glow or a tint has no edge left.

## Screen reader behavior

Expected: nothing at all from `fx-grid`, `fx-bar-top`, `fx-bar-bottom` and `fx-pulse`, none of which
put an element in the accessibility tree; "Recent orders, region" on landing in the named scroll
region in example 4; and, in the unnamed one, the list contents with no announcement of what was
entered or that it scrolls.

**Not yet verified against real assistive technology.** The first and third of those *are* asserted
against Chromium's accessibility tree by the spec — the backdrop panel's whole subtree is its one
paragraph, and the unnamed scroller has neither a role nor a name. Until `docs/at-support.md` has a
row for this component, the announcements above are intent rather than measurement.

## Contrast on a gradient — SC 1.4.3

Text needs 4.5:1 against **everywhere it can land**, and a gradient's ends are the two places least
likely to be the worst. Measured on this page, in the theme it loads with:

| Bar | At the ends | At the 55% stop |
| --- | --- | --- |
| `fx-bar-top` | 16.79:1 | 11.35:1 |
| `fx-bar-bottom` | 16.79:1 | 10:1 |
| the same gradient at 70% accent | 16.79:1 | **2.18:1** |

The third row is example 3's failure, and it is the edit somebody makes to give a header more
presence. Both shipped bars have room for it; that is what the 22% and 20% mixes in `effects.css` buy.

Two things make this hard to catch. A 135° gradient runs corner to corner, so the endpoints are two
corners nobody puts text in — a color picker lands on 16.79:1 and reports a pass. And the same
declaration **passes in the light theme, at 6.27:1**: switch themes in the header and watch example 3
change its mind. One design, two themes, opposite verdicts.

The same applies to `fx-grid`, with more headroom: body copy on that panel is 16.79:1 against the
surface and 15.72:1 where it crosses a grid line. About one point, bought three times over — 1px
lines, a 10% `color-mix`, and a 0.4 opacity. Each of the three is a knob a theme can turn.

## A recolored scrollbar is a recolored control

`fx-scroll` recolors a scrollbar, which puts three requirements on the box it is on.

**It has to be reachable.** A scroll container that a keyboard user cannot scroll fails **SC 2.1.1**.
Chromium 151 gives any scrollable box a tab stop with no `tabindex` at all — tested here, and it is
the reason the unnamed region in example 4 is reachable. Safari does not do it. So keep writing the
attributes.

**It has to say what it is.** That automatic tab stop buys reachability and nothing else: with no
role and no name, a screen reader user lands somewhere and is told nothing about where they are
(**SC 4.1.2**). `role="region"` plus a name is what turns a tab stop into a destination.

**It has to show focus.** `effects.css` draws no focus indicator, and the UA one on the
auto-focusable box computes to `rgb(16, 16, 16) auto 1px` — a black hairline on a dark theme, which
is an indicator you cannot see (**SC 2.4.7**). That rule is the first half of the `[PATCH]`.

Then the scrollbar itself: the thumb is 5.2:1 against its track at the dimmest point of the gradient,
where **SC 1.4.11** asks for 3:1. Firefox falls back to its own scrollbar here, and that is fine —
`effects.css` deliberately does not set `scrollbar-width` or `scrollbar-color`, because Chromium 121+
ignores every `::-webkit-scrollbar` rule when those are present. Do not add them "for Firefox": you
will silently lose the styling everywhere else.

## Common mistakes

- **Retyping a `::before` recipe.** You will drop `isolation: isolate` or `position: relative`, and
  nothing will tell you.
- **Measuring a gradient at its endpoints.** Sample the stops. A three-stop gradient has at least
  three answers and the middle one is usually the worst.
- **`pointer-events` on a decorative overlay.** `fx-grid` sets `none`. An overlay that forgets it
  eats every click in the element underneath, which is invisible in a screenshot and total for a
  mouse user.
- **`scrollbar-width` / `scrollbar-color` next to `::-webkit-scrollbar` rules.** Chromium 121+ drops
  the webkit rules entirely when the standard ones are present.
- **A scroll region with no accessible name.** Reachable and unlabeled is worse than it sounds: it is
  a stop on the Tab route that reports nothing about itself.
- **Gating motion with a descendant selector.** It misses the element that carries the attribute.
  Gate through the token.
- **Decoration that carries meaning.** A colored bar that means "error", a glow that means "selected".
  Forced colors removes it, and so does a printout.

## Related

- [Reduced Motion](../motion-preferences/) — the toggle that stops the pulse, and the cascade behind it.
- [Focus Indicator](../focus-ring/) — the ring the `[PATCH]` draws on a focused scroll region.
- [Data Table](../data-table/) — the same three scroll-region attributes, on a table wrapper.
