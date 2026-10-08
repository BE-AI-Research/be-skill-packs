// Copies each broken variant into the fixture's src/, runs the real tools,
// and freezes their output under fixtures/ui-web/captured/.
//
// Every playbook entry is written against these files. An entry matched
// against a line nobody captured is a guess, and guesses are what this
// script exists to prevent.

import { cpSync, mkdirSync, rmSync, writeFileSync, readdirSync } from "node:fs";
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
