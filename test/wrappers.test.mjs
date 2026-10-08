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
    /^src\/Bad\.tsx\(\d+,\d+\): error @typescript-eslint\/no-unused-vars:/m.test(out),
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
  assert(/^src\/NoAlt\.tsx\(\d+,\d+\): error jsx-a11y\/alt-text:/m.test(out), out);
});

test("the test wrapper is inert when the project has no test script", () => {
  const dir = mkdtempSync(join(tmpdir(), "notest-"));
  writeFileSync(join(dir, "package.json"), '{ "name": "x", "private": true }\n');
  const { out, code } = run(TESTW, dir);
  assert(code === 0, `exit ${code}: ${out}`);
  assert(/no test script/i.test(out), out);
});
