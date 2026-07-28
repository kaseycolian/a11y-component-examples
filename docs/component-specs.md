# Component specs

**The ARIA contract and keyboard map for every remaining component, decided up front.**

The point of this file is that a session building a component does not need to re-derive its
pattern, re-read the theme-service gallery, or go looking through the APG. Read the entry, build to
it. If you disagree with a decision here, change it here first so the next session sees the same
thing.

Source of the roster: theme-service `discovery/draft-3/index.html`.
Conventions: `CLAUDE.md`. Progress: `BUILD-STATUS.md`.

**Shorthand used below**

- *Native* means "use the real HTML element, add nothing" — the correct answer more often than not.
- *Gotcha* is the specific thing that is usually got wrong. Do not skip these.

---

## foundations

### skip-link
- **Markup** `<a class="ac-skip-link" href="#main">Skip to main content</a>` as the first focusable element in `<body>`. Target is `.ac-skip-main` with `tabindex="-1"`. Variants: `--visible` (never hides) and a `.ac-skip-list` for two or three destinations.
- **ARIA** None. A link is a link.
- **CSS** Clipped until `:focus` — **`:focus`, not `:focus-visible`**, because a programmatic focus may not match the latter and a focused-but-invisible skip link fails silently. Then pinned top-left, `z-index` above your sticky header, and a real ≥44px target. No border in the clipped state: `box-sizing: border-box` cannot shrink a box below its own borders, so a 2px border makes the "1px" box 4px.
- **Keep the ring on the target.** It is the only confirmation a sighted keyboard user gets that the jump landed, and this is the exact place `outline: none` gets added.
- **Gotcha** The target needs `tabindex="-1"`, or focus does not actually move — the page scrolls but the next Tab resumes from the top. Do not use `display: none` to hide the link; that makes it unfocusable, and it is the most common broken skip link there is. Also needs `white-space: nowrap` (text wrapping inside a 1px box gets read a letter at a time) and `scroll-margin-top` on the target (SC 2.4.11). Nothing focusable may precede it — cookie banners in particular.
- **Always-visible is a legitimate choice**, not a fallback: it removes every failure mode this component has and costs one line of chrome.

### visually-hidden
- **Markup** `<span class="ac-visually-hidden">` utility class, plus a `.ac-visually-hidden--focusable` variant. **CSS-only.**
- **CSS** `position:absolute; box-sizing:border-box; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; border:0; clip-path:inset(50%); white-space:nowrap;` — nine declarations, all load-bearing. `1px` not `0` (a zero-size box can drop out of the accessibility tree); `margin:-1px` so a line of text does not gain a pixel; `padding`/`border` at 0 because `border-box` cannot shrink a box below its own borders.
- **`--focusable` uses `:focus-within`**, not `:focus` — the focusable thing is usually inside the wrapper, and `:focus-within` matches both. (`skip-link` deliberately uses plain `:focus`; the reason is in its entry.)
- **Canonical home for the technique.** `skip-link`, `switch`, `textarea` and `tooltip` each carry a local copy on purpose — a paste into a bare app must not need a second file. A change here is a change in all five.
- **Gotcha** `white-space: nowrap` matters — without it text wraps inside the 1px box and some screen readers read it letter by letter. Never `display:none`, `visibility:hidden` or the `hidden` attribute; all three take it out of the accessibility tree. `visibility:hidden` additionally **keeps its layout box**, so an icon button labeled that way is visibly stretched by a label nobody can read.
- **`aria-label` is a different tool**, not a shorter spelling: it needs a role that supports naming (ignored on a bare `<span>`), it replaces the whole name (SC 2.5.3 Label in Name), and it is an attribute, so translation tools and find-in-page never see it.
- **Testing gotcha** `innerText` **includes** clipped text — it only drops `display:none` and `visibility:hidden`. Use geometry for "off screen" and `toHaveAccessibleName` for "still announced".

### focus-ring
- **Docs component.** Demonstrates `:focus-visible` vs `:focus`, offset, and the two-tone ring that survives any background. **CSS-only.**
- **Shipped contract** `.ac-focus-ring` (`3px solid` accent on `:focus-visible`, `outline-offset: 2px`, no transition) plus four modifiers that are each **complete on their own** — `--always` (`:focus`), `--flush` (offset 0), `--inset` (offset `-3px`), `--two-tone`.
- **The two tones are the theme's own `--text` and `--bg`**, because that is the one pair a theme already guarantees contrast between. Added `--ac-focus-inner` / `--ac-focus-outer` to `tokens.css`.
- **Gotcha** Never `outline: none` without an equal-or-better replacement. Show the failure alongside the fix so the page teaches rather than asserts. No `border-radius` in a focus rule — an outline already follows the element's own, and `inherit` takes the *parent's*.
- **Gotcha** `outline-offset` is positive by default, so an `overflow: hidden` ancestor clips the ring with no error and nothing to see. And a sticky bar only obscures the focused element when focus moves **backwards** (SC 2.4.11): moving forward aligns the element's bottom edge, not its top.

### live-region
- **Markup** `<p class="ac-lr-clipped" role="status">`, rendered empty beside the thing it describes, plus a `role="alert"` sibling. Prefer the **role** over bare `aria-live`: it carries `aria-atomic="true"` and gives the element a name in the tree. `role="log"` is the append-only third one, and deliberately has no `aria-atomic`.
- **Shipped contract** `AC.speak(el, text)` — clear, wait **two** frames, write — and `AC.createAnnouncer({ root, clearMs })` → `{ announce(text, { assertive }), element, assertiveElement, destroy() }`. Idempotent per root, regions minted at construction, message cleared after 7s.
- **The only component with no `create<Name>(root)`** — its product is a message, not an element.
- **Gotcha** The region must be **in the accessibility tree before** the text is inserted. Three ways to break that, all live in example 3: injected already populated, `display: none`, and cleared-then-set in the same tick. All three leave the right text in the DOM, so axe and the element inspector both say the page is fine.
- **Gotcha** Two `requestAnimationFrame`s, not one — rAF runs *before* paint, so a single one can still batch the clear and the write into one reported state.
- **Gotcha** `textContent = <same string>` **does** mutate the DOM (old text node out, new one in), so a MutationObserver cannot tell the working case from the silent one. The thing to assert is that the region is *observed empty* in between.
- Reserve `assertive` for messages that stop being useful in a few seconds — not for messages that are merely important.

### typography
- **Markup** `.ac-t-h1`–`.ac-t-h4`, `.ac-t-body`, `.ac-t-muted`, `.ac-t-mono`, `.ac-t-link`.
- **Gotcha** These are *visual* classes and carry no semantics — say so loudly. An `<h2>` styled `.ac-t-h4` is fine; a `<div class="ac-t-h1">` is not a heading. Muted text still needs 4.5:1.

### motion-preferences
- **Markup** A switch bound to `data-motion` on `<html>`, plus a demo animation that visibly stops.
- **Gotcha** This is the component that explains the asymmetry: the toggle can only *add* the restriction, never override an OS `prefers-reduced-motion`. Show the token chain (`--ac-motion` → `--motion` → 1) and the cascade order that makes the OS win.

### effects
- **Markup** Demonstrates `fx-grid`, `fx-scroll`, `fx-bar-top`, `fx-bar-bottom`, `fx-pulse` from the vendored `effects.css`.
- **Gotcha** `fx-grid` renders on a `::before` at `z-index:-1`, so its host needs `isolation: isolate`. `fx-pulse` must be motion-gated. These are theme decoration, not library components — label the page accordingly.

---

## buttons-actions

### button
- **Markup** Native `<button type="button">` with `.ac-btn` plus `--solid` / `--outline` / `--ghost` and accent modifiers `--pink` / `--green` / `--blue` / `--purple`.
- **ARIA** None. Native.
- **States** hover, `:active` (press transform, motion-gated), `:focus-visible`, `:disabled`.
- **Gotcha** Always set `type` — a bare `<button>` in a form defaults to `submit`. Disabled buttons are unfocusable and announce nothing; when the user needs to know *why*, use `aria-disabled="true"` and block the handler instead.

### icon-button
- **Markup** `<button class="ac-btn-icon" aria-label="Settings">` with an `aria-hidden focusable="false"` SVG.
- **Gotcha** The accessible name is the *only* name — with no `aria-label` it announces as "button". Minimum 24×24 target (SC 2.5.8), 44px preferred. `focusable="false"` on the SVG matters for IE-era Edge and some AT.

### loading-button
- **Markup** Button with `aria-busy="true"` while pending; spinner is `aria-hidden`; a polite live region announces "Saving…" then "Saved".
- **Gotcha** A spinner alone is silent to a screen reader. Do not use `disabled` while loading — focus is lost, and the user cannot hear the state. Keep the accessible name stable so it is not re-announced as a new control; put the status in the live region.

### chip-toggle
- **Markup** `<button class="ac-chip" aria-pressed="false">`.
- **ARIA** `aria-pressed` — a *toggle button*, not a checkbox.
- **Gotcha** Pressed state needs a non-color cue (fill + border, or a tick). Do not swap the label text on toggle; `aria-pressed` already conveys it, and changing both makes AT announce a contradiction.

---

## forms-inputs

### field  ← build this first, the rest reuse it
- **Markup** `.ac-field` wrapping `<label for>`, the control, `.ac-field__hint` (id), `.ac-field__error` (id, `role="alert"`).
- **ARIA** Control gets `aria-describedby="<hint id> <error id>"` and `aria-invalid="true"` when errored.
- **Gotcha** `aria-describedby` takes a **space-separated list** — appending an error must not clobber the hint. Error text must say what to do, not just that something is wrong. Never use `placeholder` as the label. This is the canonical home for the `.ac-field` classes the dropdown currently inlines.

### text-input
- **Markup** Native `<input type="text">` with `.ac-input`, wrapped in `.ac-field`.
- **Gotcha** Use the right `type` and `autocomplete` — `autocomplete="email"` etc. is SC 1.3.5, and it is the single most-skipped criterion in this group.

### input-group
- **Markup** `.ac-input-group` containing an `.ac-input` and a trailing `.ac-btn-icon`.
- **Gotcha** The addon button needs its own accessible name and must not overlap the text at 200% zoom. Keep it a real sibling button, never an absolutely-positioned overlay that swallows clicks on the input.

### textarea
- **Markup** Native `<textarea class="ac-textarea">`.
- **Gotcha** `resize: vertical`, never `none` — removing resize is a 1.4.4 reflow problem. If you add a character counter, it goes in a polite live region, throttled, not announced per keystroke.

### native-select
- **Markup** Native `<select class="ac-select">` styled with `appearance: none` + a background caret.
- **Gotcha** Ship this alongside the custom Dropdown and say plainly that the native one is the better default on mobile — it gets the OS picker. The custom one is for when you need the styling.

### radio-group
- **Markup** `<fieldset>` + `<legend>`, native `<input type="radio">` sharing a `name`.
- **Keyboard** Native: arrows move *and select*, Tab enters/leaves the group as one stop.
- **Gotcha** Without a shared `name` they are not a group and arrow keys do nothing. `<legend>` is the group's accessible name — do not replace it with a floating `<div>`. Never use `role="radiogroup"` on a fieldset that already works.

### checkbox
- **Markup** Native `<input type="checkbox">` with a real `<label>`.
- **Gotcha** For indeterminate, set the `.indeterminate` **property** in JS — there is no attribute. Custom-styled boxes must keep the real input focusable (opacity 0, not `display:none`), or keyboard access disappears.

### switch
- **Markup** Native checkbox with a visual track/thumb that is `aria-hidden`. Existing implementation in `SiteHeader.astro` — promote it here.
- **Gotcha** `role="switch"` is an option but announces inconsistently in older JAWS; a plain checkbox with clear on/off labeling is safer. State must not be conveyed by track color alone — the thumb position is the second cue. On/off applies **immediately**; if it needs a Save button, use a checkbox instead.

### fieldset-group
- **Markup** `<fieldset class="ac-group">` + `<legend>` grouping related controls.
- **Gotcha** Fieldsets have stubborn default styling and cannot be a flex container in older Safari — wrap the contents in a `<div>`.

---

## overlays-disclosure

### drawer
- **What it is** A panel that slides in from an edge of the viewport and sits above the page. Carved out of `dropdown`, which used to become a bottom sheet under 640px — one component with two keyboard stories. This is that behavior as its own thing, on **desktop as well as mobile**.
- **Markup** `<div class="ac-drawer" popover>` holding `.ac-drawer__head` (title + close button) and `.ac-drawer__body`. Triggered by a real `<button aria-expanded aria-controls>`.
- **ARIA** `role="dialog"` + `aria-modal="true"` when it takes a backdrop, `aria-labelledby` pointing at the visible title. **Not** `role="listbox"` — the drawer is a container, and whatever goes inside it keeps its own semantics.
- **Keyboard** <kbd>Esc</kbd> closes. Focus moves to the first focusable element (or the close button) on open, is **trapped** while open, and returns to the trigger on close. `Tab` cycles within.
- **Edges** `data-ac-edge="bottom|right|left|top"`, default `bottom`. Slide transform is motion-gated, so with reduced motion it appears rather than slides.
- **Gotcha** The whole component is the focus-management story; get that wrong and it is worse than no drawer. Use `popover` + the top layer so no ancestor can clip it, but note `popover="auto"` light-dismiss fights a custom Escape handler — `dropdown` hit this and uses `manual`. Scroll-lock the body while open, but do it without a layout jump (`scrollbar-gutter`, not `overflow: hidden` alone). The close button needs a real accessible name, and a 44px target. A drawer with **no** visible close control is a trap on touch, where there is no Escape key.

### modal
- **What it is** A dialog centered in the viewport, over a dimmed page, that has to be dealt with before anything else. The `drawer` is the same modality anchored to an edge; this is the one people mean by "modal".
- **Markup** Native **`<dialog class="ac-modal">`** opened with `showModal()`. Holds `.ac-modal__head` (a real heading + close button), `.ac-modal__body`, `.ac-modal__foot` (the actions). Triggered by a real `<button>`.
- **Why native** `showModal()` gives the top layer (no ancestor can clip it and no `z-index` can beat it), `::backdrop`, inertness for everything behind it, <kbd>Esc</kbd>, and focus returned to the opener on close. A `<div role="dialog">` owes all of that by hand.
- **ARIA** `aria-labelledby` → the visible heading. **Add no `role="dialog"` and no `aria-modal`** — both are already implied, and `aria-modal` on a native dialog has made VoiceOver skip the content. The one legitimate override is `role="alertdialog"` for a destructive confirmation, which then **requires** `aria-describedby` pointing at the consequence.
- **Keyboard** <kbd>Esc</kbd> closes (the `cancel` event, so it can be intercepted for unsaved work — and then you owe the user another way out and a sentence saying so). <kbd>Tab</kbd> cycles inside, which the browser does. Focus lands on the **dialog itself** (`tabindex="-1"`) when the content is mostly text, so the name and description are read; on the first field when it is a form; on the **safe** button, never the destructive one, when it is a confirmation.
- **Gotcha** `showModal()` does **not** lock page scroll — do it as `drawer` does (`overflow: hidden` + `scrollbar-gutter: stable` on `:root`, never `overflow` alone, which jumps the layout sideways). `::backdrop` historically did not inherit custom properties from its dialog, so the third level of the token chain is what actually paints it in older browsers. The body needs `min-height: 0` or long content overflows and is clipped (`drawer` hit this). Closing tells a screen reader nothing: report the outcome in a `role="status"` that lives **outside** the dialog, or it is removed from the tree before it can speak. Backdrop-click dismissal is fine but must never be the only way out — and check the click target, or a drag that starts inside and ends on the backdrop closes the dialog. A modal with no visible close control is a trap on touch, where there is no Escape key.

### tooltip
- **Markup** `.ac-tooltip-host[data-ac-tooltip]` wrapping a real `<button>`/link and a `.ac-tooltip[role="tooltip"][hidden]`. The trigger points at the bubble with `aria-describedby` — or `aria-labelledby` instead when the trigger has no text of its own and the bubble *is* the name.
- **Behavior** Shows on **hover and focus**; hides on <kbd>Esc</kbd>; stays visible while the pointer moves onto it.
- **ARIA** `aria-describedby` stays on the trigger whether the bubble shows or not: a directly referenced element is folded into the description even while hidden, so the text is announced on focus without waiting for anything to appear. The bubble never gets `tabindex`.
- **Gotcha** SC 1.4.13 requires it be dismissible, hoverable, and persistent — hover-only tooltips fail all three. Dismissal has to be *remembered* until the pointer leaves or focus moves, or it reappears instantly under an unmoved pointer. `pointer-events: none` on the bubble is the usual hoverable failure. Filter `pointerType === 'touch'`, or a tap leaves a bubble stuck open. Open on focus only when `:focus-visible` matches. Tooltips must contain **no interactive content**. Never put essential information only in a tooltip; touch users often cannot summon one.
- **Also ships a toggletip** — the touch-reachable sibling. Click-opened, announced by inserting text into a `role="status"` that is already in the DOM and empty; **no `aria-expanded`, no `aria-describedby`**, because it is a message, not a region the button controls. Reach for it whenever the content is longer than a description or the audience is on a phone.

---

## navigation

### tabs
- **Markup** `role="tablist"` → `role="tab"` (`aria-selected`, `aria-controls`) → `role="tabpanel"` (`aria-labelledby`, `tabindex="0"`).
- **Keyboard** Roving tabindex: <kbd>←</kbd>/<kbd>→</kbd> move, <kbd>Home</kbd>/<kbd>End</kbd> jump, Tab leaves the list to the panel. **Automatic activation** (select on arrow) since panels are already in the DOM.
- **Gotcha** Only the selected tab is `tabindex="0"`; the rest are `-1`. The panel needs `tabindex="0"` so it is reachable. Draft-3's version is a stub with no panels — build the real thing. A working reference already exists in `src/site/components/CodePanel.astro`.

### jump-nav
- **Markup** `<nav aria-label="On this page">` with in-page anchors, `aria-current="location"` on the active one.
- **Gotcha** Targets need `scroll-margin-top` clearing any sticky header (SC 2.4.11) and `tabindex="-1"` so focus actually lands. If you highlight the active section on scroll, throttle it — a live region firing per scroll event is unusable.

---

## feedback-status

### notice
- **Markup** `.ac-notice` with `--info` / `--success` / `--warn` / `--error`, each with an `aria-hidden` icon **and** a text prefix.
- **ARIA** Static notices: none. Notices appearing in response to an action: `role="status"` (polite) or `role="alert"` (errors only).
- **Gotcha** Color alone fails 1.4.1 — the icon is decorative, so the *word* ("Error:") carries the meaning. Do not put `role="alert"` on notices present at page load; they fire on every render.

### badge
- **Markup** `<span class="ac-badge">`, plus a `--solid` variant.
- **Gotcha** A count badge needs context in its name — "3" alone is useless. Use `aria-label="3 unread messages"` on the container, or visually-hidden text.

### status-text
- **Markup** `.ac-status` with `--ok` / `--err` / `--muted`, tick/cross glyph plus a word.
- **Gotcha** If it changes at runtime, wrap in a polite live region. The glyph must be `aria-hidden` with real text beside it.

### result-panel
- **Markup** `.ac-result` with a label and a monospace value, plus a copy button.
- **Gotcha** The copy button confirms via a polite live region, not just a visual label swap. A long URL needs `word-break: break-all` or it forces horizontal page scroll at 320px (SC 1.4.10).

---

## data-display

### data-table
- **Markup** `<table>` with `<caption>`, `<thead>`, `scope="col"` / `scope="row"`.
- **Responsive** Wrap in `.ac-table-scroll { overflow-x: auto }` with `tabindex="0"` and `role="region"` + `aria-label` so the scroll area is keyboard reachable (SC 2.1.1).
- **Gotcha** Do not `display: block` the table on mobile — it destroys the row/column relationships screen readers depend on. Scroll it instead. `<caption>` is the table's accessible name; keep it even if visually hidden.

### prose-surface
- **Markup** `.ac-prose` scroll container, `tabindex="0"`, `role="region"`, `aria-label`.
- **Gotcha** Any scrollable region must be keyboard-scrollable. Styles for nested `h1`–`h3`, `p`, `a`, `pre`, `blockquote`, `hr` — and `pre` needs its own `overflow-x` so code does not widen the page.

---

## compositions

### app-url-maker
- Recreates draft-3's "URL Maker": header, two fields (one an input-group), a result panel, footer actions.
- **Purpose** Show the pieces composing. Reuse `field`, `text-input`, `input-group`, `button`, `result-panel`.
- **Gotcha** One `<h1>`-level landmark structure per frame; the composition must not introduce heading-level jumps.

### app-page-to-markdown
- Recreates draft-3's "Page → Markdown": `fx-bar-top` header, a radio group, a checkbox, a scrollable `fx-scroll` preview, `fx-bar-bottom` footer.
- **Gotcha** The preview is a scrollable region — `tabindex="0"` + label. This is the natural home for `prose-surface`.

---

## Definition of done

A component is not finished until **all** of these are true:

- [ ] `component.html`, `component.css`, `component.js` (omit `js` if genuinely static — record it in `meta.json` `files`)
- [ ] `meta.json` with a `group` that exists in `registry.mjs`
- [ ] **Numbered example sections in all three files**, matching order, each CSS/JS section naming the examples that need it, plus a copy map in every file header (see `CLAUDE.md` → Copyability, and `field` for the reference)
- [ ] Visible `<h3 class="ac-demo__title">` per example, so the demo and the HTML tab match by eye
- [ ] American English, and no sentence that restates one already there (`CLAUDE.md` → Writing style)
- [ ] `docs.md` covering: the framework caveat, ARIA contract, keyboard table, states, screen reader behavior, API, gotchas
- [ ] `tests/<slug>.spec.mjs` asserting the keyboard map and the ARIA contract, not just that it renders
- [ ] `npm run check:tokens` clean — every color in a `var()` fallback chain
- [ ] A `@media (forced-colors: active)` block
- [ ] Every transition gated through `var(--ac-motion, var(--motion, 1))`
- [ ] Interactive targets ≥24×24px
- [ ] Demo shows the awkward states too: disabled, empty, error, long text
- [ ] `npm run build` passes and the demo actually works in a browser
- [ ] Row updated in `BUILD-STATUS.md`
