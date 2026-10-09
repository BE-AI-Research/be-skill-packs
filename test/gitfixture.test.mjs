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
