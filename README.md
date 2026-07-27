# Accessible Component Examples

A reference library of UI components that meet **WCAG 2.2 AA** as a floor, written in plain
HTML, CSS, and JavaScript so they can be copied into any codebase — React, Angular, Vue, Svelte,
or no framework at all.

**→ [Browse the library](https://kaseycolian.github.io/a11y-component-examples/)**

Accessible does not mean plain. Every component ships with the full neon theme set and a theme
picker, because a rich interface and complete assistive-technology support are not in tension.

## What this is

Each component is a folder of three real files — `component.html`, `component.css`,
`component.js` — plus its documentation. The live demo on the site loads *those exact files*, and
the copy panel shows *those exact files*. There is no build step between what you see and what you
copy, so the two can never drift apart.

Every component is built to work with:

- **Desktop screen readers** — NVDA, JAWS, VoiceOver on macOS
- **Mobile screen readers** — VoiceOver on iOS, TalkBack on Android
- **Keyboard only** — full [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) keyboard patterns
- **Touch and small screens** — fluid to 320px, 24×24px minimum targets
- **Windows High Contrast Mode** — `forced-colors` support on every component
- **Reduced motion** — every transition gated behind a motion token

## Using a component

1. Find it on the site and try it with your keyboard and screen reader.
2. Copy the HTML, CSS, and JS from the code panel.
3. Paste them in. There is nothing else to install — no dependencies, no extra files.

The CSS is written so it works either way:

```css
background: var(--ac-surface, var(--bg-panel, #14121c));
```

In a bare app it uses the literal default. In an app that already defines these tokens, it picks
up your theme automatically. To retheme everything at once, set the `--ac-*` tokens in one place.

The JS is a plain factory function, so framework users get a lifecycle handle:

```js
const dropdown = AC.createDropdown(el);
// ...later
dropdown.destroy();
```

## Repository layout

```
src/library/     The components themselves. Pure vanilla, zero Astro. This is the product.
src/site/        The Astro shell that displays them. Never contains component code.
tests/shared/    The accessibility gate every component must pass.
docs/            Authoring guide, AT support matrix, WCAG mapping.
scripts/         Library sync, component scaffolder, token linter.
```

`src/library/` never imports from `src/site/`, so the library stays portable.

## Development

Requires Node 20+.

```sh
npm install
npm run dev        # http://localhost:4321/a11y-component-examples/
npm run build      # static output to dist/
npm run preview    # serve the built output
```

### Checks

```sh
npm run check:tokens   # no hardcoded colors outside a fallback position
npm test               # Playwright: axe-core, keyboard, contrast, reflow, forced-colors
npm run verify         # all of the above plus a production build
```

The automated suite runs across Chromium, Firefox, and WebKit, and repeats the axe scan under
every theme. It catches a great deal, but it does not replace a real screen reader — manual
results are recorded per component in [docs/at-support.md](docs/at-support.md).

### Adding a component

```sh
npm run new:component my-component
```

That scaffolds the folder. Navigation, the index page, and the test matrix all derive from
`meta.json`, so there is nothing else to wire up. See
[docs/authoring-a-component.md](docs/authoring-a-component.md) for the conventions.

## Theming

Themes come from the [theme-service](../theme-service) token system, vendored into
`src/site/theme/`. Ten themes across five families, each validated to pass AA in every state, in
both dark and light. Components consume the tokens; they never hardcode a color.
