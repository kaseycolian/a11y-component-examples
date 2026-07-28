/**
 * The site's own identity, in one place so the visible brand in the header and
 * the <title> in the tab strip cannot drift apart.
 */
export const SITE_NAME = 'The A11Y Way';

export const SITE_TAGLINE =
  'WCAG 2.2 AA Compliant Development Guide for Humans and Agents';

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
