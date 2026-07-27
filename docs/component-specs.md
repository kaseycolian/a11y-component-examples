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
- **Markup** `<a class="ac-skip-link" href="#main">Skip to main content</a>` as the first focusable element in `<body>`.
- **ARIA** None. A link is a link.
- **CSS** Visually hidden until `:focus`, then pinned top-left. Must be *visible*, not just focusable.
- **Gotcha** The target needs `tabindex="-1"`, or focus does not actually move in Safari and Chrome — the page scrolls but the next Tab resumes from the top. Do not use `display: none` to hide it; that makes it unfocusable.

### visually-hidden
- **Markup** `<span class="ac-visually-hidden">` utility class, plus a `.ac-visually-hidden--focusable` variant.
- **CSS** `position:absolute; width:1px; height:1px; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap;`
- **Gotcha** `white-space: nowrap` matters — without it text wraps inside the 1px box and some screen readers read it letter by letter. Never use `display:none` or `visibility:hidden`; both remove it from the accessibility tree, defeating the purpose.

### focus-ring
- **Docs component.** Demonstrates `:focus-visible` vs `:focus`, offset, and the two-tone ring that survives any background.
- **Gotcha** Never `outline: none` without an equal-or-better replacement. Show the failure alongside the fix so the page teaches rather than asserts.

### live-region
- **Markup** `<div class="ac-visually-hidden" role="status" aria-live="polite">` and an `role="alert"` / `aria-live="assertive"` sibling.
- **JS** `AC.createAnnouncer()` → `{ announce(text, { assertive }), destroy() }`.
- **Gotcha** The region must be **in the DOM before** the text is inserted — injecting a populated live region announces nothing. Clearing then setting in the same tick also fails; use a frame gap. Reserve `assertive` for genuine interruptions.

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
- **Gotcha** `role="switch"` is an option but announces inconsistently in older JAWS; a plain checkbox with clear on/off labelling is safer. State must not be conveyed by track color alone — the thumb position is the second cue. On/off applies **immediately**; if it needs a Save button, use a checkbox instead.

### fieldset-group
- **Markup** `<fieldset class="ac-group">` + `<legend>` grouping related controls.
- **Gotcha** Fieldsets have stubborn default styling and cannot be a flex container in older Safari — wrap the contents in a `<div>`.

---

## overlays-disclosure

### tooltip
- **Markup** Trigger with `aria-describedby` pointing at a `role="tooltip"` element.
- **Behaviour** Shows on **hover and focus**; hides on <kbd>Esc</kbd>; stays visible while the pointer moves onto it.
- **Gotcha** SC 1.4.13 requires it be dismissible, hoverable, and persistent — hover-only tooltips fail all three. Tooltips must contain **no interactive content**. Never put essential information only in a tooltip; touch users often cannot summon one.

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
- **Gotcha** Colour alone fails 1.4.1 — the icon is decorative, so the *word* ("Error:") carries the meaning. Do not put `role="alert"` on notices present at page load; they fire on every render.

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
- [ ] `docs.md` covering: how it works, keyboard table, ARIA contract, states, API, framework use, gotchas
- [ ] `tests/<slug>.spec.mjs` asserting the keyboard map and the ARIA contract, not just that it renders
- [ ] `npm run check:tokens` clean — every color in a `var()` fallback chain
- [ ] A `@media (forced-colors: active)` block
- [ ] Every transition gated through `var(--ac-motion, var(--motion, 1))`
- [ ] Interactive targets ≥24×24px
- [ ] Demo shows the awkward states too: disabled, empty, error, long text
- [ ] `npm run build` passes and the demo actually works in a browser
- [ ] Row updated in `BUILD-STATUS.md`
