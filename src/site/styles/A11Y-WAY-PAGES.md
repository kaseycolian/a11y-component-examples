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
   `.console__cap` / `.console__lamps`.** There are two pickers in this header, not one, so the
   console had to become a shared shell with a `--console-accent` modifier. The upstream single-use
   names would have been a lie on the components picker.
2. **`.theme-console .dropdown-*` became `.console .ac-dropdown__*`.** The picker is this library's
   own Dropdown, not theme-service's `dropdown.js` — `theme-select.js` is deliberately not vendored
   (see `THEME-SERVICE.md`). The rules are the same rules; only the class names differ.
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
7. **The header carries `--header-h`, `--console-h`, `.hdr-note`, `.console__go` and the `.switch`
   rules,** none of which are upstream. The first two exist because anchors have to clear a sticky
   header here (SC 2.4.11); `.switch` exists because `components.css` is deliberately not vendored.
8. **An extra header breakpoint at 900px.** It tracks where this site's sidebar disappears, which the
   source has no equivalent of. (The 760px one is gone: it existed only to hide the brand descriptor,
   and v1.1.0 reversed that policy — see History.)
9. **No flex-wrap machinery in the ≤620px header.** Upstream wraps `.hdr-inner` with a zero-height
   `::before` forced break, because it has no breakpoint layout and its nav is two pills whose
   collision width depends on the rendered font. This repo already splits the four zones into two
   rows deterministically at 1080px with a grid, so there is nothing for the wrap to discover.
   Upstream's `.seg-label` / `.seg-tail` rules go with it — there is no segmented nav here.
10. **`--header-h` is retuned per version, not copied.** Upstream has no such token. The values are
    measured against the real header at 1440 / 1080 / 900 / 760 / 620 / 430 / 375 / 320 and rounded
    up to the next 0.125rem; `tests/site-header.spec.mjs` asserts they still cover it.
11. **No `min-width` on the components console.** This site pays more for v1.1.0's "never hide the
    descriptor" policy than the source does — upstream's descriptor is one word, this one is
    "WCAG 2.2 Components" (~150px of tracked mono) sharing the rail with the only navigation left
    below 900px, so the console comes out ~102px at 320px. A floor was tried and taken back out: it
    competes against the brand's min-content, which follows the *rendered* font (`--font-ui` falls
    back to Verdana, which is wider), and it overflowed a 320px rail. As written the layout cannot
    overflow at any font, and the spec asserts that at six widths. Read the note in the CSS's 430px
    block before adding one.
12. **The reduced-motion note has its own breakpoint at 380px,** separate from the brand ladder's
    430px, because the two measure different things — where the lockup steps, and where that
    sentence wraps to a third line. Re-measure it if the note's wording changes.

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
