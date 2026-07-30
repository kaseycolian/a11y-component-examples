/**
 * The component groups: display order, name, and blurb.
 *
 * This is plain data with no imports on purpose. `registry.mjs` re-exports it
 * for the Astro side, and `scripts/build-agent-surfaces.mjs` imports it with
 * plain Node -- which cannot load `registry.mjs`, because `import.meta.glob`
 * only exists inside Vite. Two copies of this list would drift, and the group
 * a component claims is validated against it, so it has to be one list.
 *
 * A component's `meta.json` `group` must match one of these ids.
 */
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
