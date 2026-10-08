// Copies each broken variant into the fixture's src/, runs the real tools,
// and freezes their output under fixtures/ui-web/captured/.
//
// Every playbook entry is written against these files. An entry matched
// against a line nobody captured is a guess, and guesses are what this
// script exists to prevent.
//
// It runs the pack's own wrappers rather than the tools directly, so what is
// captured is what the harness will actually see. The first version called
// `npx tsc`, which does not even resolve to TypeScript in a project that
// lacks it — it fetches a squatter package — so the captures were produced by
// a command the pack no longer names.

import { cpSync, mkdirSync, rmSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, basename } from "node:path";

const fixture = new URL("../fixtures/ui-web/", import.meta.url).pathname;
const broken = join(fixture, "broken");
const captured = join(fixture, "captured");
const lint = new URL("../packs/ui-web/tools/lint", import.meta.url).pathname;
const typecheck = new URL("../packs/ui-web/tools/typecheck", import.meta.url).pathname;

const target = join(fixture, "src", "Broken.tsx");
const configPath = join(fixture, "eslint.config.mjs");
const originalConfig = readFileSync(configPath, "utf8");

// Everything this script disturbs, undone in one place. It is wired to both
// `finally` and the signals, because a Node `finally` does **not** run on
// SIGINT — and Ctrl-C during a run of eleven passes is the likeliest way this
// script ever ends. Leaving the strict config behind would quietly change
// every later capture, and leaving src/Broken.tsx behind would put a broken
// file into the fixture's green baseline, where `git add -A` would commit it.
function restore() {
  try {
    writeFileSync(configPath, originalConfig);
  } catch {
    /* nothing better to do while unwinding */
  }
  rmSync(target, { force: true });
}
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    restore();
    process.exit(130);
  });
}

function run(bin, args = []) {
  return spawnSync(process.execPath, [bin, "--project", fixture, ...args], {
    cwd: fixture,
    encoding: "utf8",
  });
}

try {
  mkdirSync(captured, { recursive: true });

  for (const file of readdirSync(broken)) {
    const name = basename(file, ".tsx");
    cpSync(join(broken, file), target);

    const tsc = run(typecheck);
    const eslint = run(lint);

    const text =
      [
        `$ tools/typecheck   (exit ${tsc.status})`,
        (tsc.stdout ?? "").trimEnd(),
        "",
        `$ tools/lint   (exit ${eslint.status})`,
        (eslint.stdout ?? "").trimEnd(),
      ].join("\n") + "\n";

    writeFileSync(join(captured, `${name}.txt`), text);
    console.log(`captured ${name}: typecheck exit ${tsc.status}, lint exit ${eslint.status}`);
    rmSync(target, { force: true });
  }

  // The opt-in pass. react-hooks/exhaustive-deps is a warning in the plugin's
  // own recommended config and in Next.js's, and tools/lint drops warnings, so
  // a default project's harness never sees a missing dependency. A project
  // that elevates the rule does see it, and the playbook entry for it has to
  // be written against real output rather than against the rule's
  // documentation — which is what this pass produces.
  writeFileSync(
    configPath,
    originalConfig.replace(
      '"react-hooks/exhaustive-deps": "warn"',
      '"react-hooks/exhaustive-deps": "error"',
    ),
  );
  cpSync(join(broken, "hooks.tsx"), target);
  const strict = run(lint);
  writeFileSync(
    join(captured, "hooks-strict.txt"),
    [
      '# captured with react-hooks/exhaustive-deps elevated from "warn" to "error";',
      "# a default project produces none of this.",
      `$ tools/lint   (exit ${strict.status})`,
      (strict.stdout ?? "").trimEnd(),
      "",
    ].join("\n"),
  );
  console.log(`captured hooks-strict: lint exit ${strict.status}`);
} finally {
  restore();
}
