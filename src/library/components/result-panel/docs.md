## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

The panel announces. Nothing inside it does.

| Piece | What it is | What it does |
| --- | --- | --- |
| `.ac-result` | the panel | It owns the one live region inside it. |
| `.ac-result__value` | the value, monospace, wrapping | A `<code>`, deliberately not an `<output>`. |
| `.ac-result__status` | `role="status"`, in the markup, empty | The only thing on the panel that talks. |
| the verdict | a [Status Label](../status-text/) with no live role | — |
| the count | a [Badge](../badge/) with no live role | — |
| the reason | an [Alert](../notice/) with no live role | — |
| the copy button | its name never changes | [Input Group](../input-group/)'s button, lifted. |

The class prefix is `.ac-result` and the factory is `AC.createResultPanel`. Both keep their
spelling — this component's display name changed, its slug did not.

### The copy button

Lifted from [Input Group](../input-group/) unchanged, with its rules intact:

- **The name never changes.** A button that renames itself to *Copied* renames the control under the
  reader's finger, and the state is then carried by the same word that identifies it.
- **The confirmation goes to the region.** A tick beside the button is `aria-hidden` and correct; the
  failure is that it is the only cue there is.
- **The region already exists and is empty.** A `role="status"` inserted along with its text gives a
  screen reader nothing to notice changing.

Example 4 has all three live, with each button's name after the press printed underneath.

The name says which value — `aria-label="Copy share link"` on a button reading `Copy`. The visible
word is contained in the accessible name (SC 2.5.3), and a screen with three of these needs the
difference.

## Keyboard

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> | Reaches the copy button. Nothing else in the panel is focusable. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Copies from the focused button, and announces the outcome. |

**Keys deliberately not bound.** All of them. Neither key above is this component's: a native
`<button>` supplies both, and the value is a `<code>` rather than a control.

A soft-disabled button is still reachable and still fires a click, so `component.js` calls
`preventDefault()`. That covers <kbd>Enter</kbd> and <kbd>Space</kbd> at once, because a native
button dispatches a click for both.

The value is selectable text, so a person who does not want the button can still take it by hand.

## States

| State | Signaled by | Not by |
| --- | --- | --- |
| ready | the verdict word, then its accent | never the accent alone |
| a count | the badge's clipped words | never the digits alone |
| a caveat | the notice's prefix word | never the tint |
| copied | the sentence in the region | never a renamed button, never a tick alone |
| nothing yet | real text in the value slot, `aria-disabled` on the button | never an empty box |

Under `forced-colors: active` the notice tint, the badge fill and all three accents collapse into
`Canvas` and `CanvasText`. Nothing puts the difference back, because nothing can and the words never
depended on it. The copy button is rebuilt from `ButtonFace` / `ButtonText`, and the unavailable one
from `GrayText` plus a dashed border, because a control has to keep reading as a control.

### The empty panel

Before anything has been built there is a label, a button and nothing between them — and *nothing*
is what a screen reader reads. Put the reason in the value slot as real text and point the button's
`aria-describedby` at it:

```html
<code class="ac-result__value ac-result__value--empty" id="why">Nothing built yet. …</code>
<button aria-disabled="true" aria-describedby="why" aria-label="Copy share link">Copy</button>
```

`aria-disabled` rather than `disabled`, for [Button](../button/)'s reason: the control keeps its
place in the tab order, so the reason is reachable by the person it is for.

**Pressing it announces nothing, deliberately.** The reason is a *description* — it is read on
arrival, with the button. A live region reports what changed, and refusing to act is not a change,
so announcing the reason on the press says the same sentence twice. Example 5 prints what the button
reads as, which is the whole argument.

## Screen reader behavior

Expected: example 1's panel reads as *"Share link, 3 parameters, Ready"*, then the URL, then
*"Copy share link, button"*, then the warning. Pressing the button announces one sentence and changes
nothing else.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## What this component owns

A copyable result is other components in a box, and it is the first place in this library where three
of them meet. Each one documents when it should carry a live role, and each answer is right on its
own:

- [Alert](../notice/) — a message that appears in response to an action goes into a region that was
  already there.
- [Status Label](../status-text/) — one region for the list, never one per label.
- [Badge](../badge/) — the region belongs to the area the badge describes.

Follow all three inside one panel and one button press produces four announcements. So the panel
overrules them: **it has one `role="status"` at the bottom, and every part above it is inert.**
Example 3 has that panel beside one where all four parts speak, and counts what a screen reader was
handed by each.

The fourth voice is the one nobody wrote:

```html
<!-- <output> has an implicit role of status. This announces the whole URL. -->
<output class="ac-result__value">https://…</output>
```

`<output>` is a live region by default, so a result panel built with the element that sounds most
correct reads its entire value out loud on every change — a hundred characters of signed URL, every
time a field above it is touched. Use a `<code>`.

It is also why an audit that greps for `role=` and `aria-live` finds three regions on that panel
rather than four. The mock screen reader in `component.js` has `output` in its selector for exactly
that reason.

## The value has to be able to break

A URL is one long word as far as line breaking is concerned, and a signed token in the middle of it
is one long word with no break opportunities at all. The panel then refuses to be narrower than the
token, which makes the *page* refuse, which is SC 1.4.10.

```css
.ac-result__value {
  overflow-wrap: anywhere;
}
```

The declaration people reach for is `overflow-wrap: break-word`, and it does not do this. It breaks
a word that has already overflowed — so the text wraps and it *looks* fixed — but it leaves the
box's min-content width alone, and min-content is what a flex or grid item's automatic minimum size
is made of. Example 2 has the two side by side: identical on screen, `479px` minimum against `32px`.

`word-break: break-all` also shrinks the minimum and is fine. It is more aggressive — it breaks
between any two characters even where there was room — so a short value stops reading as one word.
Prefer `anywhere`.

The value is **not** a scroll region. Wrapping is what makes that possible, and it is worth the
trouble: a scrollable box needs `tabindex="0"`, `role="region"` and a name, or it is a tab stop with
nothing to say.

## API

```js
const r = AC.createResultPanel(container);

AC.copyResult(button);                    // → Promise<string>, the message announced
AC.setResult(panel, {
  value: 'https://…',
  verdict: 'Ready', tone: 'ok',
  count: 3, subject: 'parameters',
  note: 't expires 24 hours after it is issued.', notePrefix: 'Warning:', noteTone: 'warn',
  say: 'Link built. 3 parameters, and one warning.',
});

r.destroy();
```

Idempotent: calling the factory twice on the same element returns the existing instance.
`copyResult` and `setResult` are the two pieces worth lifting — everything else in `component.js` is
this page checking its own claims.

`setResult` writes every part in one call and there is no way to set one alone. A panel showing a URL
under the word *Waiting*, or a count of `3` beside two parameters, is worse than either part being
missing. `say` is the only argument that is a whole sentence, and the only one that reaches a live
region.

`copyResult` falls back to selecting the value and `document.execCommand('copy')` when the clipboard
API is unavailable or refused. The selection is left in place, because the message it announces tells
the reader to press Control C.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const r = AC.createResultPanel(ref.current);
  return () => r.destroy();
}, []);
```

The part that does not survive the port is the region's lifetime. `{copied && <p role="status">…</p>}`
mounts the region and its text together, and a region a screen reader was not already watching cannot
change. Render `.ac-result__status` unconditionally and let only its contents be conditional.

## Common mistakes

- **`<output>` for the value.** A live region nobody declared: the whole value is read out on every
  change.
- **A live role on the verdict, the count or the notice.** Each is defensible alone; together they
  are four interruptions for one press.
- **`overflow-wrap: break-word`.** It wraps the text and leaves the minimum width alone, so the panel
  looks fixed and the page still cannot reflow.
- **A copy button that renames itself.** The control under the reader's finger becomes a different
  control.
- **A tick as the only confirmation.** Correctly `aria-hidden`, and therefore silent.
- **A `role="status"` rendered with its message already inside it.** Nothing changed, so nothing is
  read.
- **An empty value slot.** A label, a button, and nothing in between.
- **A copy button over an empty value.** It reports a successful copy of nothing. Example 5.

## Related

- [Input Group](../input-group/) — where the copy button and its rules come from.
- [Alert](../notice/), [Status Label](../status-text/) and [Badge](../badge/) — the three components
  this one composes, each with its own answer about live roles that this panel overrules.
- [Rich Text Content](../prose-surface/) — the other place `overflow-wrap: anywhere` and min-content
  decide whether a page can reflow.
