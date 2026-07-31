/**
 * The site's own identity, in one place so the visible brand in the header and
 * the <title> in the tab strip cannot drift apart.
 */
export const SITE_NAME = 'The A11Y Way';

/**
 * The second half of the header lockup, after the dot. Short because it sits on
 * one line beside the name at 11.5px — the long version of this sentence is the
 * page description, not the brand.
 */
export const SITE_BRAND_TAG = 'WCAG 2.2 Components';

/** Short enough to survive a tab strip, where the full tagline truncates away. */
export const SITE_TAGLINE_SHORT = 'WCAG 2.2 AA Development Guide';

/**
 * Tab title for a page. The site name leads, so a visitor scanning a row of
 * narrow tabs can tell which app they belong to.
 *
 * @param {string} [title] the page's own name; omit on the home page, which the
 *   site name already covers — it takes the tagline instead of repeating itself
 */
export function pageTitle(title) {
  const suffix = !title || title === SITE_NAME ? SITE_TAGLINE_SHORT : title;
  return `${SITE_NAME} · ${suffix}`;
}
