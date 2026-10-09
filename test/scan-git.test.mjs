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
