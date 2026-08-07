## Before you copy

Your router or docs framework probably generates this from your headings, and you should let it.
**The decisions on this page are the same either way** — what the links point at, what the target has
to be, and how the current one is worked out. None of that is about how it is rendered, and this is
enough for a person or an agent to start from.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## One sentence

The links are ordinary links; the work is all on the other end of them.

## The contract

| Piece | Attributes | Why |
| --- | --- | --- |
| `<nav>` | `aria-label` | a page has more than one nav, and a landmark menu lists the name or nothing |
| `<ul>` / `<li>` | none | arriving reads "list, 4 items" — the size of the page before any of it is read |
| `<a href="#id">` | `aria-current="location"` on one of them | says which section you are in |
| the target | `tabindex="-1"`, `scroll-margin-top` | so the jump moves the keyboard, and lands somewhere you can see |

The name leaves out the word "navigation". A screen reader appends the role, so `aria-label="On this
page navigation"` is read as *"On this page navigation, navigation"*.

## The target needs `tabindex="-1"`

Following `<a href="#salad-days">` scrolls the page. It moves focus **only if the target can take
focus** — and a heading cannot.

What happens instead is worse than it sounds. The browser does not give up and leave focus on the
link: it runs the focusing steps for the document's viewport, so `document.activeElement` comes back
as `<body>` and the next <kbd>Tab</kbd> starts at the **top of the page**. A keyboard reader who asked
to be moved down the page has been moved to the beginning of it. Browser-confirmed in Chromium, and
example 2's readout prints it.

```html
<h2 class="ac-jump-nav__target" id="salad-days" tabindex="-1">Salad Days</h2>
```

`-1` and not `0`. Both land the jump; `0` also puts every heading on the page into the tab order, so
a reader tabbing through the content stops on each one for no reason. Example 2 presses the same link
into all three documents and prints what took focus, with the tab stops each one costs underneath.

The script does not add the attribute. It is in the markup so the keyboard behaves the same before the
script loads and after — the same call [Tabs](../tabs/) makes about its panel.

**Focus the heading or the section?** A heading announces *"Salad Days, heading level 2"*, which
confirms the jump and says where in the outline you are. A `<section tabindex="-1"
aria-labelledby="salad-days">` announces the name and then starts reading the content. Either is
defensible; the heading is what a table-of-contents generator already produces ids for.

## The target needs `scroll-margin-top`

SC 2.4.11 — the browser aligns the target with the top of the scrollport, and anything stuck there is
now on top of it. One token:

```css
.ac-jump-nav__target { scroll-margin-top: var(--ac-jump-offset, 1rem); }
:root { --ac-jump-offset: 5rem; }   /* your header, measured */
```

Measure it. This site's `--header-h` has three values, and two of them are the point where a line
wraps — no amount of reasoning about the CSS produced them. Too much only wastes space above an
anchor; too little hides the thing someone just asked to see. Example 3 puts the overlap in pixels.

The rule is `[id] { scroll-margin-top }` on most sites, applied globally, which is the right shape —
but it is one class deep, so a component rule at the same specificity loses to whichever stylesheet
loads last. If a target lands under the header anyway, that collision is where to look.

## `aria-current="location"`

`location` is a position **within** the page you are on. `page` is a link **to** the page you are on,
which is a different claim and belongs in a site nav. [Tabs](../tabs/)' example 5 has `aria-selected`
and `aria-current` side by side, and the argument for why a row of links is not a tab strip.

Set it on exactly one link and remove it from the rest. `aria-current="false"` is legal and means
nothing is current — it is not a way to mark the others.

## Which section is current

An `IntersectionObserver` watching a band across the top of the scrollport, not a scroll handler:

```js
new IntersectionObserver(callback, {
  root: null,                        // the page, or a scrolling box
  rootMargin: '0px 0px -70% 0px',    // only the top 30% counts as "here"
  threshold: 0,
});
```

The topmost heading inside the band is the current section. When nothing is in the band — between two
sections — the mark stays where it was, because you are still reading the one you were reading.

A sticky header eats into the band as well as into the scroll position, so an app with one shrinks the
top: `rootMargin: '-80px 0px -70% 0px'`.

A scroll handler is the version that gets written first, and it runs tens of times per flick. Example
4 has both numbers on the same document.

## Nothing is announced

There is no live region here, deliberately. `aria-current` moving is a consequence of scrolling, and
scrolling is not news — a `role="status"` on the nav would read a heading out over whatever the reader
was already listening to, once per section, for the length of the page. Example 4's third row is what
it would have said.

The announcement a jump nav *does* owe is the one it gets for free: focus lands on the target and the
heading is read.

## States

| State | Signaled by | Not by |
| --- | --- | --- |
| current | a 3px left edge, a tint, and full text color against a muted list | never the color alone (SC 1.4.1) |
| focused link | the 3px ring | never a change of tint |
| landed target | the 3px ring, on `:focus` | never nothing |

The edge is a `border-left` declared at its full 3px in both states — transparent when the link is not
the current one — so the list cannot reflow when the current section changes and shift the next link
out from under a pointer already heading for it.

The target's ring is `:focus`, not `:focus-visible`. The browser moves focus as part of following the
link, and a pointer-initiated move does not match `:focus-visible` — so the one confirmation a sighted
keyboard user gets that the jump landed would go missing exactly when they clicked.
[Skip Link](../skip-link/) makes the same call for the same reason. The rule carries a doubled class,
because a host stylesheet shipping `:focus:not(:focus-visible) { outline: none }` matches at the same
specificity and would otherwise cancel it.

Under `forced-colors: active` the tint is a dropped `color-mix`, so the current link is repainted as
`Highlight` / `HighlightText` — a system-selected thing, which is what it is — with the edge in
`HighlightText` so it still reads against the new fill.

## Keyboard

| Key | Where | Does |
| --- | --- | --- |
| <kbd>Tab</kbd> | in the nav | one stop per link. There is no roving tabindex here and there should not be |
| <kbd>Enter</kbd> | on a link | follows it: scrolls, and focuses the target |
| <kbd>Tab</kbd> | after the jump | continues from the target, which is the whole point of `tabindex="-1"` |

A jump nav is a list of links and keeps a stop for each. [Tabs](../tabs/) argues the other side — a
strip that trades its stops for the arrow keys — and the difference is that a tab strip swaps a panel
while these move you.

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: arriving at the nav reads *"On this
page, navigation, list, 4 items"*; the marked link reads *"Salad Days, link, current location"*;
following it reads *"Salad Days, heading level 4"*.

## API

```js
const n = AC.createJumpNav(nav);                            // the page scrolls
const b = AC.createJumpNav(nav, { scrollRoot: box });        // or [data-ac-jump-root="#box"]
const h = AC.createJumpNav(nav, { rootMargin: '-80px 0px -70% 0px' });

n.current();   // the target element of the current section, or null
n.links;       // the <a> elements
n.targets;     // what each one points at, by index. null for a dead link
n.destroy();
```

Idempotent: calling the factory twice on the same element returns the existing instance. It reads
every `a[href^="#"]` inside the nav, so the markup is the source of truth for what the sections are.

Every change dispatches a bubbling `ac:jump-nav:change` carrying `{ target, link }`. Example 4's
counter listens to it.

`destroy()` disconnects the observer and removes `aria-current` from every link.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const n = AC.createJumpNav(ref.current);
  return () => n.destroy();
}, []);
```

If the section list is generated, generate the `tabindex="-1"` with it. A heading component that emits
an `id` and not the `tabindex` is the most common way this ships broken, because the ids are what a
reviewer checks.

## What to watch for

- **A target with no `tabindex="-1"`.** The page moves and the keyboard is sent to the top of it.
- **`tabindex="0"` instead.** Every heading becomes a Tab stop.
- **No `scroll-margin-top`.** The heading lands under the sticky header (SC 2.4.11), and it is the
  reader who asked to see it who cannot.
- **A scroll handler instead of an observer.** Works, costs a throttle nobody writes, and invites a
  live region onto the result.
- **A live region on the nav.** It reads a heading out per section, over the top of the content.
- **`aria-current="page"` on an in-page link.** It says you are on that page, not in that section.
- **Two navs and one name.** A landmark menu shows *navigation, navigation*, and there is nothing on
  screen to notice it with.
- **A nav that scrolls sideways.** A scroll container is a tab stop with no role and no name in
  Chromium — [Background Effects](../effects/) has that finding. Let the list stack instead.
