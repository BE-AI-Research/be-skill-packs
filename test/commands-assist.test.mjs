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

// Two documentation defects the final review found that no test could catch,
// because both were prose that read plausibly. Each is pinned here.
const read = (rel) => readFileSync(root + rel, "utf8");

test("the triage chunk teaches one root per document, not a flat checklist", () => {
  const chunk = read("chunks/triage.md");
  for (const block of chunk.match(/```markdown\n([\s\S]*?)```/g) ?? []) {
    const body = block.replace(/```markdown\n|```/g, "");
    const heading = body.match(/^# (\d+) —/m);
    assert(heading, `a markdown example with no "# NNN —" heading:\n${body}`);
    const roots = body.match(/^- \[.\] /gm) ?? [];
    assert(
      roots.length === 1,
      `${roots.length} unindented bullets in one document: the engine reads each as its own top-level task and splits the document. Example:\n${body}`,
    );
    const rootId = body.match(/^- \[.\] (\d+)\./m);
    assert(rootId, `the root carries no id:\n${body}`);
    assert(
      Number(rootId[1]) === Number(heading[1]),
      `the root's id (${rootId[1]}) must be the document's number (${heading[1]})`,
    );
  }
});

test("the README never tells anyone to schedule a slash command", () => {
  const readme = read("README.md");
  const lines = readme.split("\n").filter((l) => l.includes("/schedule add"));
  assert(lines.length > 0, "the README should still show how to schedule the brief");
  for (const l of lines) {
    const after = l.split(" -- ")[1] ?? "";
    assert(
      /^\/\S/.test(after.trim()) === false,
      `a schedule's instruction is sent as plain text and never expanded, so this schedules six literal characters:\n${l}`,
    );
  }
  assert(
    /not expanded|plain text/.test(readme),
    "the README must say that a schedule's instruction is not expanded",
  );
});

test("every scan line quoted in the pack's prose is one the scan can emit", () => {
  // An example line missing a field the scan always emits, or carrying one it
  // never emits, primes the model on a report shape that does not exist.
  // "todo=4 blocked=1" survived a whole review that way, from back when todo
  // was count minus the others rather than a mark the scan reads.
  const always = ["dir", "count", "doing", "todo", "active", "done", "blocked", "dropped"];
  let seen = 0;
  for (const f of ["README.md", "chunks/brief.md", "chunks/release.md"]) {
    for (const l of read(f).split("\n")) {
      if (!/^tasks {3}dir=/.test(l)) continue;
      seen++;
      const fields = l
        .slice("tasks   ".length)
        .split(" ")
        .map((kv) => kv.split("=")[0])
        .map((k) => (/^stale>\d+d$/.test(k) ? "stale" : k));
      for (const want of always) {
        assert(fields.includes(want), `${f} quotes a tasks line with no ${want}=: the scan always emits it.\n${l}`);
      }
      for (const got of fields) {
        assert(always.includes(got) || got === "stale", `${f} quotes a tasks field the scan does not emit: ${got}\n${l}`);
      }
    }
  }
  assert(seen > 0, "no example tasks line found to check");
});
