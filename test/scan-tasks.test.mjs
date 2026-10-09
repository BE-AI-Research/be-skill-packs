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
