## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

If your design system already has a focus style, check it against two questions: **can you see it on
every surface it lands on**, and **is it still there in forced colors**. Those are the two the
hand-rolled version usually fails.

Every example on this page is numbered and separately copyable. The CSS sections name which examples
need them. The modifiers are complete on their own — put `ac-focus-ring--inset` on an element, not
`ac-focus-ring ac-focus-ring--inset`.

## Required markup

One class. There is no ARIA here, and nothing about a focus indicator is announced.

```css
.ac-focus-ring:focus-visible {
  outline: 3px solid var(--ac-focus, var(--focus-ring, #3ceaff));
  outline-offset: 2px;
}
```

| Declaration | Why it is there |
| --- | --- |
| `:focus-visible` | The browser's judgement about when an indicator is wanted, which beats yours — see below. |
| `3px` | A hairline against a busy surface is not an indicator. **SC 2.4.13** (AAA) puts numbers on this. |
| `solid` | A dashed or dotted ring loses most of its perimeter, and most of its contrast with it. |
| `outline-offset: 2px` | Separates the ring from the element's own border, so it reads as a state and not as a heavier edge. |

No `border-radius`: a modern browser's outline already follows the element's, so a pill gets a pill.
No transition either — an indicator that fades in is an indicator that is not there yet, and the
person is already deciding whether they pressed the right key.

### The modifiers

| Variant | Offset | Use it when |
| --- | --- | --- |
| `.ac-focus-ring` | `2px` | The default. |
| `.ac-focus-ring--always` | `2px`, on `:focus` | The control only exists once focused — a skip link, and close to nothing else. |
| `.ac-focus-ring--flush` | `0` | The ring would overlap the next control in a tight row, or spill past the edge of the viewport. |
| `.ac-focus-ring--inset` | `-3px` | An ancestor has `overflow: hidden`, or the element sits flush against one. |
| `.ac-focus-ring--two-tone` | `3px` + a shadow | The surface behind it is not one you control. |

`--inset` costs 3px of the element's own area, so the element has to be big enough to spare it.
`--flush` reads as a heavier border rather than as a change of state, so treat it as a last resort
rather than a style choice.

## Keyboard

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Moves focus, and `:focus-visible` matches. A mouse press moves focus too, and it does not. |

**Keys deliberately not bound.** All of them. This is a paint rule, not a widget, and every failure on
this page is invisible unless you press <kbd>Tab</kbd>.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| focus-visible | A 3px solid outline at 2px offset, in the theme's focus color. | A background tint. That is color alone (SC 1.4.1) and forced colors replaces it outright. |
| focus | Nothing, by default. `--always` is the opt-in for the one case that needs it. | — |
| forced colors | The same outline, redrawn in `CanvasText`. | `box-shadow`, which forced colors drops entirely. |

Nothing here is announced, and that is the point — the focus indicator is the sighted keyboard user's
half of the information a screen reader gets from the focused element's name and role. A component can
pass every ARIA check on this site and still be unusable by someone who navigates by Tab and can see.

### `:focus-visible` is the default and `:focus` is the exception

`:focus` matches every time an element takes focus, a mouse click included. `:focus-visible` matches
only when the browser judges that the person needs telling: a Tab, an arrow key, or **any** focus on a
text field, because a caret needs a home. That judgement accounts for input methods nobody has thought
of yet, and it is right more often than a hand-written rule is.

So every component in this library draws its ring on `:focus-visible`. There is one deliberate
exception, and it is worth knowing why. [Skip Link](../skip-link/) uses plain `:focus`, because a skip
link only exists once it has focus — if a focus there fails to match `:focus-visible`, and a
programmatic one may not, the link is focused and invisible and nothing on screen says so.
`.ac-focus-ring--always` is for that case and close to no other.

**One thing to check in your own app.** A global `:focus:not(:focus-visible) { outline: none }` is
exactly as specific as `.your-class:focus`, so whichever loads later wins. This site ships that
global, which is why `--always` in `component.css` carries a second, doubled selector. If a `:focus`
rule of yours mysteriously does nothing, this is usually why.

## Screen reader behavior

Nothing. A focus indicator has no accessible name, no role and no announcement, by design.

The corollary is the useful part: **none of the failures on this page can be found with a screen
reader**, or with axe, or with any other automated tool. All of them will report that the button is
fine. Press <kbd>Tab</kbd>.

## The two-tone ring

One accent ring is fine over a surface you control. Over a photo, a light card and a dark footer it
will contrast with one of them and disappear against another — and it disappears exactly where nobody
was looking.

```css
.ac-focus-ring--two-tone:focus-visible {
  outline: 2px solid var(--ac-focus-outer, var(--bg, #070110));
  outline-offset: 3px;
  box-shadow: 0 0 0 3px var(--ac-focus-inner, var(--text, #f3ecff));
}
```

Two adjacent rings of opposite lightness: whatever is behind them, one of the two has something to
contrast with. The tones are the theme's **text and background colors**, because those are the one
pair a theme already guarantees contrast with each other — nothing extra to keep in sync, and the ring
inverts by itself when the theme does.

The `box-shadow`'s 3px spread fills exactly the gap the outline's 3px offset opens, so the two are
contiguous rather than a ring and a halo. The order is not arbitrary: forced colors drops `box-shadow`
outright, so the tone that has to survive is the one drawn as an outline.

This is **SC 2.4.13 Focus Appearance**, which is **AAA** and therefore not required at AA. It is two
declarations.

### Forced colors

Windows High Contrast replaces every color you set with the user's own palette and drops `box-shadow`,
background images and `color-mix` entirely. That takes the two-tone ring's inner tone, the tint in
example 4, and the `box-shadow` ring with it.

```css
@media (forced-colors: active) {
  .ac-focus-ring:focus-visible {
    outline-color: CanvasText;
  }
}
```

`CanvasText` rather than `Highlight`: `Highlight` is the selection color and is not guaranteed to
contrast with the element's own background in every high-contrast theme. To see any of this without
changing your OS settings, use Chrome DevTools → **Rendering** → **Emulate CSS media feature
forced-colors**.

## Focus not obscured — SC 2.4.11

New in WCAG 2.2, and **AA**: when an element receives focus, author content must not hide it entirely.
A sticky bar breaks it without anyone doing anything wrong, because the browser scrolls a focused
element only just into view. Moving **backwards** through a list is where that bites: the target is
above the scrollport, so its top edge is lined up with the scrollport's top edge — which is exactly
where the bar is parked. The ring is drawn correctly. It is behind something.

```css
.ac-fr-cleared {
  scroll-margin-top: 3rem; /* at least the height of the sticky thing */
}
```

It goes on the **focusable element**, not on the bar. Example 5 has the same list twice, with and
without it. This library applies the same fix at page scale: `site.css` sets `scroll-margin-top` on
anything with an `id`, clearing the sticky site header.

## Common mistakes

- **`outline: none` with no replacement.** SC 2.4.7, and the most common accessibility defect there
  is. Example 4 has it live.
- **`outline: none` plus a background tint.** It looks handled, because the button visibly changes.
  The change is a difference of two colors — SC 1.4.1 — and nowhere near the 3:1 contrast change
  **SC 1.4.11** asks of a non-text indicator. Forced colors then replaces the tint outright.
- **`outline: none` in a CSS reset.** Hand-rolled resets and old framework forks do this, and it
  removes the indicator from an entire application at once.
- **`:focus` where you meant `:focus-visible`**, which leaves a ring on every button a mouse user
  clicks — and is the reason people reach for `outline: none` in the first place.
- **`overflow: hidden` anywhere above a focusable element.** Carousels, cards with rounded corners,
  anything with a scroll shadow. The ring is painted outside the box and clipped away, with no error.
  Use `--inset`.
- **`border-radius` in a focus rule.** An outline already follows the element's own.
- **A ring built from the element's border.** A ghost button has no border at rest, so there is
  nothing to thicken.
- **A ring on a container that delegates to a child.** If a wrapper takes focus and the child is what
  is visible, the ring is drawn around the wrapper and may be nowhere near the thing being operated.
- **A ring that only contrasts with your one design surface.** Check it against the darkest and
  lightest things in the app, and over an image.
- **A sticky bar with no `scroll-margin-top` on what it can cover.** SC 2.4.11, and it only shows up
  moving backwards.
- **`:focus-within` as a substitute.** It marks an ancestor, not the focused element, so it cannot say
  *which* control is live. It is a layout tool.
- **Testing with a mouse.** Every failure on this page is invisible to a pointer.

## Related

- [Skip Link](../skip-link/) — the one component that draws on `:focus` instead, and why.
- [Button](../button/) — the ring in its ordinary setting.
- [Effects](../effects/) — the surfaces the two-tone ring exists for.
