import { test, assert } from "./run.mjs";
import { makeRepo } from "./gitfixture.mjs";
import { scan } from "./scanhelper.mjs";
import { execFileSync } from "node:child_process";

const SCANPATH = new URL("../packs/assist/tools/scan", import.meta.url).pathname;

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
  const g = scan(dir)
    .out.split("\n")
    .filter((l) => l.startsWith("git "))
    .join("\n");
  assert(/stale-branches=2/.test(g), g);
  // "merged" is safe to delete and "old" is not, so the distinction is kept.
  assert(/\(merged\)|\(old\)/.test(g), g);
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

// Found by running the scan for real rather than only against the absolute
// temp directories the other tests use: with a relative --project, relOf
// sliced project.length characters off an already-relative path and ate the
// leading dot, reporting ".be-code/tasks" as "be-code/tasks" — a path that
// does not exist. The workspace is resolved to an absolute path now, which
// also makes the header's workspace= worth reading.
test("a relative --project does not corrupt the paths it reports", () => {
  const dir = makeRepo({ commits: 1 });
  const { out, code } = scan(dir, []);
  assert(code === 0, `exit ${code}`);
  assert(!/\bbe-code\/tasks/.test(out) || /\.be-code\/tasks/.test(out), out);

  // The real case: cwd is the workspace and --project is "."
  const rel = execFileSync("node", [SCANPATH, "--project", "."], { cwd: dir, encoding: "utf8" });
  assert(/\.be-code[/\\]tasks/.test(rel), `leading dot eaten: ${rel}`);
  assert(!/workspace=\.$/m.test(rel.split("\n")[0]), `header reports "." rather than a path: ${rel.split("\n")[0]}`);
});
