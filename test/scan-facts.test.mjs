// Every test here pins one fact the scan got wrong, each found by the final
// whole-branch review. They share a shape on purpose: the scan may read a
// fact or say it could not, and nothing in between. A value computed from
// other values, or taken from a git command that answers a nearby question,
// is how a brief ends up confidently wrong.
import { test, assert } from "./run.mjs";
import { makeRepo, gitOut, tempDir } from "./gitfixture.mjs";
import { scan, line } from "./scanhelper.mjs";
import { writeFileSync, symlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

// The engine writes one root per document, whose id is the document's number,
// with steps nested beneath it. The root's mark is the document's status.
const root = (n, title, mark, steps = []) =>
  `# ${n} — ${title}\n\n- [${mark}] ${Number(n)}. ${title}\n` +
  steps.map((s, i) => `  - [${s[0]}] ${Number(n)}.${i + 1}. ${s[1]}\n`).join("");

test("a document whose root is done is not reported as todo", () => {
  const dir = makeRepo({
    commits: 1,
    tasks: {
      "001-a.md": root("001", "finished work", "x", [["x", "did it"]]),
      "002-b.md": root("002", "abandoned work", "-", [["-", "dropped it"]]),
      "003-c.md": root("003", "real work", " ", [[" ", "to do"]]),
    },
  });
  const t = line(scan(dir).out, "tasks ");
  assert(/count=3/.test(t), t);
  assert(/done=1/.test(t), `a [x] root must count as done: ${t}`);
  assert(/dropped=1/.test(t), `a [-] root must count as dropped: ${t}`);
  assert(/todo=1/.test(t), `only the [ ] root is todo, not every document: ${t}`);
});

test("the four root counts sum to count, so no document is reported twice", () => {
  const dir = makeRepo({
    commits: 1,
    tasks: {
      "001-a.md": root("001", "done", "x"),
      "002-b.md": root("002", "blocked", "!"),
      "003-c.md": root("003", "todo", " "),
      "004-d.md": root("004", "doing", ">"),
      "005-e.md": root("005", "dropped", "-"),
    },
  });
  const t = line(scan(dir).out, "tasks ");
  const n = (k) => Number((t.match(new RegExp(`\\b${k}=(\\d+)`)) ?? [, "-1"])[1]);
  assert(n("count") === 5, t);
  assert(n("todo") + n("done") + n("blocked") + n("dropped") + n("active") === 5,
    `the five root counts must sum to count, or a document is reported twice or not at all: ${t}`);
});

test("a repository whose default branch is master still reports merged branches", () => {
  const dir = makeRepo({ commits: 2, initialBranch: "master" });
  gitOut(dir, ["branch", "fix/one"]);
  gitOut(dir, ["branch", "fix/two"]);
  gitOut(dir, ["checkout", "--quiet", "-b", "work"]);
  const out = scan(dir).out;
  const t = line(out, "git     stale-branches");
  assert(t !== "", `two branches merged into master must be reported, not silently dropped:\n${out}`);
  assert(/fix\/one\(merged\)/.test(t), t);
  assert(/master/.test(t) === false, `the default branch is never its own stale branch: ${t}`);
});

test("when no default branch can be resolved the scan says so rather than guessing", () => {
  const dir = makeRepo({ commits: 1, initialBranch: "trunkish" });
  gitOut(dir, ["checkout", "--quiet", "-b", "work"]);
  const out = scan(dir).out;
  assert(/default branch/.test(line(out, "notes ")), `a note is owed when the base is unknown:\n${out}`);
});

test("a plain-bullet Unreleased section is not reported as empty", () => {
  const dir = makeRepo({
    commits: 1,
    changelog: "# Changelog\n\n## Unreleased\n\n- fixed the parser\n- added a flag\n\n## 1.0.0\n\n- first\n",
  });
  const c = line(scan(dir).out, "change ");
  assert(/unreleased=2-entries/.test(c), `entries need no bold lead-in to exist: ${c}`);
});

test("a bracketed Unreleased heading is noted rather than read as absent", () => {
  const dir = makeRepo({
    commits: 1,
    changelog: "# Changelog\n\n## [Unreleased]\n\n- fixed the parser\n",
  });
  const out = scan(dir).out;
  const c = line(out, "change ");
  assert(/unreleased=2-entries|unreleased=1-entries/.test(c), `Keep a Changelog's own heading must be read: ${c}`);
});

test("the latest tag is the repository's, not the nearest one reachable from HEAD", () => {
  const dir = makeRepo({ commits: 1 });
  gitOut(dir, ["tag", "v1.0.0"]);
  gitOut(dir, ["checkout", "--quiet", "-b", "feat"]);
  writeFileSync(join(dir, "x.txt"), "x\n");
  gitOut(dir, ["add", "."]);
  gitOut(dir, ["commit", "--quiet", "-m", "feature"]);
  gitOut(dir, ["checkout", "--quiet", "main"]);
  writeFileSync(join(dir, "y.txt"), "y\n");
  gitOut(dir, ["add", "."]);
  gitOut(dir, ["commit", "--quiet", "-m", "release"]);
  gitOut(dir, ["tag", "v1.1.0"]);
  gitOut(dir, ["checkout", "--quiet", "feat"]);
  writeFileSync(join(dir, "build.mk"), "VERSION := 1.1.0\n");
  const c = line(scan(dir).out, "change ");
  assert(/latest-tag=v1\.1\.0/.test(c), `a branch cut before the latest tag must not hide it: ${c}`);
  assert(/matches=no/.test(c) === false, `a spurious mismatch reaches the one channel allowed to interrupt: ${c}`);
});

test("an untagged repository reports no mismatch to interrupt about", () => {
  const dir = makeRepo({ commits: 1 });
  writeFileSync(join(dir, "build.mk"), "VERSION := 1.1.0\n");
  const c = line(scan(dir).out, "change ");
  assert(/latest-tag=none/.test(c), c);
  assert(/matches=/.test(c) === false, `nothing to compare is not a mismatch: ${c}`);
});

test("a long list of stale task documents is capped like the branch list", () => {
  const tasks = {};
  for (let i = 1; i <= 300; i++) {
    const n = String(i).padStart(3, "0");
    tasks[`${n}-doc.md`] = root(n, `work ${i}`, " ");
  }
  const dir = makeRepo({ commits: 1, tasks, staleDays: 40 });
  const out = scan(dir).out;
  const t = line(out, "tasks ");
  assert(/stale>14d=300\(/.test(t), `the count stays truthful: ${t}`);
  assert(/\+\d+ more/.test(t), `the list is cut, not the count: ${t}`);
  assert(t.length < 400, `one line must not carry three hundred ids (${t.length} bytes)`);
  assert(out.length <= 4096, `the whole report must fit the 4 KiB tool-output floor (${out.length} bytes)`);
});

test("a --project that does not exist says so instead of reading as empty", () => {
  const missing = join(tempDir("assist-gone-"), "nope");
  const r = scan(missing);
  assert(r.code === 0, `still exits 0: ${r.code}`);
  assert(/does not exist/.test(line(r.out, "notes ")), `an absent workspace is not an empty one:\n${r.out}`);
});

test("an unrecognised flag is refused rather than silently scanning the current directory", () => {
  const r = scan(null, ["--projetc=/tmp"]);
  assert(r.code === 2, `a typo must not quietly report a different workspace: exit ${r.code}\n${r.out}`);
  assert(/--projetc/.test(r.out), r.out);
});

test("no git binary is a note, not a claim that this is not a repository", () => {
  const dir = makeRepo({ commits: 1 });
  // A PATH holding node and nothing else: removing PATH entirely would stop
  // node itself resolving and prove nothing about the scan.
  const onlyNode = tempDir("assist-nogit-");
  symlinkSync(execFileSync("sh", ["-c", "command -v node"], { encoding: "utf8" }).trim(),
    join(onlyNode, "node"));
  const r = scan(dir, [], { ...process.env, PATH: onlyNode });
  const notes = line(r.out, "notes ");
  assert(r.code === 0, `still exits 0: ${r.code}`);
  assert(/git/.test(notes) && /not a git repository/.test(notes) === false,
    `a missing git binary must not be reported as a missing repository:\n${r.out}`);
});

test("hundreds of unreadable documents cannot blow the report past the tool-output floor", () => {
  const tasks = {};
  for (let i = 1; i <= 300; i++) {
    const n = String(i).padStart(3, "0");
    // No root line, so each one is named on notes rather than counted.
    tasks[`${n}-nameless-but-quite-a-long-slug-indeed.md`] = `# ${n} — a document\n\nprose only\n`;
  }
  const dir = makeRepo({ commits: 1, tasks });
  const out = scan(dir).out;
  assert(out.length <= 4096, `the report must fit the 4 KiB tool-output floor (${out.length} bytes)`);
  const notes = line(out, "notes ");
  assert(/\+\d+ more/.test(notes), `the notes list is cut, like every other list: ${notes.slice(0, 200)}`);
});
