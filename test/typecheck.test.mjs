// Tests for tools/typecheck, written against the three defects a whole-branch
// review reproduced in the manifest's original `npx tsc --noEmit`:
//
//   1. `npx tsc` does not resolve to TypeScript. In a project without a local
//      typescript it fetches and runs tsc@2.0.4, an unmaintained squatter
//      package, from the network — in an offline-first harness, on every
//      verify run. Measured: it prints "This is not the tsc command you are
//      looking for" and exits 1, which no parser can read.
//   2. `tsc --noEmit` on a solution-style root tsconfig (`files: []` plus
//      `references`, the shape Vite's react-ts template generates) compiles
//      the root project only, checks nothing, and exits 0. A check that
//      reports green without checking is the worst failure this pack can
//      have. Measured: --noEmit exit 0 and silent, -b exit 1 with TS2322.
//   3. A tool that cannot run must say why. The lint wrapper already learned
//      this; the type check never did.

import { test, assert } from "./run.mjs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TYPECHECK = new URL("../packs/ui-web/tools/typecheck", import.meta.url).pathname;
const FIXTURE = new URL("../fixtures/ui-web", import.meta.url).pathname;

function run(dir, env = {}) {
  try {
    return {
      out: execFileSync(TYPECHECK, ["--project", dir], {
        encoding: "utf8",
        env: { ...process.env, ...env },
      }),
      code: 0,
    };
  } catch (err) {
    return { out: (err.stdout ?? "") + (err.stderr ?? ""), code: err.status ?? 1 };
  }
}

function project(dir, { typescript = true, tsconfig = "flat" } = {}) {
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "package.json"), '{ "name": "p", "private": true }\n');
  if (typescript) symlinkSync(join(FIXTURE, "node_modules"), join(dir, "node_modules"), "dir");

  if (tsconfig === "flat") {
    cpSync(join(FIXTURE, "tsconfig.json"), join(dir, "tsconfig.json"));
  } else if (tsconfig === "solution") {
    // The Vite react-ts shape: a root that owns no files and delegates.
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({ files: [], references: [{ path: "./tsconfig.app.json" }] }),
    );
    writeFileSync(
      join(dir, "tsconfig.app.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          jsx: "react-jsx",
          composite: true,
          noEmit: true,
          skipLibCheck: true,
          module: "esnext",
          moduleResolution: "bundler",
          target: "es2020",
          lib: ["es2020", "dom"],
        },
        include: ["src"],
      }),
    );
  }
  return dir;
}

const BAD = "export const x: string = 42;\n";
const GOOD = "export const x: string = 'ok';\n";

test("a clean flat project passes", () => {
  const dir = project(mkdtempSync(join(tmpdir(), "tc-ok-")));
  writeFileSync(join(dir, "src", "Good.tsx"), GOOD);
  const { out, code } = run(dir);
  assert(code === 0, `exit ${code}: ${out}`);
});

test("a type error in a flat project is reported in the parsable shape", () => {
  const dir = project(mkdtempSync(join(tmpdir(), "tc-bad-")));
  writeFileSync(join(dir, "src", "Bad.tsx"), BAD);
  const { out, code } = run(dir);
  assert(code !== 0, `a type error must fail the check: ${out}`);
  assert(/^src\/Bad\.tsx\(\d+,\d+\): error TS2322:/m.test(out), out);
});

// Defect 2. The whole point: this project is broken, and the old command
// reported it green.
test("a type error behind a solution-style tsconfig is still reported", () => {
  const dir = project(mkdtempSync(join(tmpdir(), "tc-sol-")), { tsconfig: "solution" });
  writeFileSync(join(dir, "src", "Bad.tsx"), BAD);
  const { out, code } = run(dir);
  assert(code !== 0, `a solution-style project reported green: ${out}`);
  assert(/^src\/Bad\.tsx\(\d+,\d+\): error TS2322:/m.test(out), out);
});

test("a clean solution-style project passes", () => {
  const dir = project(mkdtempSync(join(tmpdir(), "tc-solok-")), { tsconfig: "solution" });
  writeFileSync(join(dir, "src", "Good.tsx"), GOOD);
  const { out, code } = run(dir);
  assert(code === 0, `exit ${code}: ${out}`);
});

// Defect 1, the behavioural half: no local typescript must be inert rather
// than a failure. (That it cannot instead fetch one is structural and is the
// "never invokes npx" test below — emptying PATH to prove it here would only
// break the wrapper's own `#!/usr/bin/env node` shebang.)
test("a project with no local typescript is skipped with a note, not failed", () => {
  const dir = project(mkdtempSync(join(tmpdir(), "tc-nots-")), { typescript: false });
  writeFileSync(join(dir, "src", "Bad.tsx"), BAD);
  const { out, code } = run(dir);
  assert(code === 0, `exit ${code} — a missing toolchain must not fail the check: ${out}`);
  assert(/typescript is not installed|check skipped/i.test(out), out);
  assert(!/\(\d+,\d+\): error/.test(out), `emitted a diagnostic anyway: ${out}`);
});

test("the wrapper never invokes npx", () => {
  const src = execFileSync("cat", [TYPECHECK], { encoding: "utf8" });
  assert(!/\bnpx\b/.test(src.replace(/^\s*\/\/.*$/gm, "")), "npx appears outside a comment");
});

test("a project with no tsconfig at all is skipped with a note", () => {
  const dir = mkdtempSync(join(tmpdir(), "tc-notsc-"));
  writeFileSync(join(dir, "package.json"), '{ "name": "p", "private": true }\n');
  symlinkSync(join(FIXTURE, "node_modules"), join(dir, "node_modules"), "dir");
  const { out, code } = run(dir);
  assert(code === 0, `exit ${code}: ${out}`);
  assert(/no tsconfig/i.test(out), out);
});

// Same contract as the lint wrapper: the harness's own regex, copied from
// internal/verify/ubt.go (reMSVC), must read every line we emit.
const RE_MSVC =
  /^\s*(?<file>.+?)\((?<line>\d+)(?:,(?<col>\d+))?\)\s*:\s*(?<sev>fatal error|error|warning)\s+(?<code>[A-Z]{1,3}\d{3,5})\s*:\s*(?<msg>.*)$/;

test("every emitted line parses with the harness's own msvc pattern", () => {
  const dir = project(mkdtempSync(join(tmpdir(), "tc-parse-")));
  writeFileSync(join(dir, "src", "Bad.tsx"), BAD);
  writeFileSync(join(dir, "src", "Bad2.tsx"), "export const y: number = 'no';\n");
  const { out, code } = run(dir);
  assert(code !== 0, "type errors must fail the check");
  const lines = out.split("\n").filter((l) => l.trim() !== "");
  assert(lines.length >= 2, `expected several diagnostics, got: ${out}`);
  for (const line of lines) {
    assert(RE_MSVC.test(line), `the harness cannot parse this line:\n  ${line}`);
  }
});

test("a workspace path containing spaces still yields relative paths", () => {
  const base = mkdtempSync(join(tmpdir(), "tc-ws-"));
  const dir = project(join(base, "my project"));
  writeFileSync(join(dir, "src", "Bad.tsx"), BAD);
  const { out } = run(dir);
  assert(/^src\/Bad\.tsx\(/m.test(out), out);
  assert(!out.includes("my project"), `path was not made relative: ${out}`);
});

test("a workspace reached through a symlink still yields relative paths", () => {
  const base = mkdtempSync(join(tmpdir(), "tc-link-"));
  const real = project(join(base, "real"));
  writeFileSync(join(real, "src", "Bad.tsx"), BAD);
  const link = join(base, "link");
  symlinkSync(real, link, "dir");
  const { out } = run(link);
  assert(/^src\/Bad\.tsx\(/m.test(out), out);
  assert(!out.includes(".."), `path escaped the workspace: ${out}`);
});

test("the wrapper is executable", () => {
  assert(existsSync(TYPECHECK), "tools/typecheck does not exist");
});
