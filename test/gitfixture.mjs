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
