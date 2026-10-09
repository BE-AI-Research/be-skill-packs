import { test, assert } from "./run.mjs";
import { readFileSync, statSync } from "node:fs";

const root = new URL("../packs/assist/", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(root + "pack.json", "utf8"));

test("core is within its declared budget", () => {
  const bytes = statSync(root + "core.md").size;
  const estimate = Math.floor(bytes / 3); // the harness's own deterministic estimate
  assert(
    estimate <= manifest.core.budget_tokens,
    `core ~${estimate} tokens over ${manifest.core.budget_tokens}`,
  );
});

// The spec's §3: this pack uses half the format deliberately. A later edit
// that adds a verify check would put these observations into the repair loop,
// where a model would try to fix them — including by pushing.
test("the pack declares no verify, no playbooks and no detect", () => {
  for (const field of ["verify", "playbooks", "detect", "templates"]) {
    assert(manifest[field] === undefined, `pack.json declares ${field}, which the spec excludes`);
  }
});

test("the scan exists and is executable", () => {
  const st = statSync(root + "tools/scan");
  assert(st.isFile(), "tools/scan missing");
  assert((st.mode & 0o111) !== 0, "tools/scan is not executable");
});

// The rules that must never be missing, each checked by the phrase that
// carries it rather than by its wording.
test("core carries the rules the spec names", () => {
  const core = readFileSync(root + "core.md", "utf8").toLowerCase();
  for (const [what, probe] of [
    ["withholding", "withhold"],
    ["source of every claim", "never what you assume"],
    ["reserved decisions", "never merge"],
    ["anticipation", "anticipate"],
    ["escalation", "twice"],
    ["item shape", "next action"],
  ]) {
    assert(core.includes(probe), `core does not carry the ${what} rule (looked for ${probe})`);
  }
});

// §2 of the spec: the "23 minutes" figure is deliberately absent, because it
// measures elapsed time to return and is routinely misquoted as a penalty.
test("core quotes no interruption figure", () => {
  const core = readFileSync(root + "core.md", "utf8");
  assert(!/\b\d+\s*(minutes|min)\b/i.test(core), "core quotes a figure the spec says to omit");
});
