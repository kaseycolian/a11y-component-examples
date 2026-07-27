/**
 * Theme registry for the site header's picker.
 *
 * `themes.index.json` gives us ids, labels, families and modes. The actual
 * colors live in `theme.css`, so we parse the accent triple out of each
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
    const colors = [read('accent-pink'), read('accent-green'), read('accent-blue')].filter(Boolean);
    if (colors.length) swatches.set(id, colors);
  }

  return swatches;
}

const SWATCHES = parseSwatches(themeCss);

/** All themes, each with the swatch colors the picker renders. */
export const THEMES = index.themes.map((theme) => ({
  ...theme,
  swatch: SWATCHES.get(theme.id) ?? [],
}));

/** Themes split into the two option groups the picker shows. */
export const THEME_GROUPS = [
  { label: 'Dark', themes: THEMES.filter((t) => t.mode === 'dark') },
  { label: 'Light', themes: THEMES.filter((t) => t.mode === 'light') },
];

export const THEME_VERSION = index.version;
export const DEFAULT_THEME = index.default;
