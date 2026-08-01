/**
 * Theme registry for the site header's picker.
 *
 * `themes.index.json` gives us ids, labels, families and modes. The actual
 * colors live in `theme.css`, so we parse the four accents out of each
 * `[data-theme="..."]` block at build time and hand it to the picker as a
 * swatch. That keeps the swatches honest: they are the theme's real colors,
 * not a hand-maintained copy that can drift.
 */
import index from '../theme/themes.index.json';
import themeCss from '../theme/theme.css?raw';

/** Accent colors keyed by theme id, extracted from theme.css. */
function parseSwatches(css) {
  const swatches = new Map();
  // Each theme is one `[data-theme="id"] { ... }` rule.
  const blockRe = /\[data-theme="([^"]+)"\]\s*\{([^}]*)\}/g;
  let match;

  while ((match = blockRe.exec(css)) !== null) {
    const [, id, body] = match;
    const read = (name) => {
      const found = body.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
      return found ? found[1].trim() : null;
    };
    // Pink, green, blue, purple -- the type scale's order, so every palette
    // readout on the site names the four accents in the same sequence.
    const colors = [
      read('accent-pink'),
      read('accent-green'),
      read('accent-blue'),
      read('accent-purple'),
    ].filter(Boolean);
    if (colors.length) swatches.set(id, colors);
  }

  return swatches;
}

const SWATCHES = parseSwatches(themeCss);

/**
 * All themes, each with the swatch colors the picker renders and the label it
 * shows.
 *
 * The mode goes INTO the label, because the groups below are families and a
 * family holds both modes -- two options reading "Rink Classic" in one group is
 * a coin toss. theme-service's own `theme-select.js` writes exactly this string,
 * separator included, so the same theme is called the same thing on both sites.
 */
export const THEMES = index.themes.map((theme) => ({
  ...theme,
  label: `${theme.label} · ${theme.mode === 'light' ? 'Light' : 'Dark'}`,
  swatch: SWATCHES.get(theme.id) ?? [],
}));

/**
 * One group per family, in the order themes.index.json lists them, and within a
 * group in the order it lists the themes -- dark before light.
 *
 * By family rather than by mode, which is how theme-service groups it. Dark/Light
 * put the two halves of one palette on opposite ends of a 17-item list, so
 * comparing a theme against its own counterpart meant scrolling past everything
 * else; a family group puts them next to each other. It also means the group
 * header answers "which palette", which is the question the swatch dots are
 * already answering visually.
 */
export const THEME_GROUPS = index.families
  .map((family) => ({
    label: family.label,
    themes: THEMES.filter((theme) => theme.family === family.family),
  }))
  .filter((group) => group.themes.length > 0);

export const THEME_VERSION = index.version;

/** theme-service's own default (Rink Classic). Left as it ships. */
export const DEFAULT_THEME = index.default;

/**
 * This site's default, set on <html> by BaseLayout so a first-time visitor gets
 * it before first paint.
 *
 * Deliberately not theme-service's `default` and deliberately not a hand-edit of
 * the vendored `:root` block in theme.css — that block is generated upstream, and
 * it is also what the picker's **Auto** option falls back to, which is the one
 * setting here that follows the OS light/dark preference. Overriding it would
 * take that option away; setting an attribute leaves it one click away.
 */
export const SITE_THEME = 'acid-arcade-dark';
