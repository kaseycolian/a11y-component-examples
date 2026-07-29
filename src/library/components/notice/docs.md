## Before you copy

Your framework has a `<Alert variant>` already and you should use it. **The decisions on this page
are the same either way** — they are about which element carries the live role and what carries the
tone, not about how the component is built. Take the markup and the CSS, keep the contract, and let
your framework own the rendering. This is enough for a person or an agent to start from.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## One sentence

A notice has a tone and a place. The tone is carried by a word, and the place — not the notice —
carries the live role.

## The contract

| Piece | What it is | Why |
| --- | --- | --- |
| `.ac-notice` + one tone | `--info` / `--success` / `--warn` / `--error` | one custom property each; nothing else differs |
| the icon | `aria-hidden="true"`, inline `<svg>` on `currentColor` | it is decoration, and it is the only icon that survives forced colors |
| the prefix word | `Note:` / `Success:` / `Warning:` / `Error:` | this is the tone, for everyone not looking at the color |
| the live role | on the **container** the notice is put into | a region has to be watched before it can change |
| a static notice | **no role at all** | nothing changed, so there is nothing to announce |
| `role="alert"` | errors only, never present at page load | it interrupts, and it fires on every render |

## The icon is decoration, the word is the meaning

A notice that is an error only because it is pink fails SC 1.4.1 twice over: for anyone who does not
separate those hues, and for anyone who is not looking at the screen at all. Adding an icon fixes
the first and does nothing for the second, because a decorative icon is `aria-hidden` and a
*meaningful* one has to be named — at which point you have written the word anyway, in a worse
place.

So write the word. Example 2 has the same sentence in two tones, with and without the prefix; the
readout prints what is announced, and without the prefix the success notice and the error notice are
the same string.

The tones here are the theme's four accents — blue, green, purple, pink — and there is no red.
That is survivable exactly because the word carries it. [Status Text](../status-text/) is this
argument at label scale and points back here rather than repeating it.

## Static or announced

This is the part that gets built wrong, and the DOM afterwards looks the same either way.

A screen reader announces a **change to a region it is already watching**. So the container has to
be in the document, unhidden, and empty before there is anything to put in it — and then the notice
goes inside it:

```html
<!-- rendered with the page, empty, and left alone -->
<div class="ac-nc-slot" role="status"></div>
```

```js
region.textContent = '';                  // clear first
requestAnimationFrame(() =>               // two frames, not one
  requestAnimationFrame(() => region.appendChild(notice)));
```

The clear-then-write and the two frames are [Live Region](../live-region/)'s recipe, and the
reasoning is there: writing a region the string it already holds is not a change, and a single
`requestAnimationFrame` can batch the clear and the write into one reported state.

The three ways to get it wrong, all in example 3:

| What was built | What happens |
| --- | --- |
| region rendered empty, notice put inside it | announced |
| notice created **carrying** `role="status"` | silent — nothing was watching it |
| no live role anywhere | silent |

Nothing about the second one looks wrong. The role is spelled correctly, it is on a visible element,
and the page reads perfectly in the inspector.

## `role="alert"` is for errors, and never at page load

`role="alert"` is assertive: it interrupts whatever is being read. That is right for a card
decline and wrong for "Saved". Everything that is not an error gets `role="status"`.

An alert that is **present in the markup when the page loads** fires immediately, before the reader
has heard the page, and does it again on every render and every back-navigation. Example 4 has one
live at the top of its panel and the log records it firing before you pressed anything. Render the
container empty and fill it when the error happens.

A polite region that is populated at load is not announced, so a server-rendered `role="status"`
is harmless — just pointless. Drop the role.

## Dismissing one

Removing the focused element does not move focus: it drops to `<body>`, and a keyboard reader is
returned to the top of the document. Chrome will not `focus()` `<body>` back either, so it cannot be
undone afterwards — the next target has to be picked **before** the removal.

Example 5's specimen focuses the notice list (`tabindex="-1"`, `role="status"`, and a name), then
removes the notice, then writes what happened into the list it just focused. The broken one removes
the button and stops.

The close button needs a name that says *which* notice. "Close" is fine when there is one; with
three on screen a voice-control user saying "click Close" has three matches and a screen reader user
tabbing through hears the same word three times (SC 2.4.4, SC 2.5.3). `aria-label="Dismiss: the zine
ships separately"` is the whole fix.

## Target size

The close button is 44px, which is taller than one line of notice text — deliberately. It is
negatively margined so the oversized target overlaps the notice's own padding rather than stretching
the box. `box-sizing: border-box` counts the border into the measured size, so shrinking this to
"24px" with a 2px border leaves 20px of anything else (SC 2.5.8).

## States

| State | Signaled by | Not by |
| --- | --- | --- |
| tone | the prefix word, then the edge, the icon and the tint | never the color alone |
| close hover | a tinted fill and full-strength text | — |
| close focus | a 3px `:focus-visible` ring, inset | — |

Under `forced-colors: active` all four accents become the same `CanvasText` and the `color-mix` tint
is dropped, so **the four tones render identically**. Nothing in the `[FORCED]` block puts the
difference back, because nothing can — the user asked for two colors. The prefix word is what is
left, which is the same reason it was there for the screen reader.

## Keyboard

A notice is not a control. There is nothing to operate unless it is dismissible.

| Key | Result |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | to and from the close button, and to any link inside the text |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | dismiss |

No <kbd>Esc</kbd>: a notice is not a dialog, and binding Esc at document level to dismiss one takes
the key away from whatever is actually modal.

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: example 1's notices are read as
ordinary text in document order, starting with the prefix word. Example 3's specimen announces
*"Success: 462 records saved to the crate"* on the press and nothing on arrival. Example 4's
server-rendered alert announces at load, which is the bug.

## API

```js
const n = AC.createNotice(container);

const el = n.build('error', 'The card ending 4620 was declined.');
n.announce(region, el);   // region already carries role="status" or role="alert"
n.refresh();              // re-run this page's readouts
n.destroy();
```

Idempotent: calling it twice on the same element returns the existing instance. `build` and
`announce` are also on `AC` directly (`AC.buildNotice`, `AC.announceNotice`) and are the only two
parts worth lifting — everything else in `component.js` is this page checking its own claims.

`announce` returns the `requestAnimationFrame` handle so a pending write can be canceled, which
matters when notices can arrive faster than two frames apart.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const n = AC.createNotice(ref.current);
  return () => n.destroy();
}, []);
```

The part that does not survive the port is the region's lifetime: a `role="status"` that React
mounts at the same moment as the message inside it is the failure in example 3. Render the container
unconditionally and let only its contents be conditional.

## What to watch for

- **`role="alert"` in server-rendered markup.** It fires on every load, forever.
- **The role on the notice instead of the container.** Silent, and the DOM looks right.
- **A tone carried only by color.** Add the word, not a second color.
- **A meaningful icon left `aria-hidden`.** If it is the only thing saying "error", it is not
  decoration and the markup is lying.
- **`display: none` on an empty region.** A hidden region is not being watched. It costs one grid
  gap to leave it in — see [Live Region](../live-region/).
- **Three close buttons all called "Close".** Name the notice in the button.
- **A dismissed notice that drops focus.** Pick the next target before you remove the old one.
- **Notices that pile up.** Five polite regions filling at once is five announcements queued behind
  each other. One region, replaced.
