## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and
the state into your own code. What has to survive that move is the ARIA below, the keyboard
behavior, and where focus goes — those are the parts that make the component accessible, and the
parts that are usually dropped.

If you already have a type scale, check it against the four things on this page, because a
hand-rolled scale usually misses at least one: **is the size in `rem`**, **does muted text still
clear 4.5:1**, **is a link identified by something other than its color**, and **does a box of text
survive the reader doubling its spacing**.

Every example on this page is numbered and separately copyable. The CSS sections name which examples
need them. The scale itself is the exception — take `[CORE]` whole, because there is no useful half
of a type scale.

## Required markup

Eight classes, and none of them mean anything. There is no ARIA here and no JavaScript.

| Class | Sets | Complete on its own? |
| --- | --- | --- |
| `.ac-t-h1` – `.ac-t-h4` | size, weight, line-height, margin | yes |
| `.ac-t-body` | the reading default — 1rem at line-height 1.6 | yes |
| `.ac-t-muted` | color only | no — pair it with a sizing class |
| `.ac-t-mono` | family only, at `font-size: 1em` | no — pair it with a sizing class |
| `.ac-t-link` | color and underline | yes |

`.ac-t-h4` is body size, told apart by weight. A heading set smaller than the text it introduces
reads as a caption, and the reader who most needs the structure is the one least able to spare the
size.

`.ac-t-mono` sets `font-size: 1em` on purpose. Browsers keep a separate, smaller default for the
generic `monospace` family — 13px against 16px — and a relative size compounds, so `code` at 0.85em
inside `pre` at 0.85em is 0.72em. Matching the surrounding text avoids both.

Case, shadow and tracking are declared rather than left open. Put one of these classes on an `<h2>`
and the host app's own `h1`–`h6` rules still cascade into every property the class does not set.

## Keyboard

None of these classes is a control, and none of them binds a key. What the page has is links.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Reaches the links in body copy. Nothing else here is a tab stop. |
| <kbd>Enter</kbd> | Follows the focused link. |

**Keys deliberately not bound.** All of them. This is a set of paint rules. A class that bound a key
would be a control wearing the wrong element, which is the failure example 2 is about, arriving from
the other direction.

The focus ring on those links is not declared here — it is the [Focus Indicator](../focus-ring/)
component's job, and the library ships it globally.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| de-emphasized | `.ac-t-muted`, a color at 9.5:1 on the dark surface and 7.1:1 on the light one. | `opacity`. It composites against whatever is behind it, so the ratio is written nowhere. |
| a link in body copy | An underline, plus the color. | The color alone (SC 1.4.1) — example 4 is that, live. |
| link hover | A thicker underline. | A color change on its own, which no keyboard or touch user gets. |
| link focus | The global focus ring. | — |
| forced colors | `CanvasText` for every text class, `LinkText` for both links. | — |

### Muted text has a floor — SC 1.4.3

De-emphasized is not exempt. 4.5:1 for normal-size text, 3:1 at 24px or at 19px bold, and a caption
gets no discount.

`--ac-text-muted` is **9.5:1** on the library's dark surface and **7.1:1** on its light one. Those
numbers are here rather than a claim that the class is safe, because a consumer who retints the token
drops under 4.5:1 with nothing failing anywhere.

**Do not use `opacity` for this.** Example 3 has it live. `opacity` composites the text against
whatever happens to be behind the element, so the resulting ratio is not written down anywhere —
`opacity: 0.4` on this library's body text lands between 3.4:1 and 3.7:1 across the dark themes and
around 2.5:1 across the light ones, from one declaration that names no color at all. No linter can
see it, and it moves when someone changes a background two levels up. Set a color.

Forced colors does not rescue it. `opacity` is not among the properties Windows High Contrast
replaces, so the faint paragraph is still faint over the reader's own background — the one failure on
this page that high contrast mode leaves standing.

### A link is not a color — SC 1.4.1

A link inside a block of text has to be distinguishable from the text around it by something other
than color. Color alone is permitted only when **both** of these hold: the link and the surrounding
text are at least 3:1 apart, **and** a non-color cue appears on hover and focus.

The first condition is the one nobody measures, so measure it here.

| Pair | Ratio | Verdict |
| --- | --- | --- |
| link color vs. the background | 13:1 | passes, and is the number people check |
| link color vs. the body text beside it | **1.27:1** | fails — 3:1 is the floor |
| the same pair, in the light theme | 3.08:1 | passes, barely |

One design, two themes, opposite verdicts. So the underline is not a style preference: it is the cue
that does not depend on which theme is loaded, on how the reader perceives color, or on the page being
rendered in color at all.

```css
.ac-t-link {
  color: var(--ac-accent-blue, var(--accent-blue, #3ceaff));
  text-decoration: underline;
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.18em;
}
```

`text-underline-offset` keeps the line clear of descenders so it stays a line rather than joining the
letterforms — which is the legitimate complaint underlines get, and it is fixable. The thickness is in
`em` so it grows with the text instead of staying a hairline at `h1` size.

Forced colors makes the argument by itself: both links are redrawn in `LinkText`, so the color cue
goes from the pair at once and only the underlined one is still identifiable.

Navigation links are the exception — a nav is already understood to be links, so the surrounding-text
test does not apply to it. Body copy is where this bites.

## Screen reader behavior

Nothing on this page is announced by any of these classes, which is the point — they are visual, and a
screen reader reads the elements underneath them. What it does announce is what example 2 is about:
`<h5 class="ac-t-h2">` announces as "heading level 5", and `<div class="ac-t-h2">` announces as its
text and nothing else.

The corollary is that **the failure in example 2 cannot be found with a screen reader unless you go
looking for what is absent**. It is not announced wrongly; it is not announced at all. Open the
heading list (NVDA <kbd>Insert</kbd> + <kbd>F7</kbd>, VoiceOver <kbd>VO</kbd> + <kbd>U</kbd>) and
count.

## A class is not a role

This is the whole reason the component exists. The **element** decides what a thing is; the **class**
decides what it looks like. They are two dials and they are not connected.

```html
<h2 class="ac-t-h4">Correct.</h2>     <!-- level 2 in the outline, small on screen -->
<div class="ac-t-h1">Not a heading.</div>
```

The second line looks like the most important thing on the page and is, to a screen reader, a
paragraph. It is missing from the heading list — the dialog screen reader users open to jump around a
long page, and the most-used navigation feature there is. Nothing on screen says so, nothing in the
markup looks wrong, and axe cannot report it, because a `<div>` with text in it is not an error.

Heading **levels** are chosen by position in the document, not by size. Skipping from `<h2>` to `<h4>`
does not fail a criterion outright, but it breaks the outline people navigate by, so pick the level
the document needs and then pick the class that looks right. **SC 2.4.6** is about headings describing
their section; that only helps if the heading is a heading.

Example 2 has both lines on the page at once, with the heading list printed underneath. The spec
asserts that printed list against the real accessibility tree, so it cannot drift.

## Text that survives being resized

Three criteria, one subject: what happens to your layout when the reader changes something about how
text is drawn. None of them is about your defaults.

### Sizes are `rem`, never `px`

Every browser has a default font size setting, a lot of people change it, and `px` ignores it
completely. Full-page zoom scales `px` too, which is why this survives the obvious test: press
<kbd>Ctrl</kbd> + <kbd>+</kbd> and everything looks fine. The setting it ignores is the one in
preferences.

`h1` and `h2` here are fluid:

```css
font-size: clamp(1.75rem, 1.45rem + 1.4vw, 2.5rem);
```

A floor in `rem`, a middle value carrying a `rem` term, a ceiling in `rem` — so it responds to the
viewport **and** to the root font size. A bare `font-size: 4vw` responds only to the viewport, and
text-only zoom does not move the viewport, so the text does not move at all. **SC 1.4.4** asks for
200%.

### Text spacing — SC 1.4.12

The criterion people have not heard of. A reader must be able to force all four of these without
losing any content or function:

| Property | Value |
| --- | --- |
| `line-height` | at least 1.5× the font size |
| spacing after paragraphs | at least 2× the font size |
| `letter-spacing` | at least 0.12× the font size |
| `word-spacing` | at least 0.16× the font size |

Browser extensions and OS-level reading tools do exactly this, dyslexia tooling in particular. **The
criterion is not about your defaults — it is about whether your boxes survive somebody else's.**

The failure is always the same shape: a fixed height. Text that fit at line-height 1.3 does not fit at
1.5, and `overflow: hidden` removes the last line with no scrollbar, no error, and nothing visible in
a screenshot.

```css
.ac-t-box { min-height: 14rem; }                 /* grows */
.ac-t-box { height: 14rem; overflow: hidden; }   /* clips */
```

Example 5 is both boxes with the same two sentences and a checkbox that applies all four values.
Shipping `line-height: 1.6` on body copy, as this scale does, means the first of the four changes
nothing here — the reader's setting is already met.

### Reflow — SC 1.4.10

At 320px wide, content has to reflow to one column with no horizontal scrolling. Typography's
contribution is one declaration:

```css
overflow-wrap: break-word;
```

An order id, a URL or a German compound noun at `h1` size is wider than 320px, and an unbroken word
does not wrap. Without it, one long word scrolls the whole page sideways.

## Common mistakes

- **A `<div>` wearing a heading class.** Styling, not structure. Missing from the heading list, and
  invisible to axe.
- **`font-size` in `px`.** The most common one, and it passes the zoom test, so it survives review.
- **`line-height` with a unit.** `line-height: 24px` is inherited as a *length*, so a child at a
  larger size gets the same 24px and overlaps itself. Unitless inherits the ratio.
- **A fixed `height` on anything holding text.** Cards, table cells, buttons with wrapping labels.
- **`text-transform: uppercase` for emphasis.** Some screen readers read an all-caps word letter by
  letter, and it costs sighted readers word-shape recognition. Style it uppercase, write it sentence
  case.
- **Justified text.** `text-align: justify` opens rivers of white space between words, which is
  **SC 1.4.8** (AAA) and a real reading-difficulty problem regardless.
- **Removing the underline from links in body copy**, then adding it back on hover. Hover is not a
  cue for anyone using a keyboard, a touchscreen, or a screen reader.
- **`opacity` as a color.** Covered above, and it appears in nearly every design system at least once.
- **A scale defined only in a design tool.** If the ratio is not in the CSS, the CSS drifts.

## Related

- [Rich Text Content](../prose-surface/) — the same scale applied to a block of authored markup.
- [Focus Indicator](../focus-ring/) — the ring on the links here, which this component does not draw.
- [Visually Hidden](../visually-hidden/) — text that is read but not drawn, the opposite trade.
