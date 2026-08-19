#!/usr/bin/env node
/**
 * Encoding linter, repo-wide.
 *
 * `build-agent-surfaces.mjs` has refused mojibake since the incident that
 * caused it, but only in what it reads: the five files in `docs/agents/` and
 * every `meta.json`. Every `component.html`, every `docs.md` and every file
 * under `docs/` were unguarded, and a long prose file is exactly what gets
 * round-tripped by accident. This is that guard, hoisted to the whole repo.
 *
 *   node scripts/check-encoding.mjs
 *
 * Two things fail it, both signatures of a file read as one encoding and
 * written back as another:
 *
 *   MOJIBAKE  `â€` -- UTF-8 bytes read as Latin-1 and re-encoded. An em dash
 *             becomes `â€"`, an ellipsis `â€¦`. PowerShell 5.1's
 *             `Get-Content -Raw` + `Set-Content -Encoding utf8` does this to
 *             any file it round-trips. It survives `git diff --stat`, renders
 *             as garbage, and is invisible in review.
 *   BOM       A leading U+FEFF. The same round-trip adds one, and in a
 *             `meta.json` it breaks `JSON.parse` before anything else can go
 *             wrong. Nothing in this repo is supposed to carry one.
 *
 * The fix is never to retype the characters -- `git checkout -- <file>`.
 *
 * THE ALLOWLIST IS DERIVED, NOT TRANSCRIBED.
 *
 * The files that *document* the trap contain it, so the check needs a way to
 * let them through. A list of paths here would be a tally of occurrences of a
 * string, kept in prose that discusses that string, and it cannot stay true:
 * three attempts to write that number down were each stale before the commit
 * landed, one of them made stale by the act of writing it. So a file declares
 * itself instead, by carrying the marker below, and this file is exempt for
 * free because the marker's own definition is in it.
 *
 * Same shape as `data-ac-demo-broken`, including the reverse direction: a
 * marker in a file with nothing to allow is stale and fails too, so the
 * allowlist cannot outlive what it was for.
 *
 * Exports `MOJIBAKE` so `build-agent-surfaces.mjs` states the signature once.
 */
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** UTF-8 read as Latin-1 and re-encoded. Every case starts with these two. */
export const MOJIBAKE = 'â€';

/** A file carrying this may contain the signature; one without it may not. */
export const DOCUMENTED = 'check-encoding:documented';

const BOM = '﻿';

/**
 * Tracked files plus untracked ones git would let you commit.
 *
 * `--others --exclude-standard` is what closes the gap that matters: a brand
 * new `docs.md` is corrupted before it is ever `git add`ed, and a check over
 * `--cached` alone would pass on it and fail on the commit after.
 *
 * Deriving the set from git is also what keeps this in step with `.gitignore`
 * -- `public/library/`, `dist/` and `.astro/` are generated copies of files
 * checked here already, and a second exclusion list would be a second thing to
 * keep right.
 */
function repoFiles() {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  return out.split('\0').filter(Boolean).sort();
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

async function main() {
  const files = repoFiles();
  const problems = [];
  let documented = 0;
  let scanned = 0;

  for (const file of files) {
    let buf;
    try {
      buf = await readFile(resolve(root, file));
    } catch {
      continue; // Listed by git and gone from disk: not this check's business.
    }
    // A NUL byte means binary, which no text encoding claim applies to. Cheaper
    // and more general than an extension list nobody would remember to extend.
    if (buf.includes(0)) continue;

    scanned++;
    const text = buf.toString('utf8');

    if (text.startsWith(BOM)) {
      problems.push(`${file}:1  starts with a UTF-8 BOM`);
    }

    const allowed = text.includes(DOCUMENTED);
    const hits = [...text.matchAll(new RegExp(MOJIBAKE, 'g'))];

    if (allowed) {
      documented++;
      if (hits.length === 0) {
        problems.push(
          `${file}  declares "${DOCUMENTED}" but no longer contains the signature -- ` +
            `remove the marker`,
        );
      }
      continue;
    }

    for (const hit of hits) {
      problems.push(
        `${file}:${lineOf(text, hit.index)}  mojibake "${text.slice(hit.index, hit.index + 3)}"`,
      );
    }
  }

  if (problems.length) {
    for (const problem of problems) console.error(problem);
    console.error(
      `\ncheck-encoding: ${problems.length} problem${problems.length === 1 ? '' : 's'} in ` +
        `${scanned} file(s).\n` +
        'Restore each file with `git checkout -- <file>`; retyping the characters puts the\n' +
        'same bytes back. A file that names the signature on purpose says so by carrying\n' +
        `"${DOCUMENTED}".`,
    );
    process.exit(1);
  }

  console.log(
    `check-encoding: ${scanned} file(s) clean, ${documented} documenting the signature.`,
  );
}

/** Only run when invoked as a command -- build-agent-surfaces.mjs imports MOJIBAKE. */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (err) {
    console.error(`check-encoding: ${err.message}`);
    process.exit(1);
  }
}
