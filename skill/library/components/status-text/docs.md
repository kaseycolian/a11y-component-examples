## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

The word is the status. Everything else on the label — the glyph, the color, the position — agrees
with the word or is decoration.

| Piece | What it is | What it does |
| --- | --- | --- |
| `.ac-status` + one tone | `--ok` / `--err` / `--muted` | One custom property each; nothing else differs. |
| `.ac-status__glyph` | `aria-hidden="true"`, drawn from borders | A character or an image in here becomes part of the text. |
| `.ac-status__text` | the word, in the reader's language | This is the status. |
| `.ac-status__detail` | clipped text inside the label | The sentence that does not fit on screen. |
| `.ac-status--compact` | clips the word at narrow widths | The phone layout still has a status in it. |
| the live region | on the **list**, never on the label | One announcement per update, not one per row. |

The class prefix is `.ac-status` and the factory is `AC.createStatusText`. Both keep their spelling —
this component's display name changed, its slug did not.

### The detail that does not fit

`Failed` is rarely the whole story, and there is nowhere on the label to put the rest of it. The
three places people reach for, all live in example 3:

| Where the reason went | What happens |
| --- | --- |
| `title="…"` | Shown on hover only. The label is a `<span>` — no focus, no keyboard, nothing on touch. And because the element already has text, the `title` is not in the accessible name at all. |
| a CSS `:hover` bubble | The same, minus even the inconsistent announcement. |
| `.ac-status__detail`, clipped | In the accessible name, in find-in-page, translated with the page. |

A status label is not a control, which is what rules the first two out. SC 1.4.13 governs content
that appears on hover or focus, and a `<span>` has no focus to offer — so there is no compliant
version of the hover bubble here, only a version that excludes people. If the reason genuinely needs
to be revealed rather than always present, the thing being revealed from has to be a real button:
that is [Tooltip](../tooltip/)'s toggletip.

## Keyboard

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> | Nothing. Nothing here is a tab stop. |

**Keys deliberately not bound.** All of them. A status is not a control: there is nothing to operate
and nothing to focus, which is the constraint the whole component is about. It is also why the
reason for a failure cannot live behind hover — see above.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| ok / err / muted | The word, then the glyph shape, then the color. | The color alone (SC 1.4.1). |
| compact | The word is clipped, not removed. | `display: none`, which takes it out of the tree. |

Under `forced-colors: active` both accents become the same `CanvasText`, so the tick and the cross
are told apart by their shape and by the word. Nothing puts the color difference back, because
nothing can.

### When the column gets narrow

Dropping the word at narrow widths is reasonable — a phone has no room for a status column. Doing it
with `display: none` removes the word from the accessibility tree along with its box, and the mobile
layout has no status in it at all. `--compact` clips it instead: same tick on screen, same word
underneath.

Example 5 has both, with a checkbox standing in for the media query so the difference can be watched
without resizing the window.

## Screen reader behavior

Expected: example 1's rows read as *"Order 462 · Standing desk, Shipped"* in document order.
Example 3's specimen reads *"Failed — card ending 4462 was declined"*. Example 4's specimen announces
one sentence per press; the list beside it announces one sentence per changed row.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## Everything here comes from the size

[Alert](../notice/) owns the argument that the word carries the tone and the icon does not, and the
argument about which element carries the live role. Both are true here and neither is repeated. What
this component adds is what happens to those answers when the whole thing is one word wide:

- An alert has room for `Error:` in front of the sentence. A label has room for the word and nothing
  else, so the word has to be the one that already means something — `Failed`, not `No`.
- An alert is a block you can put a `role="status"` on. A label is inline in a row, and there are
  twenty rows.
- An alert can hold a link to the details. A label has nowhere to put them and no focus to hang them
  off.

### One region, not one per row

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

## API

```js
const s = AC.createStatusText(container);

s.set(el, 'ok', 'Shipped');   // tone and word together, so they cannot drift
s.refresh();                  // re-run this page's readouts
s.destroy();
```

Idempotent: calling it twice on the same element returns the existing instance. `set` is also on `AC`
directly as `AC.setStatus(el, tone, word)`, and it is the only part worth lifting — everything else in
`component.js` is this page checking its own claims.

Setting the tone and the word in one call is the point of the signature: a codebase that sets the
class in one place and the text in another eventually ships a green `Failed`.

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

Render the tone and the word from one value, not two props. `<Status tone="ok" word="Failed" />` is
a call that type-checks and lies.

## Common mistakes

- **A colored dot with no word.** It announces an empty string. Example 2.
- **`content: "✓"` as the non-color cue.** It lands in the text, and it is not a word. Example 2.
- **An emoji as the glyph.** Its name is chosen by Unicode, is in English, and does not translate.
  Example 2.
- **`role="status"` on the label.** Twenty rows is twenty announcements. Example 4.
- **The reason in a `title`.** No keyboard, no touch, and usually not announced either. Example 3.
- **`display: none` on the word at a breakpoint.** Clip it instead. Example 5.
- **A status word that only means something next to the color.** `Yes` / `No` is not a status;
  `Shipped` / `Failed` is.

## Related

- [Alert](../notice/) — the same tone argument with room to make it, and where the live-role recipe
  lives.
- [Badge](../badge/) — a count rather than a word, with the same problem about what the digits alone
  announce.
- [Live Region](../live-region/) — the clear-then-write recipe example 4's list uses.
