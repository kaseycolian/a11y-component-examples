import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Each component's prose documentation lives at
 * `src/library/components/<slug>/docs.md`, right next to the code it explains,
 * so the two are edited together and cannot drift.
 *
 * The `base` points outside srcDir on purpose -- src/library/ is deliberately
 * not part of the Astro app. The custom `generateId` turns
 * `dropdown/docs.md` into the id `dropdown`, so it matches the registry slug.
 */
const docs = defineCollection({
  loader: glob({
    pattern: '*/docs.md',
    base: './src/library/components',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
});

export const collections = { docs };
