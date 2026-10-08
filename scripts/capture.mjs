// Copies each broken variant into the fixture's src/, runs the real tools,
// and freezes their output under fixtures/ui-web/captured/.
//
// Every playbook entry is written against these files. An entry matched
// against a line nobody captured is a guess, and guesses are what this
// script exists to prevent.

import { cpSync, mkdirSync, rmSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, basename } from "node:path";

const fixture = new URL("../fixtures/ui-web/", import.meta.url).pathname;
const broken = join(fixture, "broken");
const captured = join(fixture, "captured");
const lint = new URL("../packs/ui-web/tools/lint", import.meta.url).pathname;

mkdirSync(captured, { recursive: true });

for (const file of readdirSync(broken)) {
  const name = basename(file, ".tsx");
  const target = join(fixture, "src", "Broken.tsx");
  cpSync(join(broken, file), target);

  const tsc = spawnSync("npx", ["tsc", "--noEmit", "--pretty", "false"], {
    cwd: fixture,
    encoding: "utf8",
  });
  const eslint = spawnSync(lint, ["--project", fixture], { cwd: fixture, encoding: "utf8" });

  const text =
    [
      `$ tsc --noEmit --pretty false   (exit ${tsc.status})`,
      (tsc.stdout ?? "").trimEnd(),
      "",
      `$ tools/lint   (exit ${eslint.status})`,
      (eslint.stdout ?? "").trimEnd(),
    ].join("\n") + "\n";

  writeFileSync(join(captured, `${name}.txt`), text);
  console.log(`captured ${name}: tsc exit ${tsc.status}, lint exit ${eslint.status}`);
  rmSync(target, { force: true });
}

// The opt-in pass. react-hooks/exhaustive-deps is a warning in the plugin's own
// recommended config and in Next.js's, and tools/lint drops warnings, so a
// default project's harness never sees a missing dependency. A project that
// elevates the rule does see it, and the playbook entry for it has to be
// written against real output rather than against the rule's documentation —
// which is what this pass produces. The config swap is restored in `finally`,
// because leaving a strict config behind would quietly change every later
// capture.
const configPath = join(fixture, "eslint.config.mjs");
const original = readFileSync(configPath, "utf8");
const target = join(fixture, "src", "Broken.tsx");
try {
  writeFileSync(configPath, original.replace('"react-hooks/exhaustive-deps": "warn"', '"react-hooks/exhaustive-deps": "error"'));
  cpSync(join(broken, "hooks.tsx"), target);
  const strict = spawnSync(lint, ["--project", fixture], { cwd: fixture, encoding: "utf8" });
  writeFileSync(
    join(captured, "hooks-strict.txt"),
    [
      "# captured with react-hooks/exhaustive-deps elevated from \"warn\" to \"error\";",
      "# a default project produces none of this.",
      `$ tools/lint   (exit ${strict.status})`,
      (strict.stdout ?? "").trimEnd(),
      "",
    ].join("\n"),
  );
  console.log(`captured hooks-strict: lint exit ${strict.status}`);
} finally {
  writeFileSync(configPath, original);
  rmSync(target, { force: true });
}
