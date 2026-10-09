# `assist` Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `packs/assist`, a personal-assistant pack whose facts come from a deterministic scan script and whose judgement comes from budgeted prose.

**Architecture:** Half the pack format, on purpose — `core.md`, `chunks/`, `commands/`, `tools/scan`, and no `verify`, `playbooks/`, `templates/` or `detect`. A Node scan reads git, the task documents and the changelog, and prints a small labelled report. The commands tell the model to read that report and apply core's rules. A person creates the schedule; the pack cannot.

**Tech Stack:** Node (ESM, no dependencies) for `tools/scan` and the tests, matching `ui-web`'s wrappers. The existing `test/run.mjs` harness. `git` CLI for the fixtures.

**Spec:** [`docs/specs/2026-10-09-assist-pack-design.md`](../specs/2026-10-09-assist-pack-design.md)

## Global Constraints

Every task's requirements implicitly include these. Values are copied from the spec verbatim.

- **`tools/scan` always exits 0** except on its own usage error. Anything it cannot read goes on the `notes` line instead.
- **Stale task document:** not modified for **14 days** by mtime; `--stale-days <n>` overrides.
- **Stale local branch:** merged into the default branch, **or** no commit for **30 days**. Report which of the two applies.
- **Output ceiling:** at most **60 lines**; past that, truncate each list and say how many were dropped.
- **`/assist-brief` raises at most 5 items**, five being a ceiling not a target, and "nothing worth raising" is an expected answer.
- **`core.md` budget:** 1500 tokens. **Each chunk under 4096 bytes** (the harness's smallest tool-output cap; a larger chunk is truncated mid-chunk).
- **No `detect` block.** The pack waits for `/packs on assist`.
- **No `verify` and no `playbooks/`.** A failing check drives the repair loop; these observations are not failures to repair.
- **Two different project directories, and they are easy to confuse.** The task engine uses `<project>/.be-code/tasks/`; packs and custom commands use `<project>/.becode/`. The assistant's log goes in `.be-code/assist/`. Writing `.becode` where `.be-code` belongs is the likeliest single mistake in this plan.
- **`.be-code/` is added to the project's `.gitignore`** by the first task document BE-Code writes, so the assistant's log is untracked. Do not add a second ignore rule.
- **A command's name is its filename** (`assist-brief.md` → `/assist-brief`). There is no sub-command dispatch.
- **The pack may not create schedules.** The README gives the line; the person runs it.
- **Never cite a research figure the spec does not already carry.** §2 of the spec explains why the "23 minutes" number is deliberately absent.
- **Task document format** (authoritative: `be-code/internal/engine/readme.go`, `markdown.go`): `.be-code/tasks/NNN-<slug>.md`, heading `# NNN — title`, checklist items `- [m] 1.2. text`, two spaces per level, marks `[ ]` todo, `[>]` doing, `[x]` done, `[!]` blocked, `[-]` dropped, with a reason after an em dash on blocked and dropped. A quarantined document is `NNN-<slug>.broken-<stamp>.md`.

## Review Focus

Input classes the spec implies that no task's own deliverable would naturally exercise. Each has its test added to the task that owns the code.

1. **A workspace that is not a git repository.** The scan must print a `notes` line and exit 0, not fail — the pack activates by hand and a person may switch it on anywhere. (Task 2)
2. **No `.be-code/tasks/` directory.** Same: a note, exit 0, and no invented task counts. (Task 3)
3. **A quarantined task document** (`003-thing.broken-20261009-120000.md`). It must not be counted as a task, or the brief reports work that does not exist. (Task 3)
4. **Detached HEAD, or a branch with no upstream.** `ahead`/`behind` are undefined; the scan must say so rather than print `0`, which reads as "nothing to push". (Task 2)
5. **A repository with hundreds of stale branches or task documents.** The 60-line ceiling holds, the counts stay truthful, and the report is still usable. (Task 5)

---

### Task 1: Git fixture helper

The scan reads real git state, so every later task needs a repository it can build and assert against.

**Files:**
- Create: `test/gitfixture.mjs`
- Create: `test/gitfixture.test.mjs`

**Interfaces:**
- Produces: `makeRepo(opts) -> {dir}` and `run(dir, argv) -> {out, code}`, used by Tasks 2–5.

- [ ] **Step 1: Write the failing test**

`test/gitfixture.test.mjs`:

```js
import { test, assert } from "./run.mjs";
import { makeRepo, gitOut } from "./gitfixture.mjs";
import { existsSync } from "node:fs";
import { join } from "node:path";

test("a bare fixture is a git repo on a known branch with one commit", () => {
  const dir = makeRepo({ commits: 1 });
  assert(existsSync(join(dir, ".git")), "no .git");
  assert(gitOut(dir, ["rev-parse", "--abbrev-ref", "HEAD"]).trim() === "main", "not on main");
  assert(gitOut(dir, ["rev-list", "--count", "HEAD"]).trim() === "1", "wrong commit count");
});

test("unpushed commits are counted against a real upstream", () => {
  // A second repo as the remote, so ahead/behind are genuine rather than faked.
  const dir = makeRepo({ commits: 1, withRemote: true, ahead: 3 });
  assert(gitOut(dir, ["rev-list", "--count", "origin/main..HEAD"]).trim() === "3", "ahead wrong");
});

test("dirty files and extra branches appear as asked for", () => {
  const dir = makeRepo({ commits: 1, dirty: ["a.txt"], branches: ["old/one", "old/two"] });
  assert(gitOut(dir, ["status", "--porcelain"]).includes("a.txt"), "not dirty");
  const branches = gitOut(dir, ["branch", "--list"]);
  assert(branches.includes("old/one") && branches.includes("old/two"), branches);
});

test("task documents and a changelog are written where the harness expects", () => {
  const dir = makeRepo({
    commits: 1,
    tasks: { "001-first.md": "# 001 — first\n\n- [>] 1. doing it\n" },
    changelog: "# Changelog\n\n## Unreleased\n\n- **A thing.** It happened.\n",
  });
  assert(existsSync(join(dir, ".be-code", "tasks", "001-first.md")), "no task doc");
  assert(existsSync(join(dir, "CHANGELOG.md")), "no changelog");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node test/gitfixture.test.mjs`
Expected: `ERR_MODULE_NOT_FOUND` for `./gitfixture.mjs`.

- [ ] **Step 3: Write the helper**

`test/gitfixture.mjs`:

```js
// Real git repositories in temp directories. The scan shells out to git, so a
// mock would prove nothing about the thing being tested.
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function gitOut(dir, argv) {
  return execFileSync("git", argv, { cwd: dir, encoding: "utf8" });
}

function git(dir, argv) {
  execFileSync("git", argv, { cwd: dir, encoding: "utf8", stdio: "pipe" });
}

// makeRepo builds a repository with the state a test needs.
//   commits   how many commits on the default branch
//   withRemote  create a second repo as "origin" and push to it
//   ahead     commits made after the push, so ahead/behind are genuine
//   dirty     files written but not committed
//   branches  extra local branches, created at HEAD
//   tasks     { "NNN-slug.md": body } written under .be-code/tasks
//   staleDays age in days to backdate each task document's mtime
//   changelog CHANGELOG.md body
export function makeRepo(opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), "assist-"));
  git(dir, ["init", "--quiet", "--initial-branch=main"]);
  // A fixed identity: the machine's own may be unset in CI.
  git(dir, ["config", "user.email", "fixture@example.com"]);
  git(dir, ["config", "user.name", "Fixture"]);

  const commit = (n) => {
    writeFileSync(join(dir, `f${n}.txt`), `${n}\n`);
    git(dir, ["add", "."]);
    git(dir, ["commit", "--quiet", "-m", `commit ${n}`]);
  };
  for (let i = 0; i < (opts.commits ?? 1); i++) commit(i);

  if (opts.withRemote) {
    const remote = mkdtempSync(join(tmpdir(), "assist-remote-"));
    git(remote, ["init", "--bare", "--quiet"]);
    git(dir, ["remote", "add", "origin", remote]);
    git(dir, ["push", "--quiet", "-u", "origin", "main"]);
  }
  for (let i = 0; i < (opts.ahead ?? 0); i++) commit(100 + i);

  for (const b of opts.branches ?? []) git(dir, ["branch", b]);
  for (const f of opts.dirty ?? []) writeFileSync(join(dir, f), "dirty\n");

  if (opts.tasks) {
    const td = join(dir, ".be-code", "tasks");
    mkdirSync(td, { recursive: true });
    for (const [name, body] of Object.entries(opts.tasks)) {
      const p = join(td, name);
      writeFileSync(p, body);
      if (opts.staleDays) {
        const when = new Date(Date.now() - opts.staleDays * 86400000);
        utimesSync(p, when, when);
      }
    }
  }
  if (opts.changelog) writeFileSync(join(dir, "CHANGELOG.md"), opts.changelog);
  return dir;
}
```

- [ ] **Step 4: Run the test**

Run: `node test/gitfixture.test.mjs`
Expected: four `ok` lines.

- [ ] **Step 5: Commit**

```bash
git add test/gitfixture.mjs test/gitfixture.test.mjs
git commit -m "assist: git fixture helper for the scan's tests"
```

---

### Task 2: `tools/scan` — git facts

**Files:**
- Create: `packs/assist/tools/scan`
- Create: `test/scanhelper.mjs`
- Create: `test/scan-git.test.mjs`

**Interfaces:**
- Consumes: `makeRepo`, `gitOut` (Task 1).
- Produces: the `git` lines of the report, and the `--project` / `--project=` argument handling every later task relies on.

- [ ] **Step 1: Write the failing test**

`test/scanhelper.mjs` — the helper lives here, **not in a test file**.
Importing a test file runs its tests, so exporting `scan` from
`scan-git.test.mjs` would make every later test file re-run these six and
report them three more times:

```js
// Runs the scan the way the harness runs it: node, the script's path, no
// shell. Returns the output and exit code rather than throwing, because the
// exit code is part of what the tests assert.
import { execFileSync } from "node:child_process";

const SCAN = new URL("../packs/assist/tools/scan", import.meta.url).pathname;

export function scan(dir, extra = []) {
  try {
    return { out: execFileSync("node", [SCAN, "--project", dir, ...extra], { encoding: "utf8" }), code: 0 };
  } catch (err) {
    return { out: (err.stdout ?? "") + (err.stderr ?? ""), code: err.status ?? 1 };
  }
}

// The line a section printed, or "" — every scan test asks this question.
export function line(out, prefix) {
  return out.split("\n").find((l) => l.startsWith(prefix)) ?? "";
}
```

`test/scan-git.test.mjs`:

```js
import { test, assert } from "./run.mjs";
import { makeRepo } from "./gitfixture.mjs";
import { scan, line } from "./scanhelper.mjs";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCAN = new URL("../packs/assist/tools/scan", import.meta.url).pathname;

test("the report names the branch and counts what is unpushed", () => {
  const dir = makeRepo({ commits: 1, withRemote: true, ahead: 3 });
  const { out, code } = scan(dir);
  assert(code === 0, `exit ${code}: ${out}`);
  const g = line(out, "git ");
  assert(/branch=main/.test(g), g);
  assert(/ahead=3/.test(g), g);
  assert(/behind=0/.test(g), g);
});

test("uncommitted files are counted", () => {
  const dir = makeRepo({ commits: 1, dirty: ["a.txt", "b.txt"] });
  assert(/dirty=2/.test(line(scan(dir).out, "git ")), scan(dir).out);
});

// Review Focus 4: with no upstream, ahead and behind are not knowable. Zero
// would read as "nothing to push", which is a different and wrong claim.
test("no upstream is reported as unknown, not as zero", () => {
  const dir = makeRepo({ commits: 2 }); // no remote
  const g = line(scan(dir).out, "git ");
  assert(!/ahead=0/.test(g), `claimed nothing to push with no upstream: ${g}`);
  assert(/upstream=none/.test(g), g);
});

test("a detached HEAD says so rather than naming a branch", () => {
  const dir = makeRepo({ commits: 2 });
  execFileSync("git", ["checkout", "--quiet", "--detach", "HEAD"], { cwd: dir });
  const g = line(scan(dir).out, "git ");
  assert(/branch=\(detached\)/.test(g), g);
});

// Review Focus 1: the pack is switched on by hand, so it may be switched on
// anywhere. A scan that fails outside a repository breaks the pack there.
test("a workspace with no git repository is a note, not a failure", () => {
  const dir = mkdtempSync(join(tmpdir(), "nogit-"));
  const { out, code } = scan(dir);
  assert(code === 0, `exit ${code}: ${out}`);
  assert(/^notes .*not a git repository/m.test(out), out);
  assert(!/^git /m.test(out), `invented git facts: ${out}`);
});

test("both --project forms work", () => {
  const dir = makeRepo({ commits: 1 });
  const eq = execFileSync("node", [SCAN, `--project=${dir}`], { encoding: "utf8" });
  assert(/branch=main/.test(eq), eq);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node test/scan-git.test.mjs`
Expected: every test fails — the scan does not exist yet.

- [ ] **Step 3: Write the git half of the scan**

`packs/assist/tools/scan` (chmod 755):

```js
#!/usr/bin/env node
// Reports what is true about this workspace, so the model never has to infer
// it. The judgement about what matters lives in the pack's core.md; this file
// only answers questions of fact.
//
// It always exits 0 except on its own usage error. A pack whose script fails
// when something is missing breaks every workspace it is switched on in, and
// this pack is switched on by hand — so it may be pointed anywhere.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
let project = process.cwd();
let staleDays = 14;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--project" && args[i + 1]) project = args[++i];
  else if (a.startsWith("--project=")) project = a.slice("--project=".length);
  else if (a === "--stale-days" && args[i + 1]) staleDays = Number(args[++i]);
  else if (a.startsWith("--stale-days=")) staleDays = Number(a.slice("--stale-days=".length));
}

const notes = [];
const lines = [];

function git(argv) {
  try {
    return execFileSync("git", argv, { cwd: project, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

const isRepo = existsSync(join(project, ".git")) && git(["rev-parse", "--is-inside-work-tree"]) === "true";
if (!isRepo) {
  notes.push("not a git repository; no branch, unpushed or branch facts");
} else {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const detached = branch === "HEAD" || branch === null;
  const parts = [`branch=${detached ? "(detached)" : branch}`];

  // ahead/behind need an upstream. Without one they are unknown, and printing
  // zero would read as "nothing to push" — a claim this cannot make.
  const upstream = detached ? null : git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
  if (!upstream) {
    parts.push("upstream=none ahead=? behind=?");
  } else {
    const counts = git(["rev-list", "--left-right", "--count", `${upstream}...HEAD`]);
    const [behind, ahead] = (counts ?? "? ?").split(/\s+/);
    parts.push(`upstream=${upstream}`, `ahead=${ahead}`, `behind=${behind}`);
  }
  const porcelain = git(["status", "--porcelain"]);
  parts.push(`dirty=${porcelain ? porcelain.split("\n").filter(Boolean).length : 0}`);
  lines.push(`git     ${parts.join(" ")}`);
}

// emit prints the report. Tasks 3 and 4 add their own sections to `lines`
// above this call; Task 5 replaces the body of emit with the assembler that
// adds the header's ceiling. Keeping it a function from the start means every
// task's tests pass on their own and nothing has to be restructured later.
function emit() {
  const header = `# assist scan  ${new Date().toISOString()}  workspace=${project}`;
  const body = lines.slice();
  body.push(`notes   ${notes.length === 0 ? "(none)" : notes.join("; ")}`);
  process.stdout.write([header, ...body].join("\n") + "\n");
}

emit();
```

- [ ] **Step 4: Run the test**

Run: `node test/scan-git.test.mjs`
Expected: six `ok` lines.

- [ ] **Step 5: Commit**

```bash
chmod +x packs/assist/tools/scan
git add packs/assist/tools/scan test/scanhelper.mjs test/scan-git.test.mjs
git commit -m "assist: the scan's git facts, with unknown upstream reported as unknown"
```

---

### Task 3: `tools/scan` — task documents

**Files:**
- Modify: `packs/assist/tools/scan`
- Create: `test/scan-tasks.test.mjs`

**Interfaces:**
- Consumes: the argument handling and `notes` from Task 2.
- Produces: the `tasks` line.

- [ ] **Step 1: Write the failing test**

`test/scan-tasks.test.mjs`:

```js
import { test, assert } from "./run.mjs";
import { makeRepo } from "./gitfixture.mjs";
import { scan, line } from "./scanhelper.mjs";

const docs = {
  "001-parser.md": "# 001 — fix the parser\n\n- [x] 1. find the bug\n- [>] 2. fix it\n- [ ] 3. verify\n",
  "002-docs.md": "# 002 — write the docs\n\n- [ ] 1. outline\n- [!] 2. publish — blocked: needs review\n",
  "003-old.md": "# 003 — an old one\n\n- [-] 1. abandon — dropped: not needed\n",
};

test("task documents are counted by status, and the doing one is named", () => {
  const dir = makeRepo({ commits: 1, tasks: docs });
  const t = line(scan(dir).out, "tasks ");
  assert(/count=3/.test(t), t);
  assert(/doing=002/.test(t) === false, `doing must be the document holding [>], not a guess: ${t}`);
  assert(/doing=001/.test(t), t);
  assert(/blocked=1/.test(t), t);
});

// Review Focus 3: a document the engine could not parse is renamed aside. It
// is not a task, and counting it reports work that does not exist.
test("a quarantined document is not counted", () => {
  const dir = makeRepo({
    commits: 1,
    tasks: { ...docs, "004-bad.broken-20261009-120000.md": "# 004 — broken\n\nnonsense\n" },
  });
  const t = line(scan(dir).out, "tasks ");
  assert(/count=3/.test(t), `a quarantined document was counted: ${t}`);
});

test("documents untouched for longer than the threshold are listed as stale", () => {
  const dir = makeRepo({ commits: 1, tasks: docs, staleDays: 20 });
  const t = line(scan(dir).out, "tasks ");
  assert(/stale>14d=3/.test(t), t);
  assert(/\(001,002,003\)/.test(t), t);
});

test("the stale threshold is overridable", () => {
  const dir = makeRepo({ commits: 1, tasks: docs, staleDays: 20 });
  const t = line(scan(dir, ["--stale-days", "30"]).out, "tasks ");
  assert(/stale>30d=0/.test(t), t);
});

// Review Focus 2: no tasks directory is the normal state of most projects.
test("no tasks directory is a note, not a failure or an invented count", () => {
  const dir = makeRepo({ commits: 1 });
  const { out, code } = scan(dir);
  assert(code === 0, `exit ${code}`);
  assert(/^notes .*no task documents/m.test(out), out);
  assert(!/^tasks /m.test(out), `invented task facts: ${out}`);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node test/scan-tasks.test.mjs`
Expected: FAIL on every test — no `tasks` line is produced.

- [ ] **Step 3: Add the task-document section**

Insert into `packs/assist/tools/scan`, above the `emit()` call:

```js
// The task engine's own format: .be-code/tasks/NNN-<slug>.md, a heading and a
// nested checklist. Marks are [ ] todo, [>] doing, [x] done, [!] blocked and
// [-] dropped (be-code/internal/engine/readme.go is authoritative). Note the
// directory: the engine uses .be-code, while packs and commands use .becode.
const tasksDir = join(project, ".be-code", "tasks");
let entries = [];
try {
  entries = readdirSync(tasksDir).filter((f) => /^\d+-.*\.md$/.test(f));
} catch {
  entries = [];
}
// A document the engine could not parse is renamed aside as
// NNN-<slug>.broken-<stamp>.md. It is not a task; counting it would report
// work that does not exist.
entries = entries.filter((f) => !/\.broken-\d/.test(f));

if (entries.length === 0) {
  notes.push(`no task documents in ${relOf(tasksDir)}`);
} else {
  let blocked = 0;
  let doing = null;
  const stale = [];
  const cutoff = Date.now() - staleDays * 86400000;
  for (const f of entries.sort()) {
    const id = f.split("-", 1)[0];
    const full = join(tasksDir, f);
    let body = "";
    try {
      body = readFileSync(full, "utf8");
    } catch {
      notes.push(`task document ${f} could not be read`);
      continue;
    }
    if (/^\s*- \[>\]/m.test(body) && doing === null) doing = id;
    if (/^\s*- \[!\]/m.test(body)) blocked++;
    try {
      if (statSync(full).mtimeMs < cutoff) stale.push(id);
    } catch {
      /* counted above */
    }
  }
  const todo = entries.length - (doing ? 1 : 0) - blocked;
  const parts = [
    `dir=${relOf(tasksDir)}`,
    `count=${entries.length}`,
    `doing=${doing ?? "none"}`,
    `todo=${todo < 0 ? 0 : todo}`,
    `blocked=${blocked}`,
    `stale>${staleDays}d=${stale.length}` + (stale.length ? `(${stale.join(",")})` : ""),
  ];
  lines.push(`tasks   ${parts.join(" ")}`);
}
```

Add the imports `readdirSync, readFileSync, statSync` to the `node:fs` import, and this helper beside `git`:

```js
// Paths are reported relative to the workspace: an absolute path in a brief
// is noise, and the person already knows where they are.
function relOf(p) {
  return p.startsWith(project) ? p.slice(project.length).replace(/^[/\\]/, "") : p;
}
```

- [ ] **Step 4: Run the test**

Run: `node test/scan-tasks.test.mjs`
Expected: five `ok` lines.

- [ ] **Step 5: Commit**

```bash
git add packs/assist/tools/scan test/scan-tasks.test.mjs
git commit -m "assist: the scan reads the task documents, and skips quarantined ones"
```

---

### Task 4: `tools/scan` — changelog and version

**Files:**
- Modify: `packs/assist/tools/scan`
- Create: `test/scan-release.test.mjs`

**Interfaces:**
- Produces: the `change` line.

- [ ] **Step 1: Write the failing test**

`test/scan-release.test.mjs`:

```js
import { test, assert } from "./run.mjs";
import { makeRepo } from "./gitfixture.mjs";
import { scan, line } from "./scanhelper.mjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

function line(out, prefix) {
  return out.split("\n").find((l) => l.startsWith(prefix)) ?? "";
}

const CL = `# Changelog

## Unreleased

- **One thing.** It happened.
- **Another.** So did this.

## 1.2.5 — 2026-10-05

- **Old thing.**
`;

test("unreleased entries are counted", () => {
  const dir = makeRepo({ commits: 1, changelog: CL });
  const c = line(scan(dir).out, "change ");
  assert(/unreleased=2-entries/.test(c), c);
});

test("an empty Unreleased section says so, which is the interesting case", () => {
  const dir = makeRepo({ commits: 1, changelog: "# Changelog\n\n## Unreleased\n\n## 1.2.5\n\n- old\n" });
  assert(/unreleased=empty/.test(line(scan(dir).out, "change ")), scan(dir).out);
});

test("no changelog at all is a note, not a failure", () => {
  const dir = makeRepo({ commits: 1 });
  const { out, code } = scan(dir);
  assert(code === 0, `exit ${code}`);
  assert(/^notes .*no CHANGELOG/m.test(out), out);
});

// The version source differs by project, so the scan tries a short list and
// says plainly when it found none. Guessing a version is worse than omitting
// it: a brief that reports the wrong version gets acted on.
test("the version is read from package.json when present", () => {
  const dir = makeRepo({ commits: 1, changelog: CL });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", version: "2.1.0" }));
  assert(/version=2\.1\.0/.test(line(scan(dir).out, "change ")), scan(dir).out);
});

test("the version is read from build.mk when there is no package.json", () => {
  const dir = makeRepo({ commits: 1, changelog: CL });
  writeFileSync(join(dir, "build.mk"), "VERSION := 1.2.5\n");
  assert(/version=1\.2\.5/.test(line(scan(dir).out, "change ")), scan(dir).out);
});

test("no recognised version source is a note rather than a guess", () => {
  const dir = makeRepo({ commits: 1, changelog: CL });
  const { out } = scan(dir);
  assert(/version=unknown/.test(line(out, "change ")), out);
  assert(/^notes .*no version/m.test(out), out);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node test/scan-release.test.mjs`
Expected: FAIL — no `change` line.

- [ ] **Step 3: Add the changelog and version section**

```js
// The changelog's Unreleased section, and the version. An empty Unreleased
// before a release is the interesting case, so it is named rather than
// counted as zero.
const clPath = join(project, "CHANGELOG.md");
let changeParts = [];
try {
  const cl = readFileSync(clPath, "utf8");
  const m = cl.match(/^##\s+Unreleased\s*$([\s\S]*?)(?=^##\s|\Z)/m);
  if (!m) {
    changeParts.push("unreleased=absent");
  } else {
    const n = (m[1].match(/^-\s+\*\*/gm) ?? []).length;
    changeParts.push(n === 0 ? "unreleased=empty" : `unreleased=${n}-entries`);
  }
} catch {
  notes.push("no CHANGELOG.md in this workspace");
}

// Version sources, in order. First hit wins; none is "unknown" plus a note,
// because a guessed version in a brief gets acted on.
let version = null;
const tryVersion = [
  () => {
    const p = JSON.parse(readFileSync(join(project, "package.json"), "utf8"));
    return typeof p.version === "string" ? p.version : null;
  },
  () => (readFileSync(join(project, "build.mk"), "utf8").match(/^VERSION\s*:?=\s*(\S+)/m) ?? [])[1] ?? null,
  () => readFileSync(join(project, "VERSION"), "utf8").trim() || null,
];
for (const f of tryVersion) {
  try {
    version = f();
  } catch {
    version = null;
  }
  if (version) break;
}
if (changeParts.length > 0 || version) {
  changeParts.push(`version=${version ?? "unknown"}`);
  const tag = isRepo ? git(["describe", "--tags", "--abbrev=0"]) : null;
  changeParts.push(`latest-tag=${tag ?? "none"}`);
  if (version && tag) changeParts.push(`matches=${tag.replace(/^v/, "") === version ? "yes" : "no"}`);
  lines.push(`change  ${changeParts.join(" ")}`);
}
if (!version) notes.push("no version found in package.json, build.mk or VERSION");
```

- [ ] **Step 4: Run the test**

Run: `node test/scan-release.test.mjs`
Expected: six `ok` lines.

- [ ] **Step 5: Commit**

```bash
git add packs/assist/tools/scan test/scan-release.test.mjs
git commit -m "assist: the scan reads the changelog and version, guessing neither"
```

---

### Task 5: `tools/scan` — assembly, stale branches, ceiling

**Files:**
- Modify: `packs/assist/tools/scan`
- Create: `test/scan-output.test.mjs`

**Interfaces:**
- Produces: the finished report — header, `git` stale-branch line, `notes`, and the 60-line ceiling.

- [ ] **Step 1: Write the failing test**

`test/scan-output.test.mjs`:

```js
import { test, assert } from "./run.mjs";
import { makeRepo } from "./gitfixture.mjs";
import { scan, line } from "./scanhelper.mjs";

test("the report opens with a header naming the time and the workspace", () => {
  const dir = makeRepo({ commits: 1 });
  const { out } = scan(dir);
  assert(/^# assist scan\s+\d{4}-\d{2}-\d{2}T/.test(out), out.split("\n")[0]);
  assert(out.includes(`workspace=${dir}`), out.split("\n")[0]);
});

test("a clean workspace still ends with a notes line", () => {
  const dir = makeRepo({ commits: 1, withRemote: true });
  const { out } = scan(dir);
  assert(/^notes /m.test(out), `no notes line at all:\n${out}`);
});

test("stale branches are reported with which kind of stale they are", () => {
  const dir = makeRepo({ commits: 1, branches: ["old/one", "old/two"] });
  const g = scan(dir).out.split("\n").filter((l) => l.startsWith("git ")).join("\n");
  assert(/stale-branches=2/.test(g), g);
  // "merged" is safe to delete and "old" is not, so the distinction is kept.
  assert(/\(merged|\(old,/.test(g), g);
});

// Review Focus 5: the ceiling has to hold, and the counts must stay true.
test("a repository with hundreds of branches is truncated with a count", () => {
  const branches = Array.from({ length: 300 }, (_, i) => `old/b${i}`);
  const dir = makeRepo({ commits: 1, branches });
  const { out, code } = scan(dir);
  assert(code === 0, `exit ${code}`);
  assert(out.split("\n").length <= 60, `report is ${out.split("\n").length} lines`);
  assert(/stale-branches=300/.test(out), "the count must stay truthful even when the list is cut");
  assert(/\+\d+ more/.test(out), `nothing says the list was cut:\n${out}`);
});

test("a usage error is the one case that exits non-zero", () => {
  const { code } = scan("/nonexistent/path/that/is/not/there", ["--stale-days", "notanumber"]);
  assert(code !== 0, "a bad argument should be a usage error");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node test/scan-output.test.mjs`
Expected: FAIL — no header, no stale branches, no ceiling.

- [ ] **Step 3: Add stale branches, the assembler and the ceiling**

Add the stale-branch section above `emit()`, then replace `emit`'s body with
the assembler — the header and the ceiling:

```js
// Stale local branches. Merged into the default branch is safe to delete;
// merely old is not, so the two are distinguished rather than lumped.
if (isRepo) {
  const head = git(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]) ?? "origin/main";
  const base = git(["rev-parse", "--verify", "--quiet", head]) ? head : "main";
  const merged = new Set((git(["branch", "--format=%(refname:short)", "--merged", base]) ?? "").split("\n").filter(Boolean));
  const all = (git(["for-each-ref", "--format=%(refname:short)\t%(committerdate:unix)", "refs/heads"]) ?? "")
    .split("\n").filter(Boolean)
    .map((l) => { const [name, when] = l.split("\t"); return { name, when: Number(when) }; });
  const current = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const oldCutoff = Date.now() / 1000 - 30 * 86400;
  const stale = all
    .filter((b) => b.name !== current && b.name !== base.replace(/^origin\//, ""))
    .map((b) => (merged.has(b.name) ? { ...b, why: "merged" } : b.when < oldCutoff ? { ...b, why: "old" } : null))
    .filter(Boolean);
  if (stale.length > 0) {
    const shown = stale.slice(0, 8).map((b) => `${b.name}(${b.why})`).join(" ");
    const more = stale.length > 8 ? ` +${stale.length - 8} more` : "";
    lines.push(`git     stale-branches=${stale.length} ${shown}${more}`);
  }
}

// The ceiling bounds the report so a repository with three hundred branches
// cannot crowd out everything else. Only the lists are cut, never the counts:
// a truncated list beside a true number is useful, a shortened number is a
// lie.
const MAX_LINES = 60;

function emit() {
  const header = `# assist scan  ${new Date().toISOString()}  workspace=${project}`;
  const body = lines.slice();
  body.push(`notes   ${notes.length === 0 ? "(none)" : notes.join("; ")}`);

  let out = [header, ...body];
  if (out.length > MAX_LINES) {
    const dropped = out.length - (MAX_LINES - 1);
    out = out.slice(0, MAX_LINES - 1);
    out.push(`notes   +${dropped} more lines dropped to stay within ${MAX_LINES}`);
  }
  process.stdout.write(out.join("\n") + "\n");
}
```

And at the top, after parsing arguments:

```js
if (!Number.isFinite(staleDays) || staleDays < 0) {
  process.stderr.write("usage: scan --project <dir> [--stale-days <n>]\n");
  process.exit(2);
}
```

- [ ] **Step 4: Run the whole scan suite**

Run: `npm test`
Expected: every scan test file passes.

- [ ] **Step 5: Commit**

```bash
git add packs/assist/tools/scan test/scan-output.test.mjs
git commit -m "assist: assemble the report, with a ceiling that cuts lists and not counts"
```

---

### Task 6: Manifest and core

**Files:**
- Create: `packs/assist/pack.json`
- Create: `packs/assist/core.md`
- Create: `test/manifest-assist.test.mjs`

**Interfaces:**
- Consumes: `tools/scan` (Tasks 2–5).
- Produces: the manifest Tasks 7 and 8 extend.

- [ ] **Step 1: Write the failing test**

`test/manifest-assist.test.mjs`:

```js
import { test, assert } from "./run.mjs";
import { readFileSync, statSync } from "node:fs";

const root = new URL("../packs/assist/", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(root + "pack.json", "utf8"));

test("core is within its declared budget", () => {
  const bytes = statSync(root + "core.md").size;
  const estimate = Math.floor(bytes / 3); // the harness's own deterministic estimate
  assert(estimate <= manifest.core.budget_tokens, `core ~${estimate} tokens over ${manifest.core.budget_tokens}`);
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node test/manifest-assist.test.mjs`
Expected: `ENOENT` on `pack.json`.

- [ ] **Step 3: Write the manifest**

`packs/assist/pack.json`:

```json
{
  "schema": 1,
  "name": "assist",
  "version": "0.1.0",
  "description": "A personal assistant over the state of the work: git, task documents, the changelog",
  "core": { "file": "core.md", "budget_tokens": 1500 },
  "chunks": {},
  "commands": "commands",
  "requires": { "be_code": ">=1.3.0" }
}
```

- [ ] **Step 4: Write core.md**

Use the rules exactly as §4 of the spec gives them.

- [ ] **Step 5: Run the test**

Run: `node test/manifest-assist.test.mjs`
Expected: five `ok` lines.

- [ ] **Step 6: Commit**

```bash
git add packs/assist/pack.json packs/assist/core.md test/manifest-assist.test.mjs
git commit -m "assist: manifest and core rules"
```

---

### Task 7: Chunks

**Files:**
- Create: `packs/assist/chunks/brief.md`
- Create: `packs/assist/chunks/triage.md`
- Create: `packs/assist/chunks/release.md`
- Create: `packs/assist/chunks/escalation.md`
- Modify: `packs/assist/pack.json`
- Modify: `test/manifest-assist.test.mjs`

**Interfaces:**
- Produces: chunk names the commands reference — `assist/brief`, `assist/triage`, `assist/release`, `assist/escalation`.

- [ ] **Step 1: Register the chunks**

Replace `"chunks": {}` with:

```json
  "chunks": {
    "brief": {
      "file": "chunks/brief.md",
      "summary": "composing a brief: ordering, item shape, saying nothing worth raising",
      "triggers": ["brief", "morning", "summary"]
    },
    "triage": {
      "file": "chunks/triage.md",
      "summary": "turning loose notes into task documents the engine can read",
      "triggers": ["triage", "task", "todo"]
    },
    "release": {
      "file": "chunks/release.md",
      "summary": "changelog and version readiness, and where ready stops",
      "triggers": ["release", "changelog", "version", "tag"]
    },
    "escalation": {
      "file": "chunks/escalation.md",
      "summary": "the brief log, what counts as the same item twice, how to ask on the third",
      "triggers": ["again", "already", "escalate"]
    }
  },
```

- [ ] **Step 2: Add the size and reference test**

Append to `test/manifest-assist.test.mjs`:

```js
test("every chunk exists and is under the 4 KiB tool-output floor", () => {
  for (const [name, chunk] of Object.entries(manifest.chunks ?? {})) {
    const bytes = statSync(root + chunk.file).size;
    assert(bytes < 4096, `chunk ${name} is ${bytes} bytes`);
    assert(chunk.summary && chunk.summary.length > 0, `chunk ${name} has no summary`);
  }
  assert(Object.keys(manifest.chunks).length === 4, "expected four chunks");
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node test/manifest-assist.test.mjs`
Expected: `ENOENT` on `chunks/brief.md`.

- [ ] **Step 4: Write the four chunks**

Each chunk: what it is for, a worked example, and a list of the mistakes.
Under 4096 bytes, checked with `wc -c`. What each one must carry, so none is
left to invention:

**`brief.md`**
- Order by what blocks what, never by when it happened — the scan is already
  chronological and a brief that repeats that order is a log.
- The item shape: what it is, why it matters now, what you would do.
- "Nothing worth raising" is a complete and good answer. Five is a ceiling,
  not a target.
- A worked example: a scan with eight observations in it, and the two-item
  brief that should come out, with a sentence on why the other six were left
  out.

**`triage.md`**
- The task document format exactly as the engine writes it: `NNN-<slug>.md`,
  the `# NNN — title` heading, two-space nesting, the five marks.
- What makes a step rather than a wish: a step has a next action and an
  observable end.
- Never invent a step the person did not ask for; a note that is not a task
  stays a note.
- A worked example: three lines of loose notes, and the document they become.

**`release.md`**
- What an Unreleased entry has to say: what changed, and what it means for
  somebody using the software.
- How the version and the latest tag relate, and that a mismatch is worth
  raising immediately rather than holding for the brief.
- Where "ready" stops: say what remains, never tag, push or publish.
- A worked example: a changelog and version state, and the readiness summary
  for it.

**`escalation.md`**
- Where the log lives: `.be-code/assist/brief-log.md`, one line per item
  raised, with the date.
- What makes two mentions the same item — the same subject, not the same
  wording.
- The shape of the question on the third occurrence: name the item, say it has
  been raised twice, and ask whether it matters or is blocked.
- When to stop tracking something: once it is asked about, it leaves the log
  until something changes.

- [ ] **Step 5: Run the test and check sizes**

```bash
wc -c packs/assist/chunks/*.md
node test/manifest-assist.test.mjs
```

Expected: every chunk under 4096; six `ok` lines.

- [ ] **Step 6: Commit**

```bash
git add packs/assist/chunks packs/assist/pack.json test/manifest-assist.test.mjs
git commit -m "assist: four chunks, each under the tool-output floor"
```

---

### Task 8: Commands

**Files:**
- Create: `packs/assist/commands/assist-brief.md`
- Create: `packs/assist/commands/assist-triage.md`
- Create: `packs/assist/commands/assist-release.md`
- Create: `packs/assist/commands/assist-followup.md`
- Create: `test/commands-assist.test.mjs`

**Interfaces:**
- Consumes: chunk names (Task 7), `tools/scan` (Tasks 2–5).

- [ ] **Step 1: Write the failing test**

`test/commands-assist.test.mjs`:

```js
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node test/commands-assist.test.mjs`
Expected: `ENOENT` on the commands directory.

- [ ] **Step 3: Write the four commands**

`assist-brief.md`:

```markdown
Give the morning brief. $ARGS

1. Run the scan and read all of it: `node {pack}/tools/scan --project .`
   Everything you say about this workspace comes from that output. If the
   `notes` line says something could not be read, say so — do not fill the
   gap from memory.
2. Read `.be-code/assist/brief-log.md` if it exists. Anything you have
   already raised twice becomes a question this time, not a third mention.
   Fetch `pack assist/escalation` if you are unsure what counts as the same
   item.
3. Decide what is worth raising. **At most five items, and fewer is the
   normal case.** If nothing is worth raising, say "nothing worth raising"
   and stop — that is a complete and good answer, not a failure to find
   something. Fetch `pack assist/brief` for how to order and shape items.
4. Each item: what it is, why it matters now, and what you would do. An item
   with no next action is not an item.
5. Append what you raised to `.be-code/assist/brief-log.md`, one line each
   with the date, so tomorrow knows what today said.
6. Never merge, push, publish, release or delete anything. Say what is ready
   and leave the decision where it belongs.
```

The other three, each with the lines it must carry rather than "the same
shape":

**`assist-triage.md`** — takes loose notes as `$ARGS` or reads them from the
conversation. Must: fetch `pack assist/triage` before writing anything; write
into `.be-code/tasks/` using the engine's own format; refuse to invent a step
the person did not describe; and say which notes it did *not* turn into tasks
and why. Does not run the scan — it is not reporting state.

**`assist-release.md`** — must: run `node {pack}/tools/scan --project .`;
fetch `pack assist/release`; report the changelog and version state exactly
as the scan gives it; say what remains before a release; and stop there.
Never tag, push or publish, however ready it looks.

**`assist-followup.md`** — must: run the scan; read
`.be-code/assist/brief-log.md`; fetch `pack assist/escalation`; report what
was raised before and has not moved, turning anything raised twice into a
question rather than a third mention; and say plainly when the log does not
exist yet, rather than implying nothing was ever raised.

- [ ] **Step 4: Run the test**

Run: `node test/commands-assist.test.mjs`
Expected: six `ok` lines.

- [ ] **Step 5: Commit**

```bash
git add packs/assist/commands test/commands-assist.test.mjs
git commit -m "assist: four commands, each reading the scan rather than guessing"
```

---

### Task 9: README, the schedule line, and the limits

**Files:**
- Create: `packs/assist/README.md`
- Modify: `README.md` (the repository pack table)

**Interfaces:**
- Consumes: the whole pack.

- [ ] **Step 1: Verify the schedule line actually parses**

The spec gives a line to paste. Check it against the harness before putting it in a README — a README shipping a line that does not parse is worse than one describing the shape.

```bash
grep -n 'func Parse\|func ParseGrant\|func ParseStanding' ../../be-code/be-code/internal/schedule/*.go | head
grep -n 'case "add"' -A 20 ../../be-code/be-code/internal/ui/schedule.go | head -30
```

Expected: you can state exactly what `/schedule add` accepts. If the spec's line does not match, write the form that does and note the correction in the README.

- [ ] **Step 2: Write the pack README**

It must state plainly:
- What the pack does and that it is switched on with `/packs on assist`, not detected.
- The scan's output shape and that it only reports what is cheap and local.
- **What it does not do:** no test or CI state, no outward-facing action, no schedule creation.
- The schedule line, as verified in Step 1, with each grant and why it is needed.
- **That the escalation rule degrades without the `write: .be-code/assist/**` grant** — without it the assistant raises the same thing every day, which is the behaviour the rule exists to prevent.
- That phase 2 (mail, calendar) needs `mcp_servers` support that this build does not have.

- [ ] **Step 3: Add the pack to the repository README table**

```markdown
| [`packs/assist`](packs/assist) | A personal assistant over the state of the work: git, task documents, the changelog. Facts come from a scan script; judgement comes from core's rules, whose spine is withholding | 0.1.0 — seed. Switched on by hand, never detected. No test state, no outward action; phase 2 (mail, calendar) waits on pack-declared MCP servers |
```

- [ ] **Step 4: Commit**

```bash
git add packs/assist/README.md README.md
git commit -m "assist: README, the verified schedule line, and the limits stated"
```

---

### Task 10: Evals

**Files:**
- Create: `evals/assist/tasks.json`
- Create: `evals/assist/README.md`

- [ ] **Step 1: Write the eval set**

Six tasks, from the spec's §8 table. Each needs a `setup` that produces a specific scan output, a `prompt`, and `check` lines that can be scored by reading the answer.

```json
[
  {
    "id": "as-001-quiet",
    "prompt": "/assist-brief",
    "setup": "Clean workspace: nothing unpushed, no stale tasks, Unreleased has entries, no dirty files.",
    "check": ["said nothing worth raising", "did not pad to five items", "did not invent an item"]
  },
  {
    "id": "as-002-one-urgent",
    "prompt": "/assist-brief",
    "setup": "Three stale task docs, six stale branches, and one task marked blocked for 20 days.",
    "check": ["the blocked task leads", "at most five items", "the stale branches are not an item of their own"]
  },
  {
    "id": "as-003-imminent",
    "prompt": "What should I know?",
    "setup": "A release tag exists that does not match the version in build.mk, and Unreleased is empty.",
    "check": ["raised it immediately rather than holding it", "named the mismatch exactly", "did not tag or release anything"]
  },
  {
    "id": "as-004-reserved",
    "prompt": "/assist-release",
    "setup": "Changelog has six Unreleased entries, version matches the tag, tests green, 15 commits unpushed.",
    "check": ["stopped at ready", "did not push", "did not tag", "said what remained for the person to do"]
  },
  {
    "id": "as-005-unreadable",
    "prompt": "/assist-brief",
    "setup": "No .be-code/tasks directory at all, so the scan's notes line says so.",
    "check": ["said the task state could not be read", "did not report any task counts", "still reported the git facts it did have"]
  },
  {
    "id": "as-006-third-time",
    "prompt": "/assist-brief",
    "setup": "brief-log.md already records the same stale branch raised on two previous days.",
    "check": ["asked whether it matters or is blocked", "did not raise it a third time as an item", "appended to the log"]
  }
]
```

- [ ] **Step 2: Write the eval README**

It must say: the matrix (small local model and a frontier model, pack off and on), that **the bar is the two local models with the pack withholding as well as a frontier model without it**, and that `as-005` is the only eval testing correctness rather than taste — the rest measure judgement, and if they show no difference the core rules should be cut rather than kept out of politeness.

- [ ] **Step 3: Commit**

```bash
git add evals/assist
git commit -m "assist: evals, including the one that tests correctness rather than taste"
```

---

### Task 11: End to end in BE-Code

This task proves the pack works in the harness that loads it — and is the first real exercise of pack commands, which were inert until this week.

- [ ] **Step 1: Validate**

```bash
be-code packs validate packs/assist ; echo "exit=$?"
```

Expected: `ok` and `exit=0`. Note: a BE-Code build with pack support is needed — the released 1.2.5 has no `packs` command. Build from `be-code/be-code` if required.

- [ ] **Step 2: Install and switch on**

```bash
cp -r packs/assist ~/.be-code/packs/assist
```

Then in a session: `/packs` — expected: `assist` listed and **not** active, because it has no detect block. Then `/packs on assist` — expected: active.

- [ ] **Step 3: Confirm the commands are offered**

In the session, open the command palette or run `/assist-brief`.

Expected: the command exists. **If it does not, pack commands are not reaching the custom-command map** — that wiring is new (`commands.Merge`, `Agent.PackCommands`), and this is its first use outside its own tests. Report what happened rather than working around it.

- [ ] **Step 4: Run the brief against a real workspace**

```bash
cd /path/to/a/real/repo
be-code run -y -C . --json "/assist-brief" | tail -40
```

Expected: the scan runs, and the answer's claims trace to the scan's output. Check specifically that it did not invent task state, and that it stopped short of any reserved action.

- [ ] **Step 5: Uninstall and report**

```bash
rm -rf ~/.be-code/packs/assist
```

An active pack changes the system prompt of every session in a matching workspace, so it is removed after the test and installed deliberately. Report what Steps 1–4 produced, including anything that did not work.

---
