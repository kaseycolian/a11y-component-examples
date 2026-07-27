/**
 * The component registry.
 *
 * Every component folder under src/library/components/ carries a meta.json.
 * This module globs them at build time, so navigation, the index page, the
 * per-component routes, and the test matrix all derive from the same source.
 * Adding a component means adding a folder -- nothing here needs editing.
 */

/** Display order and blurb for each group. A component's `group` must match one of these keys. */
export const GROUPS = [
  {
    id: 'foundations',
    name: 'Foundations',
    summary:
      'The primitives everything else is built on: focus, motion, announcements, and the utilities that make the rest possible.',
  },
  {
    id: 'buttons-actions',
    name: 'Buttons & Actions',
    summary: 'Things a person presses, and how each one reports what it did.',
  },
  {
    id: 'forms-inputs',
    name: 'Forms & Inputs',
    summary:
      'Labeled, described, and error-wired controls. The field wrapper here is the backbone every other input reuses.',
  },
  {
    id: 'overlays-disclosure',
    name: 'Overlays & Disclosure',
    summary:
      'Content that appears on demand, where focus has to go somewhere sensible and come back again.',
  },
  {
    id: 'navigation',
    name: 'Navigation',
    summary: 'Moving between views and sections without losing your place.',
  },
  {
    id: 'feedback-status',
    name: 'Feedback & Status',
    summary:
      'Telling someone what happened -- in a way that reaches a screen reader, not just an eye.',
  },
  {
    id: 'data-display',
    name: 'Data Display',
    summary: 'Structured content that keeps its structure when it is read aloud or reflowed.',
  },
  {
    id: 'compositions',
    name: 'Compositions',
    summary: 'Several components working together, the way they would in a real screen.',
  },
];

const GROUP_INDEX = new Map(GROUPS.map((g, i) => [g.id, i]));

/** Raw meta.json modules, keyed by their path under src/library/components/. */
const metaModules = import.meta.glob('../../library/components/*/meta.json', { eager: true });

function slugFromPath(path) {
  const match = path.match(/components\/([^/]+)\/meta\.json$/);
  return match ? match[1] : null;
}

/**
 * Every registered component, sorted by group order then by the component's
 * own `order`, then alphabetically as a stable tiebreak.
 */
export const COMPONENTS = Object.entries(metaModules)
  .map(([path, mod]) => {
    const meta = mod.default ?? mod;
    const slug = meta.slug ?? slugFromPath(path);

    if (!slug) throw new Error(`registry: could not determine a slug for ${path}`);
    if (!GROUP_INDEX.has(meta.group)) {
      throw new Error(
        `registry: component "${slug}" has group "${meta.group}", which is not in GROUPS. ` +
          `Valid groups: ${GROUPS.map((g) => g.id).join(', ')}`,
      );
    }

    return {
      slug,
      name: meta.name ?? slug,
      group: meta.group,
      order: meta.order ?? 100,
      summary: meta.summary ?? '',
      tags: meta.tags ?? [],
      apg: meta.apg ?? null,
      wcag: meta.wcag ?? [],
      status: meta.status ?? 'stable',
      // Which of the three files this component actually ships. A CSS-only
      // utility has no component.js, and the copy panel should not show an
      // empty tab for it.
      files: meta.files ?? ['html', 'css', 'js'],
      /** Extra demo-page notes that belong next to the live example, not in docs.md. */
      demoNote: meta.demoNote ?? null,
    };
  })
  .sort(
    (a, b) =>
      GROUP_INDEX.get(a.group) - GROUP_INDEX.get(b.group) ||
      a.order - b.order ||
      a.name.localeCompare(b.name),
  );

/** The same components, bucketed by group, with empty groups dropped. */
export const COMPONENTS_BY_GROUP = GROUPS.map((group) => ({
  ...group,
  components: COMPONENTS.filter((c) => c.group === group.id),
})).filter((group) => group.components.length > 0);

/** Look up a single component, or throw with a useful message. */
export function getComponent(slug) {
  const found = COMPONENTS.find((c) => c.slug === slug);
  if (!found) {
    throw new Error(
      `registry: no component "${slug}". Known: ${COMPONENTS.map((c) => c.slug).join(', ') || '(none yet)'}`,
    );
  }
  return found;
}
