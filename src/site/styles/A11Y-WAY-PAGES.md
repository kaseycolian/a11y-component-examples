# A11Y Way — page header & footer

This repo's site header, footer and brand assets come from the shared **theme-service** repo's
`assets/` — currently on version `1.1.0`. The files here are ports of those, not byte copies (see
Class naming below). Do not hardcode colors: everything consumes theme tokens (`var(--…)`).

## For agents working in this repo

This repo **already has the A11Y Way page furniture** (see History). Use the **`a11y-way-pages`
skill** (or the theme-service repo's `AGENTS.md`) for any header/footer/favicon work here — don't
improvise, and don't re-apply from scratch.

- Update to latest: "Update this repo's header and footer to the latest version."
- New page: nothing to do. `BaseLayout.astro` carries both, so every page gets them.

Theme work — colors, palettes, adding a theme — is a **different skill** (`theme-service`), and its
record is `src/site/theme/THEME-SERVICE.md`. This one never edits themes.

## Vendored files

| File | Purpose |
|------|---------|
| `site-header.css` | The sticky rail: brand lockup, components picker, motion toggle, theme console. Declares `--header-h`. |
| `site-footer.css` | The slab: the lede (lockup, mission, source) and the family index. |
| `../components/SiteHeader.astro` | The header's markup and its three scripts (picker, theme, motion). |
| `../components/SiteFooter.astro` | The footer's markup. No script. |
| `../../../public/brand/brand-mark.svg` + `brand-mark-theme.js` | The arch beside both wordmarks. Copied verbatim; recorded in `THEME-SERVICE.md` with the favicon pair. |

## Brand decisions on record

- **Brand name / tagline:** `The A11Y Way` · `WCAG 2.2 Components` — from `src/site/lib/site.mjs`
  (`SITE_NAME`, `SITE_BRAND_TAG`), never hardcoded into markup.
- **Brand mark:** the A11Y Way mark, as `<img>` + themer script. Not inlined — `file://` has to work.
- **Parts applied:** header + footer + favicon.
- **Page nav:** the source's two-stop `.pagenav` is **omitted**. This site has a real roster, so the
  header carries the components picker instead — its actual navigation, and the only navigation there
  is below 900px where the sidebar drops out. It wears the same console shell as the theme picker,
  keyed to `--accent-blue` rather than `--accent-purple`.
- **Footer family:** Accessible Component Library (this site, current) and Accessible Theming
  Service (`https://kaseycolian.github.io/theme-service/`). The names and the two descriptions
  mirror theme-service's own footer, so the pair reads identically from either site —
  `tests/site-footer.spec.mjs` asserts both names so one cannot move without the other. The
  outbound link opens in a new tab, with the SC 3.2.5 warning as clipped text; it is the only
  `target="_blank"` on the site. Source URL:
  `https://github.com/kaseycolian/a11y-component-examples`.
- **Brand zone:** nothing in it is ever hidden for space. The descriptor is the only thing that says
  which A11Y Way site you are on, so below 620px the lockup stacks instead of shedding it, and 320px
  only steps type and gutters down. The `.brand` link therefore carries no `aria-label` — its
  visible text is complete at every width, so it names itself (SC 2.5.3).
- **Existing furniture:** header restyled in place 2026-07-30; footer **replaced** 2026-07-31 at the
  user's request (what it replaced was a placeholder: a border rule and two paragraphs).
- **Class naming:** the source's own names, verbatim, so a future upstream diff maps 1:1 — `.hdr-inner`,
  `.brand-*`, `.ftr-*`. The one rename is the header's console (below).
- **Templating:** Astro. One component each, used from `src/site/layouts/BaseLayout.astro`. CSS is
  imported there in order: `site.css` → `site-header.css` → `site-footer.css`.

### Deliberate deviations

Recorded so a future update does not "fix" them.

1. **`.theme-console` / `.tc-*` became `.console` / `.console--theme` / `.console--nav` /
   `.console__cap`.** There are two pickers in this header, not one, so the console had to become a
   shared shell with a `--console-accent` modifier. The upstream single-use names would have been a
   lie on the components picker. Upstream's lamp row was ported too, as `.console__lamps`, and has
   since been removed outright — see deviation 18.
2. **`.theme-console .dropdown-*` became `.console .ac-dropdown__*`.** The picker is this library's
   own Custom Select, not theme-service's `dropdown.js` — `theme-select.js` is deliberately not vendored
   (see `THEME-SERVICE.md`). The rules are the same rules; only the class names differ. Since the
   Custom Select became authored markup the picker is written out in `SiteHeader.astro` rather than grown
   from a `<select>`, so what these rules style is in the template beside them.
3. **The rail is `90rem`, not the source's `1600px`,** in both `.hdr-inner` and `.ftr-inner`. This
   site has a sidebar and a content column between them, and all three should share an edge.
4. **`.brand-dot` uses `--accent-pink-text`, not raw `--accent-pink`.** CLAUDE.md's rule: an accent
   used as *text* is mixed toward `--text`, because the raw accents land at 2.7–4.2:1 on a light
   theme surface. Upstream is a dark-only page at that spot and does not need it.
5. **`img.ftr-mark`, not `.ftr-mark`.** Upstream leans on stylesheet order to beat `.brand-mark`'s
   `26px`; this repo's header file states it does not rely on order, so the element selector carries
   the specificity instead.
6. **`text-shadow: none` on `.ftr-link:hover` and `.ftr-src:hover`.** `site.css` lights every
   `a:hover` with a glow. The footer's hover signature is the rule and the underline, and a glow on
   12.5px text over glass costs more legibility than it buys.
7. **The header carries `--header-h`, `--console-h`, `.hdr-note` and the `.switch` rules,** none of
   which are upstream. The first two exist because anchors have to clear a sticky header here
   (SC 2.4.11); `.switch` exists because `components.css` is deliberately not vendored. A `.console__go`
   button lived here too, for the case where the Custom Select script never landed and a native `<select>`
   would have navigated on every arrow key. Both it and the fallback `.console select` rules went when
   the Custom Select became authored markup: there is no `<select>` in the header any more, so there is
   nothing to fall back to.
8. **An extra header breakpoint at 900px.** It tracks where this site's sidebar disappears, which the
   source has no equivalent of. (The 760px one is gone: it existed only to hide the brand descriptor,
   and v1.1.0 reversed that policy — see History.)
9. **No flex-wrap machinery in the ≤620px header.** Upstream wraps `.hdr-inner` with a zero-height
   `::before` forced break, because it has no breakpoint layout and its nav is two pills whose
   collision width depends on the rendered font. This repo already splits the four zones into two
   rows deterministically at 1080px with a grid, so there is nothing for the wrap to discover.
   Upstream's `.seg-label` / `.seg-tail` rules go with it — there is no segmented nav here.
10. **`--header-h` is retuned per version, not copied.** Upstream has no such token. The values are
    measured against the real header at every breakpoint and both sides of each row-count switch —
    1440 / 1201 / 1200 / 1000 / 801 / 800 / 621 / 620 / 561 / 560 / 430 / 375 / 320 — and rounded up
    to the next 0.125rem; `tests/site-header.spec.mjs` asserts they still cover it, within 2px. Note
    the step at 800px: nothing re-flows there, but the rail's vertical gutter is a clamp, so a
    two-row header keeps shrinking across the band and one value for all of it over-reserves ~17px of
    scroll-margin at the bottom of it.
11. **No `min-width` on the components picker.** A floor was tried and taken back out: it competes
    against the brand's min-content, which follows the *rendered* font (`--font-ui` falls back to
    Verdana, which is wider), and it overflowed a 320px rail. As written the layout cannot overflow
    at any font, and the spec asserts that at seventeen widths. Read the note in the CSS's 430px
    block before adding one. The ~102px trigger this used to cost at 320px is gone — deviation 15
    fixed it with a row of its own rather than with a width promise the font can break.
12. **The reduced-motion note has its own breakpoint at 380px,** separate from the brand ladder's
    430px and the three-row switch at 560px, because all three measure different things — where the
    lockup's type steps, where the header needs a third row, and where that sentence wraps to another
    line. Re-measure it if the note's wording changes.
13. **The zones are in a different order from upstream, and the order reaches into the markup.**
    `SiteHeader.astro` emits **brand, motion, theme, components** — the picker last, where upstream's
    equivalent is second. It is not a CSS-only reflow because it cannot be: the picker sits at the
    right-hand end of the rail and stacks under the theme console, and visual order has to equal DOM
    order or tab order stops matching reading order (SC 2.4.3).

    **What it costs:** this site's navigation is the last stop in the header rather than the first. A
    keyboard user reaches the brand, the motion toggle and the theme picker before it. The skip link
    ahead of all of it is what keeps that from mattering to someone going straight for the content.
    Judged worth it because the picker's *visual* prominence — right-hand end, widest control, full
    rail below 1200px — is what most visitors navigate by.

    A future upstream re-sync will want to undo this. It should not.
14. **Motion and theme are one pair and are adjacent at every width, without exception.** They are
    the same kind of thing — a preference about how the page behaves — and the picker is not. What
    says so is spacing alone: `.hdr-inner`'s gap is the *tight* intra-pair value (10px, against
    upstream's uniform 18px) and every other join is opened wider — `auto` before `.motion`, which
    also pins the cluster to the rail's right edge, and 26px before the picker. No wrapper element and
    no bordered box: the skill's "structure with rules and space" rule, and a box would need its own
    hover, focus and forced-colors treatment for no gain.

    An earlier pass drew a 1px hairline in the wider channel. It went when the picker moved right —
    a vertical rule immediately beside a bordered console is noise, not structure.

    `tests/site-header.spec.mjs` asserts the adjacency directly, as geometry, at seventeen widths:
    same row, theme after motion, and nothing sharing their row in the channel between them.
15. **Three layouts, and the picker only ever moves down and right.**

    | Band | Rows |
    | --- | --- |
    | ≥1200px | one — `brand · · · · motion theme picker` |
    | 560–1200px | two — `brand \| motion theme` / `picker`, spanning the pair's columns |
    | <560px | three — `brand` / `motion theme` / `picker` (full rail) |

    The two-row grid is `1fr auto auto` — **three** columns where upstream has two, and that is the
    reason it is a grid at all: motion and theme have to share row 1 while the picker sits under both
    of them, which two columns cannot do without a wrapper element. The picker takes
    `grid-column: 2 / -1`, so its width is exactly motion + gap + theme and its edges line up with
    theirs on both sides — the three controls read as one right-hand block over two lines. A
    rail-wide trigger under a short pair read as two unrelated things instead. It only goes full-rail
    below 560px, where the block *is* the rail. The three-row grid drops back to `auto 1fr`: with the
    brand and the picker both spanning, the only row needing columns is the pair's.

    Above 1200px the picker does not grow — a 600px trigger is no more usable than a 320px one, so
    the slack goes into the channel after the brand. `.console--theme` is `19rem` (`17rem` in the
    two-row band, where the brand is on the same row), under the picker's `20rem` but no longer by
    enough for size alone to carry the hierarchy — `--console-type` does, 13.5px against 12.5px. It
    is sized for the **panel**, which is the part that has to be read: the panel takes its width from
    the trigger's rect, so the trigger is the only lever there is on it. The longest names still
    ellipsize on the closed trigger, which is recoverable because `.ac-dropdown__primary` wraps
    rather than truncates in the open list.

    One supporting rule, sized by measurement:

    - **The lockup stacks from 800px, not 620px.** A fit decision, not a legibility one: the brand
      now shares row 1 with the whole preference pair, and one line of it (~360px) left the theme
      console nothing between 620 and 800. Stacked it is ~207px. The wordmark/tag *type* ladder stays
      keyed to 620px and 430px — those steps measure legibility, per deviation 12's argument.

    A second one, hiding `.console__lamps` below 430px, is gone with the lamps themselves (18).
16. **The motion toggle's label is never clipped, at any width.** It used to be, below 560px.
    `.switch__text` is part of the toggle's accessible name, so clipping was the only way to hide it
    at all — and a bare 44×24 track beside an unlabelled console is a guess rather than a control. It
    takes the console cap's voice (mono, 10px, uppercase, tracked) so the header has one treatment
    for a small label naming a control rather than two, which also makes it the widest fixed thing on
    the phone layout's second row; the tracking is eased right back from the cap's `0.16em` for that
    reason. This is what sets the three-row breakpoint at 560px, and the spec asserts the label has
    real width at every one of them.

    Beside it, `--console-type` (12.5px, 13.5px on the picker) carries the trigger size as a property
    rather than a declaration, so `.console--nav` steps it up without a second `font-size` rule whose
    effect would depend on source order.
17. **`@media (forced-colors: active)` was never being applied above 430px.** The 430px block was
    missing its closing brace, so every rule after it — the note's own breakpoint and the whole High
    Contrast block — parsed as nested inside it. Fixed while restyling; the HCM treatment for the
    panel's swatch dots, the console borders and the switch now applies at every width, as it always
    read as doing.
18. **Upstream's lamp row is gone, at every width.** Four `--accent-*` dots sat between the theme
    console's cap and its trigger, a live palette readout that re-colored itself on a theme change
    with no JS. Removed 2026-08-01 for two reasons, and the second is the one that generalizes: it
    cost ~69px inside a `15rem` console, which is what pushed "Midnight Arcade" down to
    "Midnight…" on the closed trigger; and this site is a components library, so its own theme
    picker should not be the most decorated control in the header. The reclaimed width went to the
    trigger rather than back to the row, since `.console .ac-dropdown` is `flex: 1 1 auto`.

    The readout survives where the choice is actually made: the swatch dots on each option in the
    open panel, which keep the lamps' circular notation (deviation 1's port is the only thing that
    left). A re-sync will offer the lamps back. It should decline.
19. **The theme options are grouped by family, and each option's label carries its mode** — "Rink
    Classic · Dark" under a "Rink Classic" group. This is upstream's own arrangement, separator
    included, arrived at from the other direction: the port had grouped by mode, which put the two
    halves of one palette at opposite ends of a 17-item list. Recorded because the labels are built
    in `src/site/lib/themes.mjs` rather than by upstream's `theme-select.js` (deviation 2), so
    nothing keeps the two in step automatically — if upstream restyles its option text, this is the
    file to change. **Auto** stays in a "System" group of its own: it belongs to no family, and it
    is the one option with no mode to name, which is the point of it.

## History

<!-- Append one entry per apply/update. Most recent last. Never edit past entries. -->

- `2026-07-30` — Header ported from theme-service `assets/site-header.css` so the two apps read as
  one brand, replacing the shell's original header. Recorded at the time in `THEME-SERVICE.md`; this
  log did not exist yet.
- `2026-07-31` — Footer replaced at v`1.0.0` with the shared one (`assets/site-footer.css` +
  `docs/overview.html`'s markup), closing a cross-link that until now ran one way: theme-service's
  footer already pointed here. Header re-checked against the same version and left untouched — every
  upstream change since the port was already in it, and the four brand assets are byte-identical.
  `.site-footer__inner` and its rules in `site.css` retired.
- `2026-07-31` — Updated to v`1.1.0` ("header and footer keep site identity on small screens"), plus
  the type step that followed it upstream. Header: the rail's vertical gutter became a clamp
  (`13px → 22px`), the lockup gained a 17/16/15px ladder with the tag at 13.5/13/12, and the brand
  descriptor now survives to 320px by stacking below 620px — which retires the 760px hide block, the
  400px `.brand-name { display: none }` and the `.brand` `aria-label`. `--header-h` re-measured at
  every breakpoint. Footer: rail padding and gaps tightened, `.ftr-wordmark` tracked the header to
  17px, the lede lies down as a band between 621px and 1080px, and the two products took
  theme-service's own names and descriptions. The Themes link now opens in a new tab with a clipped
  "opens in a new tab" (`.ftr-newtab`) carrying the SC 3.2.5 warning — the site's only `_blank`, and
  a user decision on this update, not an upstream default. Brand assets byte-identical, untouched.
  The one thing the port could not take verbatim is a width floor for the components console — see
  deviation 11; `tests/site-header.spec.mjs` grew an overflow sweep to hold that line, and its
  `nav.width > 500` assertion became "starts after the brand, ends at the rail", which is the
  invariant that pixel number was standing in for.
- `2026-08-01` — Header controls re-arranged for this repo at v`1.1.0`; no re-sync. The port had left
  the four zones as peers in upstream's order, which showed up two ways: the brand was painted
  underneath the components picker between ~1081px and ~1400px (`.brand` was allowed to shrink and
  nothing in the lockup can reflow), and the *secondary* control reserved more width than the
  *primary* one — theme 26rem against components 21rem — with the picker sitting between motion and
  theme and splitting them.

  The picker now sits at the right-hand end of the rail and stacks under the theme console, which
  moved it last in `SiteHeader.astro`'s DOM (deviation 13 — the one thing here that is not CSS, and
  the one a re-sync will want to undo). Motion and theme are one pair, adjacent at every width, held
  together by spacing alone (14). Three layouts at 1200px and 560px, with the picker spanning the
  pair's own columns in the middle band rather than the whole rail, the lockup stacking from 800px
  and the lamps dropping below 430px (15). The motion label is never clipped, which is what sets the
  560px boundary (16). `--header-h` re-measured at every breakpoint, plus a new step at 800px for the
  clamped gutter.

  `tests/site-header.spec.mjs` grew the assertions that would have caught the original bug and that
  pin the new arrangement: the brand is never overrun, the pair is never split, the picker is the
  widest control, and each of the three layouts holds — all as geometry rather than pixel thresholds,
  since the brand's width follows the rendered font. The overflow sweep now covers all seventeen
  widths including the one-row band, where the failure actually lived. Found and fixed in passing:
  the 430px media block was missing its closing brace, so the entire forced-colors block had been
  scoped to phones (17).
- `2026-08-01` — The theme console's lamp row removed at every width; no re-sync. A user decision, on
  the grounds that the header's job is to get out of the way of the components (18). The ~69px went
  to the trigger, which now shows a theme name instead of the first word of one, and the entry above
  hiding the lamps below 430px is moot. The panel's swatch dots — same circles, same order — are the
  header's only palette readout now, so the spec's lamp test became one asserting the dots are
  painted in the panel and absent from the trigger.

  Two follow-ons in the same pass, both from the same user. The console went `15rem → 19rem`
  (`17rem` in the two-row band), sized against the open panel rather than the trigger since the panel
  can only be widened through it (15); measured at every breakpoint against the brand-overrun sweep,
  which is what the two numbers differ for. And the options are grouped by family with the mode in
  the label, matching upstream (19) — which is also what made the extra width worth spending, the
  labels being longer than the ones the old `15rem` was cut for.
