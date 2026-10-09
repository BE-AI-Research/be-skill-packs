import { test, assert } from "./run.mjs";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const root = new URL("../packs/assist/", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(root + "pack.json", "utf8"));
const dir = root + (manifest.commands ?? "commands") + "/";
const files = readdirSync(dir).filter((f) => f.endsWith(".md"));

test("the four commands exist, named as the harness names them", () => {
  // A command's name is its filename; there is no sub-command dispatch.
  for (const want of ["assist-brief.md", "assist-triage.md", "assist-release.md", "assist-followup.md"]) {
    assert(files.includes(want), `missing ${want}`);
  }
});

test("every command takes the user's argument text", () => {
  for (const f of files) {
    assert(readFileSync(dir + f, "utf8").includes("$ARGS"), `${f} never uses $ARGS`);
  }
});

test("every pack reference resolves to a real chunk or file", () => {
  const chunks = new Set(Object.keys(manifest.chunks ?? {}));
  let refs = 0;
  for (const f of files) {
    const text = readFileSync(dir + f, "utf8");
    for (const [, ref] of text.matchAll(/pack assist\/([a-z0-9-]+)/g)) {
      refs++;
      assert(chunks.has(ref), `${f} points at chunk ${ref}, which is not in the manifest`);
    }
  }
  assert(refs >= 4, `only ${refs} chunk references across ${files.length} commands`);
});

test("every command that needs facts tells the model to run the scan", () => {
  for (const f of ["assist-brief.md", "assist-release.md", "assist-followup.md"]) {
    const text = readFileSync(dir + f, "utf8");
    assert(/tools\/scan/.test(text), `${f} does not run the scan, so its facts would be guesses`);
    assert(existsSync(root + "tools/scan"), "the scan it names does not exist");
  }
});

// The difference between an assistant and a cron job.
test("the brief permits saying there is nothing worth raising", () => {
  const text = readFileSync(dir + "assist-brief.md", "utf8").toLowerCase();
  assert(/nothing worth raising/.test(text), "the brief does not allow an empty answer");
  assert(/at most five|at most 5/.test(text), "the brief does not cap its items");
});

// The rule that must survive every edit.
test("no command instructs an action reserved to the person", () => {
  for (const f of files) {
    const text = readFileSync(dir + f, "utf8").toLowerCase();
    for (const forbidden of ["git push", "git merge", "npm publish", "gh release"]) {
      assert(!text.includes(forbidden), `${f} instructs ${forbidden}, which is the person's decision`);
    }
  }
});
