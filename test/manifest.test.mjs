import { test, assert } from "./run.mjs";
import { readFileSync, statSync } from "node:fs";

const root = new URL("../packs/ui-web/", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(root + "pack.json", "utf8"));

test("core is within its declared budget", () => {
  const bytes = statSync(root + "core.md").size;
  const estimate = Math.floor(bytes / 3); // the deterministic estimate
  assert(
    estimate <= manifest.core.budget_tokens,
    `core ~${estimate} tokens over ${manifest.core.budget_tokens}`
  );
});

test("every verify command is an argument vector naming a known parser", () => {
  const parsers = ["generic", "gcc", "msvc", "ubt"];
  for (const c of manifest.verify) {
    assert(Array.isArray(c.cmd) && c.cmd.length > 0, `${c.name}: cmd is not an argv`);
    assert(parsers.includes(c.parser), `${c.name}: unknown parser ${c.parser}`);
  }
});

test("every chunk file exists and is under the 4 KiB floor", () => {
  for (const [name, chunk] of Object.entries(manifest.chunks ?? {})) {
    const bytes = statSync(root + chunk.file).size;
    assert(bytes < 4096, `chunk ${name} is ${bytes} bytes`);
    assert(chunk.summary && chunk.summary.length > 0, `chunk ${name} has no summary`);
  }
});

test("detection requires both a package manifest and a tsx file", () => {
  assert(manifest.detect.all.includes("package.json"), "missing package.json");
  assert(
    manifest.detect.all.some((g) => g.endsWith("*.tsx")),
    "missing a tsx glob"
  );
});
