#!/usr/bin/env node
/* install-skill.mjs — install this library for agent use in other repos.

   A committed .claude/skills/ loads only while this repo is the open project. This links
   it out, so it loads everywhere.

   WRITES (all outside this repo)
     ~/.claude/skills/a11y-library      junction (Windows) / symlink -> .claude/skills/a11y-library/
                                        cpSync fallback when links are unavailable; a copy needs a re-run
     ~/.claude/a11y-library.local.json  { repo, version, baseUrl, history: [{date, version, action, note}] }
     <dir>/AGENTS.md                    pointer block between HTML markers; --into <dir> only

   NEVER WRITES  anything inside this repo; anything under ~/.claude/ but the two paths above
                 (settings.local.json is gitignored and unrecoverable, and sits beside skills/)

   READS  <repo>/.claude/skills/a11y-library/SKILL.md   frontmatter `description`, for the block
          <repo>/astro.config.mjs                       via readBaseUrl(), for the fallback URL

   RESOLUTION ORDER for the skill's repo-relative read path
     1. `repo` from ~/.claude/a11y-library.local.json   local, exact, no network
     2. `baseUrl` over HTTP                             survives a moved or deleted clone

   COMMANDS
     npm run install:skill                         link the skill + write the config
     npm run install:agents-md -- ../other-repo     pointer block into that repo's AGENTS.md
     npm run install:agents-md                     print the block to stdout
     npm run uninstall:skill                       remove the link, keep the config
     --source <path>                               install from a different clone
     --help

   CONSTRAINT  node builtins only, so it runs on a fresh clone before `npm install`. */
import {
  existsSync,
  lstatSync,
  rmSync,
  mkdirSync,
  symlinkSync,
  cpSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

// Imported, not restated: the generator renders both the skill folder and the
// sentence naming the config, so it owns those strings. One owner means a rename
// cannot be half-done.
import {
  SKILL_NAME,
  SKILL_OUT,
  CONFIG_FILE,
  CONFIG_DISPLAY,
  readBaseUrl,
} from './build-agent-surfaces.mjs';

export { CONFIG_FILE, CONFIG_DISPLAY };

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : undefined;
};
const has = (name) => argv.includes(name);

function printHelp() {
  console.log(`a11y-component-examples skill installer

  (no flags)           link the skill into ~/.claude/skills/ and write ${CONFIG_DISPLAY}
  --into <dir>         add the pointer block to <dir>/AGENTS.md, for agents that are not
                       Claude Code (idempotent — re-running replaces the block in place)
  --print              print that block to stdout instead of writing it
  --uninstall          remove the ~/.claude/skills/${SKILL_NAME} link; the config is kept
  --source <path>      install from a different clone of this repo (default: this one)
  --help               show this

Nothing is written inside the repo.`);
}

const scriptRepo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = flag('--source') ? resolve(flag('--source')) : scriptRepo;
const claude = join(homedir(), '.claude');
const skillsDir = join(claude, 'skills');
const configPath = join(claude, CONFIG_FILE);

const skillSource = join(repo, dirname(SKILL_OUT));
const skillTarget = join(skillsDir, SKILL_NAME);

/* -------------------------------------------------------------------------- */
/* The pointer block                                                          */
/* -------------------------------------------------------------------------- */

// Matched on the opening marker alone, so the parenthetical after it can be
// reworded without stranding a block nothing can find again.
const BEGIN = '<!-- a11y-library:begin';
const END = '<!-- a11y-library:end -->';

/**
 * The skill's `description`, read out of the generated SKILL.md.
 *
 * Not restated here: it is the string that decides whether an agent looks at this
 * library at all, and it is rendered from `docs/agents/preamble.md`. A copy would
 * be a second thing to keep in step. YAML single-quoted, so `''` is the only escape.
 */
function skillDescription() {
  const text = readFileSync(join(repo, SKILL_OUT), 'utf8').replace(/^﻿/, '');
  const raw = text.match(/^description:\s*'((?:[^']|'')*)'\s*$/m)?.[1];
  if (!raw) {
    throw new Error(`${SKILL_OUT} — could not read the frontmatter \`description\``);
  }
  return raw.replace(/''/g, "'");
}

/**
 * What a non-Claude agent gets. Routing only — the tiers, budgets and rules are in
 * AGENTS.md, and a paraphrase here would be a fourth copy of Tier 0 that no
 * generator checks.
 *
 * Names both the clone and the URL: the clone is gone after a move, the URL is
 * gone without a network.
 */
function pointerBlock(baseUrl) {
  const agentsMd = join(repo, 'AGENTS.md').replace(/\\/g, '/');
  return `${BEGIN} (managed by scripts/install-skill.mjs — re-run to update) -->
## Accessible components

${skillDescription()}

Read \`${agentsMd}\` for the tiered read path.
If that path is not readable from here, read \`${baseUrl}llms.txt\` instead.
Follow the tiers and stop when one answers you.
${END}`;
}

/** Replace the block between the markers, or append it. Never a second copy. */
function upsertBlock(existing, block) {
  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);
  if (start !== -1 && end !== -1 && end > start) {
    return existing.slice(0, start) + block + existing.slice(end + END.length);
  }
  return existing.trimEnd() + `\n\n${block}\n`;
}

/* -------------------------------------------------------------------------- */
/* Linking                                                                    */
/* -------------------------------------------------------------------------- */

/** Junction/symlink `source` at `target`, refreshing an existing link.
 *  Returns false if it had to fall back to a copy, which then needs a re-run to
 *  pick up repo changes. */
function link(source, target) {
  // Refresh an existing link; refuse a real directory. One of the same name is a
  // hand-written skill, which this tool does not delete.
  if (existsSync(target)) {
    if (lstatSync(target).isSymbolicLink()) rmSync(target, { recursive: true, force: true });
    else {
      console.error(
        `${target} exists and is a real directory (not a link). Remove it manually, then re-run.`,
      );
      process.exit(1);
    }
  }
  try {
    symlinkSync(source, target, process.platform === 'win32' ? 'junction' : 'dir');
    console.log(`Linked skill: ${target} -> ${source}`);
    return true;
  } catch {
    cpSync(source, target, { recursive: true });
    console.log(`Copied skill into: ${target} (link unavailable; re-run to update)`);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* The machine-local config                                                   */
/* -------------------------------------------------------------------------- */

const version = (() => {
  try {
    return JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

/** Merge into whatever is already there, so `history` survives a re-run. */
function writeConfig({ action, note, baseUrl }) {
  let cfg = {};
  try {
    if (existsSync(configPath)) cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    cfg = {};
  }

  cfg.repo = repo;
  cfg.version = version;
  cfg.baseUrl = baseUrl;
  cfg.history = Array.isArray(cfg.history) ? cfg.history : [];
  cfg.history.push({ date: new Date().toISOString().slice(0, 10), version, action, note });

  mkdirSync(claude, { recursive: true });
  writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');
  return cfg;
}

/* -------------------------------------------------------------------------- */
/* Run                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Behind a main guard so the module can be imported for its constants without
 * installing anything. `tests/shared/agent-surfaces.spec.mjs` does exactly that.
 */
async function main() {
  if (has('--help') || has('-h')) {
    printHelp();
    return;
  }

  if (!existsSync(join(repo, SKILL_OUT))) {
    console.error(
      `${SKILL_OUT} not found under ${repo} — is that a clone of a11y-component-examples?`,
    );
    process.exit(1);
  }

  const baseUrl = await readBaseUrl(repo);

  if (has('--uninstall')) {
    if (!existsSync(skillTarget)) {
      console.log(`Nothing to remove: ${skillTarget} does not exist.`);
    } else if (lstatSync(skillTarget).isSymbolicLink()) {
      rmSync(skillTarget, { recursive: true, force: true });
      console.log(`Removed link: ${skillTarget}`);
    } else {
      // A copy-fallback install leaves a real directory, and it is ours to remove
      // only because SKILL.md carries the generator's marker.
      const marker = 'generated by npm run agents';
      const skillFile = join(skillTarget, 'SKILL.md');
      if (existsSync(skillFile) && readFileSync(skillFile, 'utf8').includes(marker)) {
        rmSync(skillTarget, { recursive: true, force: true });
        console.log(`Removed installed copy: ${skillTarget}`);
      } else {
        console.error(
          `${skillTarget} is a real directory and is not this library's skill. Remove it manually.`,
        );
        process.exit(1);
      }
    }
    if (existsSync(configPath)) {
      writeConfig({ action: 'uninstall', note: `unlinked ${skillTarget}`, baseUrl });
      console.log(`Kept ${configPath} (removal recorded in its history).`);
    }
    return;
  }

  if (has('--print')) {
    console.log(pointerBlock(baseUrl));
    return;
  }

  if (has('--into')) {
    // `npm run install:agents-md` with no path lands here with nothing after the
    // flag. Printing beats erroring: it is the same block, and stdout is where
    // the other half of the audience wants it anyway.
    const into = flag('--into');
    if (!into) {
      console.log(pointerBlock(baseUrl));
      return;
    }

    const dir = resolve(into);
    if (!existsSync(dir)) {
      console.error(`${dir} does not exist.`);
      process.exit(1);
    }
    const agentsMd = join(dir, 'AGENTS.md');
    const existing = existsSync(agentsMd) ? readFileSync(agentsMd, 'utf8') : '';
    const next = existing
      ? upsertBlock(existing, pointerBlock(baseUrl))
      : `# AGENTS.md\n\n${pointerBlock(baseUrl)}\n`;

    writeFileSync(agentsMd, next);
    console.log(
      existing.includes(BEGIN)
        ? `Updated the a11y-library block in ${agentsMd}`
        : `Added the a11y-library block to ${agentsMd}`,
    );
    return;
  }

  mkdirSync(skillsDir, { recursive: true });
  const linked = link(skillSource, skillTarget);
  writeConfig({ action: 'install', note: `source ${repo}`, baseUrl });

  console.log(`Wrote ${configPath}  (repo=${repo})`);
  console.log(`\nDone. Claude Code will discover the ${SKILL_NAME} skill on its next session.`);
  if (!linked) {
    console.log('Note: installed as a copy — re-run this script after updating the repo.');
  }
  console.log('For an agent that is not Claude Code: npm run install:agents-md -- <path-to-that-repo>');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
