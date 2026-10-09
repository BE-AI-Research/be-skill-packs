// Real git repositories in temp directories. The scan shells out to git, so a
// mock would prove nothing about the thing being tested.
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Every fixture is a real git repository on disk, so they are tracked and
// removed when the test process exits. Left behind they accumulate: one
// session's runs grew /tmp to 822 directories and 184 MB.
const made = [];

export function cleanupFixtures() {
  while (made.length > 0) {
    try {
      rmSync(made.pop(), { recursive: true, force: true });
    } catch {
      /* a fixture we cannot remove is not worth failing a test run over */
    }
  }
}
process.on("exit", cleanupFixtures);

// A tracked temp directory for a test that needs one without a repository in
// it, so it is cleaned up with everything else.
export function tempDir(prefix = "assist-") {
  const d = mkdtempSync(join(tmpdir(), prefix));
  made.push(d);
  return d;
}

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
//   taskAges  { "NNN-slug.md": days } to backdate one document rather than all
//   changelog CHANGELOG.md body
//   initialBranch  the default branch's name (default "main"), so a repository
//                  whose default is master can be built
export function makeRepo(opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), "assist-"));
  made.push(dir);
  const initial = opts.initialBranch ?? "main";
  git(dir, ["init", "--quiet", `--initial-branch=${initial}`]);
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
    made.push(remote);
    git(remote, ["init", "--bare", "--quiet"]);
    git(dir, ["remote", "add", "origin", remote]);
    git(dir, ["push", "--quiet", "-u", "origin", initial]);
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
      const days = opts.taskAges?.[name] ?? opts.staleDays;
      if (days) {
        const when = new Date(Date.now() - days * 86400000);
        utimesSync(p, when, when);
      }
    }
  }
  if (opts.changelog) writeFileSync(join(dir, "CHANGELOG.md"), opts.changelog);
  return dir;
}
