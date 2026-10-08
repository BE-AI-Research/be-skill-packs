import { test, assert } from "./run.mjs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LINT = new URL("../packs/ui-web/tools/lint", import.meta.url).pathname;
const TESTW = new URL("../packs/ui-web/tools/test", import.meta.url).pathname;
const FIXTURE = new URL("../fixtures/ui-web", import.meta.url).pathname;

function run(bin, dir) {
  try {
    return { out: execFileSync(bin, ["--project", dir], { encoding: "utf8" }), code: 0 };
  } catch (err) {
    return { out: (err.stdout ?? "") + (err.stderr ?? ""), code: err.status ?? 1 };
  }
}

// A temp project borrowing the fixture's installed dependencies through a
// symlink. Copying node_modules would be ~200MB per test; npx resolves
// through the link, so the isolation is the same at a fraction of the cost.
function scaffold(dir, { eslintConfig = true } = {}) {
  mkdirSync(join(dir, "src"), { recursive: true });
  for (const f of ["package.json", "tsconfig.json"]) {
    cpSync(join(FIXTURE, f), join(dir, f));
  }
  if (eslintConfig) cpSync(join(FIXTURE, "eslint.config.mjs"), join(dir, "eslint.config.mjs"));
  symlinkSync(join(FIXTURE, "node_modules"), join(dir, "node_modules"), "dir");
  return dir;
}

// Review Focus 1: a bare project with no ESLint config. The wrapper must be
// inert, not failing — otherwise the pack breaks every project it activates
// in that has no lint setup.
test("a project with no eslint config exits 0 and says so", () => {
  const dir = scaffold(mkdtempSync(join(tmpdir(), "nolint-")), { eslintConfig: false });
  const { out, code } = run(LINT, dir);
  assert(code === 0, `exit ${code}: ${out}`);
  assert(/no eslint config/i.test(out), out);
  assert(!/\(\d+,\d+\): error/.test(out), `emitted a diagnostic anyway: ${out}`);
});

// Review Focus 2: a workspace path containing spaces. Paths must come out
// relative and intact.
test("a workspace path containing spaces still yields relative paths", () => {
  const base = mkdtempSync(join(tmpdir(), "ws-"));
  const dir = scaffold(join(base, "my project"));
  writeFileSync(join(dir, "src", "Bad.tsx"), "const unused = 1;\nexport const x = 2;\n");
  const { out } = run(LINT, dir);
  assert(
    /^src\/Bad\.tsx\(\d+,\d+\): error ESL001: @typescript-eslint\/no-unused-vars:/m.test(out),
    out
  );
  assert(!out.includes("my project"), `path was not made relative: ${out}`);
});

// Review Focus 3: warnings must not fail the check, or a project with
// stylistic warnings can never pass verification.
test("warnings alone do not fail the check", () => {
  const dir = scaffold(mkdtempSync(join(tmpdir(), "warn-")));
  writeFileSync(
    join(dir, "eslint.config.mjs"),
    'import tseslint from "typescript-eslint";\n' +
      'export default [{ files: ["src/**/*.{ts,tsx}"], languageOptions: { parser: tseslint.parser },' +
      ' rules: { "no-console": "warn" } }];\n'
  );
  writeFileSync(join(dir, "src", "Warn.tsx"), 'console.log("hi");\nexport const y = 1;\n');
  const { out, code } = run(LINT, dir);
  assert(code === 0, `warnings failed the check with exit ${code}: ${out}`);
});

// Review Focus 4: a tool that cannot run at all must fail, and must not emit
// malformed lines that look like findings.
test("a broken eslint config fails without emitting fake diagnostics", () => {
  const dir = scaffold(mkdtempSync(join(tmpdir(), "brokencfg-")));
  // A lintable file, so the only reason for failure is the config itself.
  // Without this ESLint fails with "No files matching the pattern" and the
  // test passes for the wrong reason.
  writeFileSync(join(dir, "src", "Fine.tsx"), "export const ok = 1;\n");
  writeFileSync(join(dir, "eslint.config.mjs"), "this is not javascript (((\n");
  const { out, code } = run(LINT, dir);
  assert(code !== 0, "a config error must not pass");
  assert(!/\(\d+,\d+\): error [a-z@/-]+:/.test(out), `emitted a fake diagnostic: ${out}`);
});

test("a real violation is emitted in the documented shape", () => {
  const dir = scaffold(mkdtempSync(join(tmpdir(), "viol-")));
  writeFileSync(join(dir, "src", "NoAlt.tsx"), 'export const I = () => <img src="x.png" />;\n');
  const { out, code } = run(LINT, dir);
  assert(code !== 0, "a violation must fail the check");
  assert(/^src\/NoAlt\.tsx\(\d+,\d+\): error ESL001: jsx-a11y\/alt-text:/m.test(out), out);
});

// The regex BE-Code's msvc parser actually applies, copied from
// internal/verify/ubt.go (reMSVC). Checking our output against our own idea of
// the shape is what let the first version of the wrapper ship a code the
// parser could not read: every line fell through to "exit code 1 and no
// recognisable error line", so the model got no diagnosis and no playbook
// entry. If BE-Code ever loosens this pattern, this test is the thing to
// update — deliberately, not by accident.
const RE_MSVC =
  /^\s*(?<file>.+?)\((?<line>\d+)(?:,(?<col>\d+))?\)\s*:\s*(?<sev>fatal error|error|warning)\s+(?<code>[A-Z]{1,3}\d{3,5})\s*:\s*(?<msg>.*)$/;

test("every emitted line parses with the harness's own msvc pattern", () => {
  const dir = scaffold(mkdtempSync(join(tmpdir(), "parse-")));
  writeFileSync(
    join(dir, "src", "Many.tsx"),
    'export const I = () => <div><img src="x.png" /><a href="/y"></a></div>;\n',
  );
  const { out, code } = run(LINT, dir);
  assert(code !== 0, "a violation must fail the check");

  const lines = out.split("\n").filter((l) => l.trim() !== "");
  assert(lines.length >= 2, `expected several diagnostics, got: ${out}`);
  for (const line of lines) {
    const m = RE_MSVC.exec(line);
    assert(m, `the harness cannot parse this line:\n  ${line}`);
    // The rule name has to survive into the message, because that is what a
    // playbook entry matches on once the code is a constant.
    assert(/^[a-z@][\w@/-]*:/.test(m.groups.msg), `no rule name in message: ${m.groups.msg}`);
  }
});

test("the test wrapper is inert when the project has no test script", () => {
  const dir = mkdtempSync(join(tmpdir(), "notest-"));
  writeFileSync(join(dir, "package.json"), '{ "name": "x", "private": true }\n');
  const { out, code } = run(TESTW, dir);
  assert(code === 0, `exit ${code}: ${out}`);
  assert(/no test script/i.test(out), out);
});
