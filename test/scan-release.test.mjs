import { test, assert } from "./run.mjs";
import { makeRepo } from "./gitfixture.mjs";
import { scan, line } from "./scanhelper.mjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

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
  const dir = makeRepo({
    commits: 1,
    changelog: "# Changelog\n\n## Unreleased\n\n## 1.2.5\n\n- old\n",
  });
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
