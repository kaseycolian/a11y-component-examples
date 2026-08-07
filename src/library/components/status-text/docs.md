## Before you copy

Your framework has a `<StatusPill>` already and you should use it. **The decisions on this page are
the same either way** — they are about what the label contains and where the live region lives, not
about how the component is rendered. Take the markup and the CSS, keep the contract, and let your
framework own the state. This is enough for a person or an agent to start from.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## One sentence

The word is the status. Everything else on the label — the glyph, the color, the position — agrees
with the word or is decoration.

## The contract

| Piece | What it is | Why |
| --- | --- | --- |
| `.ac-status` + one tone | `--ok` / `--err` / `--muted` | one custom property each; nothing else differs |
| `.ac-status__glyph` | `aria-hidden="true"`, drawn from borders | a character or an image in here becomes part of the text |
| `.ac-status__text` | the word, in the reader's language | this is the status |
| `.ac-status__detail` | clipped text inside the label | the sentence that does not fit on screen |
| `.ac-status--compact` | clips the word at narrow widths | the phone layout still has a status in it |
| the live region | on the **list**, never on the label | one announcement per update, not one per row |

## Everything here comes from the size

[Alert](../notice/) owns the argument that the word carries the tone and the icon does not, and the
argument about which element carries the live role. Both are true here and neither is repeated. What
this component adds is what happens to those answers when the whole thing is one word wide:

- A notice has room for `Error:` in front of the sentence. A label has room for the word and nothing
  else, so the word has to be the one that already means something — `Failed`, not `No`.
- A notice is a block you can put a `role="status"` on. A label is inline in a row, and there are
  twenty rows.
- A notice can hold a link to the details. A label has nowhere to put them and no focus to hang them
  off.

## A tick is not a status

Example 2 has four labels that all mean "this worked", with the announced text printed under each.

| What was built | What is read out |
| --- | --- |
| the drawn tick, `aria-hidden`, no word | nothing |
| `content: "✓"` in the stylesheet | `✓` |
| `✅` typed into the markup | the emoji's Unicode name, in English, whatever the page language is |
| the specimen | `Shipped` |

The second one is the surprising one and it is [Filter Chip](../chip-toggle/)'s finding at label
scale: **CSS generated content is folded into the accessible name.** So the well-meant non-color cue
does not fail silently — it succeeds at putting a punctuation mark where the word should be. The
specimen's glyph is `content: ""` plus two borders, which contributes nothing to the text and,
being `currentColor`, survives forced colors on its own.

## The detail that does not fit

`Failed` is rarely the whole story, and there is nowhere on the label to put the rest of it. The
three places people reach for, all live in example 3:

| Where the reason went | What happens |
| --- | --- |
| `title="…"` | shown on hover only. The label is a `<span>` — no focus, no keyboard, nothing on touch. And because the element already has text, the `title` is not in the accessible name at all |
| a CSS `:hover` bubble | same, minus even the inconsistent announcement |
| `.ac-status__detail`, clipped | in the accessible name, in find-in-page, translated with the page |

A status label is not a control, which is what rules the first two out. SC 1.4.13 governs content
that appears on hover or focus, and a `<span>` has no focus to offer — so there is no compliant
version of the hover bubble here, only a version that excludes people. If the reason genuinely needs
to be revealed rather than always present, the thing being revealed from has to be a real button:
that is [Tooltip](../tooltip/)'s toggletip.

## One region, not one per row

The label is inline in a row, so the only element available to make live is the label itself. Do not.
Four rows updating becomes four announcements, queued behind each other, with no way to skip them —
example 4 counts them.

```html
<!-- in the markup from the start, empty, one per list -->
<p class="ac-st-slot" role="status"></p>
```

The labels are then updated silently and the region gets the summary: *"3 of 4 orders changed. 2
shipped, 1 failed."* The clear-then-write and the two frames are [Live Region](../live-region/)'s
recipe.

Rows that did not change are not rewritten. Assigning a region the string it already holds is a DOM
mutation without being news, and a list that re-renders every row on every poll announces four
things when one thing happened.

## When the column gets narrow

Dropping the word at narrow widths is reasonable — a phone has no room for a status column. Doing it
with `display: none` removes the word from the accessibility tree along with its box, and the mobile
layout has no status in it at all. `--compact` clips it instead: same tick on screen, same word
underneath.

Example 5 has both, with a checkbox standing in for the media query so the difference can be watched
without resizing the window.

## States

| State | Signaled by | Not by |
| --- | --- | --- |
| ok / err / muted | the word, then the glyph shape, then the color | never the color alone |
| compact | the word is clipped, not removed | — |

Under `forced-colors: active` both accents become the same `CanvasText`, so the tick and the cross
are told apart by their shape and by the word. Nothing puts the color difference back, because
nothing can.

## Keyboard

A status is not a control. There is nothing to operate and nothing to focus — which is the
constraint the whole page is about.

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: example 1's rows read as
*"Order 462 · Cold Water Flat LP, Shipped"* in document order. Example 3's specimen reads
*"Failed — card ending 4620 was declined"*. Example 4's specimen announces one sentence per press;
the list beside it announces one sentence per changed row.

## API

```js
const s = AC.createStatusText(container);

AC.setStatus(el, 'err', 'Failed');   // tone and word together, never separately
s.refresh();                         // re-run this page's readouts
s.destroy();
```

Idempotent: calling it twice on the same element returns the existing instance. `setStatus` is the
only part worth lifting — everything else in `component.js` is this page checking its own claims.

There is deliberately no way to set the tone without setting the word. That is the one API decision
here, and it is what stops the color and the text from drifting apart three refactors from now.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const s = AC.createStatusText(ref.current);
  return () => s.destroy();
}, []);
```

The part that does not survive the port is the region's lifetime: a `role="status"` that mounts at
the same moment as the sentence inside it was never being watched. Render the region
unconditionally and let only its contents be conditional.

## What to watch for

- **A colored dot with no word.** It announces an empty string.
- **`content: "✓"` as the non-color cue.** It lands in the text, and it is not a word.
- **An emoji as the glyph.** Its name is chosen by Unicode, is in English, and does not translate.
- **`role="status"` on the label.** Twenty rows is twenty announcements.
- **The reason in a `title`.** No keyboard, no touch, and usually not announced either.
- **`display: none` on the word at a breakpoint.** Clip it instead.
- **A status word that only means something next to the color.** `Yes` / `No` is not a status;
  `Shipped` / `Failed` is.
