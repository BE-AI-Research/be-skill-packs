# ui-web Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `ui-web` pack that makes a coding agent better at React + TypeScript interfaces, with every playbook entry written from output captured from a real toolchain.

**Architecture:** A pack folder of Markdown and JSON plus two small Node wrappers. The wrappers run `tsc`/ESLint/the test runner and normalise their output to `file(line,col): error CODE: message` — the shape BE-Code's built-in `msvc` parser already reads — so the pack needs no harness change. A fixture React project is built first and is the source of every captured diagnostic; the repo gains a Node test harness so pack content is tested where it lives.

**Tech Stack:** Node 20+ (wrappers and tests, no dependencies outside the fixture), TypeScript, ESLint 10 + `eslint-plugin-jsx-a11y`, Vitest, Vite. `be-code packs validate` as the acceptance gate.

**Spec:** [`docs/specs/2026-10-07-ui-web-pack-design.md`](../specs/2026-10-07-ui-web-pack-design.md)

## Global Constraints

- Pack format v1 as documented in [`docs/PACK-FORMAT.md`](../PACK-FORMAT.md). No harness change is permitted by this plan.
- `verify[].cmd` is an **argument vector**, never a shell string.
- Every chunk file must be **under 4096 bytes** — the floor a per-call tool-output cap can reach.
- `core.budget_tokens` is **1500**; core must pass the deterministic estimate (`len(core) / 3` tokens, so core.md must be under 4500 bytes).
- Both wrappers are tracked **executable** (git mode 100755) and begin `#!/usr/bin/env node`.
- Wrapper output shape, exactly: `path(line,col): error CODE: message`, one diagnostic per line, paths relative to the workspace, forward slashes.
- A wrapper whose tool is not configured **exits 0** with a single explanatory line on stdout.
- A wrapper otherwise exits with the underlying tool's own exit code.
- No `node_modules` committed; `fixtures/ui-web/node_modules` is gitignored.
- `be-code packs validate packs/ui-web` must exit 0 at the end of Task 10.

## Review Focus

Input classes the spec implies but which no task's own deliverable would naturally exercise. Each has its test added to the task that owns the code.

1. **A project with no ESLint config at all.** The lint wrapper must exit 0 with a note, not fail the build — otherwise the pack breaks every bare Vite project it activates in. (Task 3)
2. **A workspace path containing spaces.** Paths must come out relative and intact; a wrapper that shells out or string-splits will mangle `/home/a b/proj`. (Task 3)
3. **ESLint reporting only warnings.** Warnings must not fail the check, or a project with stylistic warnings can never pass verification. (Task 3)
4. **ESLint or tsc failing to run at all** — bad config, missing dependency. Exit code must be non-zero and output must not be malformed diagnostic lines pretending to be findings. (Task 3)
5. **A syntax error producing a `TS1xxx` code with no playbook entry.** There is deliberately no catch-all (spec §5.3), so this must route to *nothing* and that must be the correct outcome — the parsed diagnostic reaches the model alone, with no generic advice attached. (Task 7)

---

### Task 1: Fixture project that passes cleanly

A React + TypeScript project with all three tools configured and **no** errors. Everything later depends on this being green first: a capture script cannot tell a deliberate break from a broken fixture.

**Files:**
- Create: `fixtures/ui-web/package.json`
- Create: `fixtures/ui-web/tsconfig.json`
- Create: `fixtures/ui-web/eslint.config.mjs`
- Create: `fixtures/ui-web/src/Button.tsx`
- Create: `fixtures/ui-web/src/SignupForm.tsx`
- Create: `fixtures/ui-web/src/ItemList.tsx`
- Create: `fixtures/ui-web/src/Button.test.tsx`
- Create: `.gitignore` (modify if present)

**Interfaces:**
- Consumes: nothing.
- Produces: a fixture directory where `npx tsc --noEmit --pretty false`, `npx eslint src`, and `npx vitest run` all exit 0. Task 3 runs the wrappers against it; Task 5 copies it to make broken variants.

- [ ] **Step 1: Create the project manifest**

`fixtures/ui-web/package.json`:

```json
{
  "name": "ui-web-fixture",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit --pretty false",
    "lint": "eslint src",
    "test": "vitest run"
  },
  "devDependencies": {
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^10.0.0",
    "eslint-plugin-jsx-a11y": "^6.10.2",
    "eslint-plugin-react-hooks": "^5.1.0",
    "jsdom": "^25.0.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^7.0.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create the TypeScript and ESLint configuration**

`fixtures/ui-web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "noEmit": true,
    "target": "es2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["es2022", "dom", "dom.iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

`fixtures/ui-web/eslint.config.mjs`:

```js
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "jsx-a11y": jsxA11y, "react-hooks": reactHooks },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": "error",
    },
  },
];
```

- [ ] **Step 3: Write the three correct components**

`fixtures/ui-web/src/Button.tsx`:

```tsx
type ButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

`fixtures/ui-web/src/SignupForm.tsx`:

```tsx
import { useState } from "react";

export function SignupForm({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(email);
      }}
    >
      <label htmlFor="email">Email address</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          setEmail(event.target.value)
        }
      />
      <button type="submit">Sign up</button>
    </form>
  );
}
```

`fixtures/ui-web/src/ItemList.tsx`:

```tsx
export type Item = { id: string; name: string };

export function ItemList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Write the test that proves the toolchain runs**

`fixtures/ui-web/src/Button.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

test("the button is reachable by its accessible name", () => {
  render(<Button label="Save" onClick={() => {}} />);
  expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
});
```

- [ ] **Step 5: Ignore the fixture's dependencies**

Append to `.gitignore` at the repository root:

```
fixtures/*/node_modules
```

- [ ] **Step 6: Install and verify all three tools are green**

```bash
cd fixtures/ui-web && npm install
npx tsc --noEmit --pretty false ; echo "tsc exit=$?"
npx eslint src ; echo "eslint exit=$?"
npx vitest run ; echo "vitest exit=$?"
```

Expected: every `exit=0`. If any fails, fix the fixture — a non-green baseline makes every later capture meaningless.

- [ ] **Step 7: Commit**

```bash
git add fixtures/ui-web .gitignore
git commit -m "ui-web: fixture project, green baseline"
```

---

### Task 2: Repo test harness

A test runner for pack content, in this repository, with no dependencies. The authoritative playbook matcher is BE-Code's Go one; this is a second implementation of the same documented rules so content can be tested where it lives. Divergence risk is accepted and recorded in the file's own comment.

**Files:**
- Create: `test/run.mjs`
- Create: `test/playbook.mjs`
- Create: `test/playbook.test.mjs`
- Modify: `package.json` (create at repo root)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parsePlaybook(text) -> Entry[]` where `Entry = {title, match: RegExp, kind, cause, fix, next}`
  - `matchEntry(entries, kind, raw, message) -> Entry | null`
  - `test(name, fn)` and `assert(cond, msg)` from `test/run.mjs`; `npm test` runs every `test/*.test.mjs`.

- [ ] **Step 1: Write the failing test for the playbook parser**

`test/playbook.test.mjs`:

```js
import { test, assert } from "./run.mjs";
import { parsePlaybook, matchEntry } from "./playbook.mjs";

const doc = `# playbook

## Missing label
match: label-has-associated-control
kind: compile
cause: The input has no label.
fix:
1. Add a label with htmlFor.
next: If the label exists, check the ids match.

## Unknown failure
match: .
kind: any
cause: Nothing specific matched.
fix:
1. Read the first error.
next: Fetch a chunk.
`;

test("parses entries in file order", () => {
  const entries = parsePlaybook(doc);
  assert(entries.length === 2, `got ${entries.length} entries`);
  assert(entries[0].title === "Missing label", entries[0].title);
  assert(entries[0].next.includes("ids match"), entries[0].next);
});

test("first match wins, so specific entries beat the catch-all", () => {
  const entries = parsePlaybook(doc);
  const hit = matchEntry(entries, "compile", "src/A.tsx(3,5): error label-has-associated-control: no label", "");
  assert(hit && hit.title === "Missing label", hit && hit.title);
});

test("an entry with a kind does not take another kind", () => {
  const entries = parsePlaybook(doc);
  const hit = matchEntry(entries, "link", "label-has-associated-control", "");
  assert(hit && hit.title === "Unknown failure", hit && hit.title);
});

test("a fenced block does not create a field", () => {
  const fenced = `## E
match: real
cause: c
fix:
1. Write:
\`\`\`tsx
match: fake
\`\`\`
next: n
`;
  const entries = parsePlaybook(fenced);
  assert(entries[0].match.source === "real", entries[0].match.source);
  assert(entries[0].fix.includes("match: fake"), entries[0].fix);
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
node test/playbook.test.mjs
```

Expected: fails with `Cannot find module './run.mjs'`.

- [ ] **Step 3: Write the minimal runner**

`test/run.mjs`:

```js
let failures = 0;

export function test(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failures++;
    console.log(`FAIL ${name}\n     ${err.message}`);
  }
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? "assertion failed");
}

process.on("exit", () => {
  if (failures > 0) {
    console.log(`\n${failures} failure(s)`);
    process.exitCode = 1;
  }
});
```

- [ ] **Step 4: Write the playbook parser and matcher**

`test/playbook.mjs`:

```js
// A second implementation of the playbook rules in docs/PACK-FORMAT.md, so
// pack content can be tested in this repository. BE-Code's Go matcher is
// authoritative; if the two ever disagree, the Go one is right and this is
// the bug. The rules are small enough that a second copy is cheaper than a
// cross-repository test.

const KEYS = ["match", "kind", "cause", "fix", "next"];

export function parsePlaybook(text) {
  const entries = [];
  let cur = null;
  let field = "";
  let inFence = false;

  const flush = () => {
    if (cur && cur.match) entries.push(cur);
    cur = null;
  };

  for (const line of text.split("\n")) {
    const trimmed = line.replace(/^[ \t]+/, "");
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      if (cur && field) cur[field] += "\n" + line;
      continue;
    }
    if (!inFence && trimmed.startsWith("## ")) {
      flush();
      cur = { title: trimmed.slice(3).trim(), match: null, kind: "", cause: "", fix: "", next: "" };
      field = "";
      continue;
    }
    if (!cur) continue;
    let matchedKey = null;
    if (!inFence) {
      for (const k of KEYS) {
        if (trimmed.startsWith(k + ":")) { matchedKey = k; break; }
      }
    }
    if (matchedKey) {
      const value = trimmed.slice(matchedKey.length + 1).trim();
      if (matchedKey === "match") { cur.match = new RegExp(value); field = ""; }
      else if (matchedKey === "kind") { cur.kind = value; field = ""; }
      else { cur[matchedKey] = value; field = matchedKey; }
      continue;
    }
    if (field) cur[field] += "\n" + line;
  }
  flush();
  for (const e of entries) {
    e.cause = e.cause.trim();
    e.fix = e.fix.trim();
    e.next = e.next.trim();
  }
  return entries;
}

export function matchEntry(entries, kind, raw, message) {
  for (const e of entries) {
    if (!e.match) continue;
    if (e.kind && e.kind !== "any" && e.kind !== kind) continue;
    if (e.match.test(raw) || e.match.test(message)) return e;
  }
  return null;
}
```

- [ ] **Step 5: Add the repo manifest and run the tests**

`package.json` at the repository root:

```json
{
  "name": "be-skill-packs",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "for f in test/*.test.mjs; do node \"$f\" || exit 1; done"
  }
}
```

```bash
npm test
```

Expected: four `ok` lines, exit 0.

- [ ] **Step 6: Commit**

```bash
git add test package.json
git commit -m "ui-web: test harness for pack content"
```

---

### Task 3: The two wrappers

**Files:**
- Create: `packs/ui-web/tools/lint`
- Create: `packs/ui-web/tools/test`
- Create: `test/wrappers.test.mjs`

**Interfaces:**
- Consumes: the fixture from Task 1.
- Produces: two executables. `tools/lint [--project DIR]` and `tools/test [--project DIR]`, both defaulting to the current directory, both emitting `path(line,col): error CODE: message`, both exiting 0 when their tool is absent.

- [ ] **Step 1: Write the failing tests, including the Review Focus cases**

`test/wrappers.test.mjs`:

```js
import { test, assert } from "./run.mjs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LINT = new URL("../packs/ui-web/tools/lint", import.meta.url).pathname;
const FIXTURE = new URL("../fixtures/ui-web", import.meta.url).pathname;

function run(bin, dir) {
  try {
    return { out: execFileSync(bin, ["--project", dir], { encoding: "utf8" }), code: 0 };
  } catch (err) {
    return { out: (err.stdout ?? "") + (err.stderr ?? ""), code: err.status ?? 1 };
  }
}

test("a project with no eslint config exits 0 and says so", () => {
  const dir = mkdtempSync(join(tmpdir(), "nolint-"));
  writeFileSync(join(dir, "package.json"), "{}");
  const { out, code } = run(LINT, dir);
  assert(code === 0, `exit ${code}: ${out}`);
  assert(/no eslint config/i.test(out), out);
  assert(!/\(\d+,\d+\): error/.test(out), `emitted a diagnostic anyway: ${out}`);
});

test("a workspace path containing spaces still yields relative paths", () => {
  const base = mkdtempSync(join(tmpdir(), "ws-"));
  const dir = join(base, "my project");
  cpSync(FIXTURE, dir, { recursive: true });
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "Bad.tsx"), "const unused = 1;\nexport const x = 2;\n");
  const { out } = run(LINT, dir);
  assert(/^src\/Bad\.tsx\(\d+,\d+\): error no-unused-vars:/m.test(out), out);
  assert(!out.includes("my project"), `path was not made relative: ${out}`);
});

test("warnings alone do not fail the check", () => {
  const dir = mkdtempSync(join(tmpdir(), "warn-"));
  cpSync(FIXTURE, dir, { recursive: true });
  writeFileSync(
    join(dir, "eslint.config.mjs"),
    'export default [{ files: ["src/**/*.tsx"], rules: { "no-console": "warn" } }];\n'
  );
  writeFileSync(join(dir, "src", "Warn.tsx"), 'console.log("hi");\nexport const y = 1;\n');
  const { code } = run(LINT, dir);
  assert(code === 0, `warnings failed the check with exit ${code}`);
});

test("a broken eslint config fails without emitting fake diagnostics", () => {
  const dir = mkdtempSync(join(tmpdir(), "brokencfg-"));
  cpSync(FIXTURE, dir, { recursive: true });
  writeFileSync(join(dir, "eslint.config.mjs"), "this is not javascript (((\n");
  const { out, code } = run(LINT, dir);
  assert(code !== 0, "a config error must not pass");
  assert(!/\(\d+,\d+\): error [a-z-]+:/.test(out), `emitted a fake diagnostic: ${out}`);
});

test("a real violation is emitted in the documented shape", () => {
  const dir = mkdtempSync(join(tmpdir(), "viol-"));
  cpSync(FIXTURE, dir, { recursive: true });
  writeFileSync(join(dir, "src", "NoAlt.tsx"), 'export const I = () => <img src="x.png" />;\n');
  const { out, code } = run(LINT, dir);
  assert(code !== 0, "a violation must fail the check");
  assert(/^src\/NoAlt\.tsx\(\d+,\d+\): error jsx-a11y\/alt-text:/m.test(out), out);
});
```

- [ ] **Step 2: Run them to confirm they fail**

```bash
node test/wrappers.test.mjs
```

Expected: every test FAILs, because `packs/ui-web/tools/lint` does not exist.

- [ ] **Step 3: Write the lint wrapper**

`packs/ui-web/tools/lint`:

```js
#!/usr/bin/env node
// Runs ESLint and prints diagnostics in the shape BE-Code's msvc parser
// reads: path(line,col): error RULE: message
//
// Why a wrapper at all: ESLint's default "stylish" format puts the filename
// on a header line, which no line-based parser can read, and the two formats
// that could be parsed (unix, compact) were removed from core ESLint. Doing
// the conversion here keeps ESLint's format churn inside the pack.
//
// The rule name stands in for an error code, which gives playbook entries
// something stable to match and signatures something stable to fingerprint.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { relative, join, sep } from "node:path";

const args = process.argv.slice(2);
let project = process.cwd();
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--project" && args[i + 1]) project = args[++i];
}

const CONFIGS = [
  "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs",
  "eslint.config.ts", ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.cjs",
];
if (!CONFIGS.some((c) => existsSync(join(project, c)))) {
  console.log("no eslint config in this project; lint check skipped");
  process.exit(0);
}

const res = spawnSync("npx", ["eslint", "src", "--format", "json"], {
  cwd: project,
  encoding: "utf8",
  shell: false,
});

let results;
try {
  results = JSON.parse(res.stdout);
} catch {
  // ESLint could not run — a bad config, a missing plugin. Pass its own
  // complaint through untouched rather than inventing diagnostics.
  process.stderr.write(res.stderr || res.stdout || "eslint produced no output\n");
  process.exit(res.status === 0 ? 1 : res.status ?? 1);
}

let errors = 0;
for (const file of results) {
  let rel = relative(project, file.filePath);
  rel = rel.split(sep).join("/");
  for (const m of file.messages) {
    if (m.severity !== 2) continue; // warnings must not fail the check
    errors++;
    const code = m.ruleId ?? "eslint";
    console.log(`${rel}(${m.line ?? 1},${m.column ?? 1}): error ${code}: ${m.message}`);
  }
}
process.exit(errors > 0 ? 1 : 0);
```

- [ ] **Step 4: Write the test wrapper**

`packs/ui-web/tools/test`:

```js
#!/usr/bin/env node
// Runs the project's test script and passes its output through unchanged.
// The generic parser reads the exit code and the output tail, so there is no
// format to normalise — the only job here is to be inert when the project
// has no tests, since a missing test script is not a failure.

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
let project = process.cwd();
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--project" && args[i + 1]) project = args[++i];
}

const pkgPath = join(project, "package.json");
if (!existsSync(pkgPath)) {
  console.log("no package.json in this project; test check skipped");
  process.exit(0);
}
let pkg;
try {
  pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
} catch (err) {
  process.stderr.write(`package.json could not be read: ${err.message}\n`);
  process.exit(1);
}
if (!pkg.scripts || !pkg.scripts.test) {
  console.log("no test script in package.json; test check skipped");
  process.exit(0);
}

const res = spawnSync("npm", ["test", "--silent"], {
  cwd: project,
  encoding: "utf8",
  shell: false,
});
process.stdout.write(res.stdout ?? "");
process.stderr.write(res.stderr ?? "");
process.exit(res.status ?? 1);
```

- [ ] **Step 5: Make both executable and run the tests**

```bash
chmod +x packs/ui-web/tools/lint packs/ui-web/tools/test
node test/wrappers.test.mjs
```

Expected: five `ok` lines. If the spaces test fails on path separators, fix the wrapper's `relative`/`split(sep)` handling — not the test.

- [ ] **Step 6: Verify git records the executable bit**

```bash
git add packs/ui-web/tools test/wrappers.test.mjs
git ls-files -s packs/ui-web/tools
```

Expected: both lines begin `100755`. If they show `100644`, run `git update-index --chmod=+x` on each — a pack installed by copying a folder depends on this.

- [ ] **Step 7: Commit**

```bash
git commit -m "ui-web: lint and test wrappers, normalising output for the msvc parser"
```

---

### Task 4: Manifest, core rules and README

**Files:**
- Create: `packs/ui-web/pack.json`
- Create: `packs/ui-web/core.md`
- Create: `packs/ui-web/README.md`
- Create: `test/manifest.test.mjs`

**Interfaces:**
- Consumes: the wrappers from Task 3.
- Produces: a loadable pack. Task 10 runs `be-code packs validate` against it.

- [ ] **Step 1: Write the failing manifest test**

`test/manifest.test.mjs`:

```js
import { test, assert } from "./run.mjs";
import { readFileSync, statSync, readdirSync } from "node:fs";

const root = new URL("../packs/ui-web/", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(root + "pack.json", "utf8"));

test("core is within its declared budget", () => {
  const bytes = statSync(root + "core.md").size;
  const estimate = Math.floor(bytes / 3); // the deterministic estimate
  assert(estimate <= manifest.core.budget_tokens, `core ~${estimate} tokens over ${manifest.core.budget_tokens}`);
});

test("every verify command is an argument vector naming a known parser", () => {
  const parsers = ["generic", "gcc", "msvc", "ubt"];
  for (const c of manifest.verify) {
    assert(Array.isArray(c.cmd) && c.cmd.length > 0, `${c.name}: cmd is not an argv`);
    assert(parsers.includes(c.parser), `${c.name}: unknown parser ${c.parser}`);
  }
});

test("every chunk file exists and is under the 4 KiB floor", () => {
  for (const [name, chunk] of Object.entries(manifest.chunks ?? {})) {
    const bytes = statSync(root + chunk.file).size;
    assert(bytes < 4096, `chunk ${name} is ${bytes} bytes`);
    assert(chunk.summary && chunk.summary.length > 0, `chunk ${name} has no summary`);
  }
});

test("detection requires both a package manifest and a tsx file", () => {
  assert(manifest.detect.all.includes("package.json"), "missing package.json");
  assert(manifest.detect.all.some((g) => g.endsWith("*.tsx")), "missing a tsx glob");
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
node test/manifest.test.mjs
```

Expected: throws `ENOENT` on `pack.json`.

- [ ] **Step 3: Write the manifest**

`packs/ui-web/pack.json`:

```json
{
  "schema": 1,
  "name": "ui-web",
  "version": "0.1.0",
  "description": "React and TypeScript interfaces: accessibility, state, effects and types",
  "detect": { "all": ["package.json", "**/*.tsx"] },
  "core": { "file": "core.md", "budget_tokens": 1500 },
  "chunks": {},
  "verify": [
    {
      "name": "types",
      "cmd": ["npx", "tsc", "--noEmit", "--pretty", "false"],
      "parser": "msvc",
      "timeout": "5m",
      "when": { "changed": ["src/**", "*.ts", "*.tsx", "package.json", "tsconfig.json"] }
    },
    {
      "name": "lint",
      "cmd": ["{pack}/tools/lint", "--project", "{workspace}"],
      "parser": "msvc",
      "timeout": "5m",
      "when": { "changed": ["src/**", "*.ts", "*.tsx", "eslint.config.*"] }
    },
    {
      "name": "test",
      "cmd": ["{pack}/tools/test", "--project", "{workspace}"],
      "parser": "generic",
      "timeout": "10m",
      "when": { "changed": ["src/**", "*.ts", "*.tsx"] }
    }
  ],
  "playbooks": ["playbooks/errors.md"],
  "commands": "commands",
  "requires": { "be_code": ">=1.3.0" }
}
```

Note `chunks` is deliberately empty here and filled in Task 8; the manifest test above iterates whatever is present, so it passes either way.

- [ ] **Step 4: Write core.md**

`packs/ui-web/core.md`:

```markdown
You are writing a React interface in TypeScript. These rules are not optional.

**Accessibility.** These are the defects measured most often in real interfaces, and most of them nothing will catch for you.

- Text must meet 4.5:1 contrast against its background (3:1 for text 24px or larger, or 19px bold). No linter can check this. If you choose a colour, check it.
- Every `img` has `alt`. If it is decorative, `alt=""` — not a missing attribute.
- Every input has a label associated with it: `<label htmlFor="id">` with a matching `id`. A placeholder is not a label. Adjacent text is not a label.
- Every link and button has text a screen reader can announce. An icon-only control needs `aria-label`.
- Anything clickable is a real `button`, `a`, or `input` — never a `div` or `span` with `onClick`. Keyboard support and screen-reader semantics come free with the real element and are painful to add afterwards.

**State.**

- Never mutate state. Build a new object or array: `setItems([...items, next])`, not `items.push(next)`.
- A list key is a stable id from the data, never the array index. An index key corrupts state when the list reorders.
- Do not store what you can compute. If a value derives from props or other state, compute it during render.

**Effects.** Most code in a `useEffect` does not belong there.

- Deriving a value from props or state: compute it during render instead.
- Responding to a user action: put it in the event handler instead.
- An effect that subscribes, sets a timer, or fetches must clean up in its return.

**Types.** The type checker is run on every change, so let it do this work: type props explicitly, take event types from React (`React.ChangeEvent<HTMLInputElement>`), and do not reach for `any` to silence it.

**Verification.** Fix the first error only, then re-run the checks. Fetch the chunk named in a playbook entry rather than guessing.
```

- [ ] **Step 5: Write the pack README**

`packs/ui-web/README.md`:

```markdown
# ui-web pack

React + TypeScript interface expertise. Version 0.1.0.

## Install

```sh
cp -r packs/ui-web ~/.be-code/packs/ui-web
```

Activates in any workspace with a `package.json` and a `.tsx` file.

## What it checks

| check | command | when it does nothing |
|---|---|---|
| `types` | `tsc --noEmit` | never |
| `lint` | ESLint via `tools/lint` | the project has no ESLint config |
| `test` | the project's own test script | there is no test script |

The lint wrapper converts ESLint's JSON to the shape the harness parses, using
the rule name as the error code.

## What it cannot check

Worth knowing before you rely on it:

- **Colour contrast** — the most common accessibility defect in real
  interfaces (83.9% of the top million homepages) — is invisible to static
  analysis, because it needs computed colours at runtime. It is a core rule
  here, not a check.
- Static lint catches four of the six most common accessibility failures.
  Contrast and a missing document language are not among them.
- Even a rendered accessibility scan reaches only about 57% of WCAG issues,
  and this pack does not render.
- `eslint-plugin-jsx-a11y` cannot see values arriving through props, so a
  component that lints clean can still fail at runtime.

## Known interaction

BE-Code runs a project's *detected* checks before any pack's and stops at the
first failure. A React project is detected as `node`, so `npm run build` and
`npm test` run first, with no parser — so no diagnosis and no playbook entry.
If your build shells out to `tsc`, a type error fails there and this pack's
parsed check never runs. Set `verify.builtin: false` for the workspace when
that option is available.
```

- [ ] **Step 6: Run the test**

```bash
node test/manifest.test.mjs
```

Expected: four `ok` lines. If core is over budget, cut rules rather than raising the budget — the cap is the point.

- [ ] **Step 7: Commit**

```bash
git add packs/ui-web/pack.json packs/ui-web/core.md packs/ui-web/README.md test/manifest.test.mjs
git commit -m "ui-web: manifest, core rules and README"
```

---

### Task 5: Broken variants and the capture script

Every playbook entry must be written against output a real tool produced. This task produces that output and freezes it.

**Files:**
- Create: `fixtures/ui-web/broken/a11y.tsx`
- Create: `fixtures/ui-web/broken/props.tsx`
- Create: `fixtures/ui-web/broken/hooks.tsx`
- Create: `fixtures/ui-web/broken/nullable.tsx`
- Create: `fixtures/ui-web/broken/syntax.tsx`
- Create: `scripts/capture.mjs`
- Create: `fixtures/ui-web/captured/` (output, committed)

**Interfaces:**
- Consumes: the fixture (Task 1) and the lint wrapper (Task 3).
- Produces: `fixtures/ui-web/captured/<name>.txt`, each holding the real diagnostic lines for one broken file. Tasks 6 and 7 assert routing against these files and must never invent a diagnostic line.

- [ ] **Step 1: Write the broken variants**

`fixtures/ui-web/broken/a11y.tsx` — four of WebAIM's six, all lint-catchable:

```tsx
export function Broken() {
  return (
    <div>
      <img src="logo.png" />
      <input type="text" />
      <a href="/next"></a>
      <div onClick={() => {}}>Save</div>
    </div>
  );
}
```

`fixtures/ui-web/broken/props.tsx`:

```tsx
type Props = { label: string; onClick: () => void };
function Button({ label }: Props) {
  return <button>{label}</button>;
}
export function Use() {
  return <Button label={42} />;
}
```

`fixtures/ui-web/broken/hooks.tsx`:

```tsx
import { useEffect, useState } from "react";

export function Broken({ flag, id }: { flag: boolean; id: string }) {
  if (flag) {
    const [a] = useState(0);
    void a;
  }
  const [name, setName] = useState("");
  useEffect(() => {
    setName(id);
  }, []);
  return <p>{name}</p>;
}
```

`fixtures/ui-web/broken/nullable.tsx`:

```tsx
export function Broken({ items }: { items?: string[] }) {
  return <p>{items.length}</p>;
}
```

`fixtures/ui-web/broken/syntax.tsx`:

```tsx
export function Broken() {
  return <p>unclosed
}
```

- [ ] **Step 2: Write the capture script**

`scripts/capture.mjs`:

```js
// Copies each broken variant into the fixture's src/, runs the real tools,
// and freezes their output under fixtures/ui-web/captured/.
//
// Every playbook entry is written against these files. An entry matched
// against a line nobody captured is a guess, and guesses are what this
// script exists to prevent.

import { cpSync, mkdirSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, basename } from "node:path";

const fixture = new URL("../fixtures/ui-web/", import.meta.url).pathname;
const broken = join(fixture, "broken");
const captured = join(fixture, "captured");
const lint = new URL("../packs/ui-web/tools/lint", import.meta.url).pathname;

mkdirSync(captured, { recursive: true });

for (const file of readdirSync(broken)) {
  const name = basename(file, ".tsx");
  const target = join(fixture, "src", "Broken.tsx");
  cpSync(join(broken, file), target);

  const tsc = spawnSync("npx", ["tsc", "--noEmit", "--pretty", "false"], { cwd: fixture, encoding: "utf8" });
  const eslint = spawnSync(lint, ["--project", fixture], { cwd: fixture, encoding: "utf8" });

  const text = [
    `$ tsc --noEmit --pretty false   (exit ${tsc.status})`,
    (tsc.stdout ?? "").trimEnd(),
    "",
    `$ tools/lint   (exit ${eslint.status})`,
    (eslint.stdout ?? "").trimEnd(),
  ].join("\n") + "\n";

  writeFileSync(join(captured, `${name}.txt`), text);
  console.log(`captured ${name}: tsc exit ${tsc.status}, lint exit ${eslint.status}`);
  rmSync(target, { force: true });
}
```

- [ ] **Step 3: Run the capture and read the output**

```bash
node scripts/capture.mjs
cat fixtures/ui-web/captured/*.txt
```

Expected: five files, each containing real diagnostic lines. **Read them.** The codes and rule names you see are the only ones Task 7's entries may match on. If a variant produced no diagnostic, fix the variant — a playbook entry with no captured output cannot be written.

- [ ] **Step 4: Commit the captured output**

```bash
git add fixtures/ui-web/broken scripts/capture.mjs fixtures/ui-web/captured
git commit -m "ui-web: broken variants and captured toolchain output"
```

---

### Task 6: Accessibility playbook entries

The four of the six most common accessibility failures that static analysis can catch, written against `captured/a11y.txt`.

**Files:**
- Create: `packs/ui-web/playbooks/errors.md`
- Create: `test/routing.test.mjs`

**Interfaces:**
- Consumes: `parsePlaybook`/`matchEntry` (Task 2), `captured/a11y.txt` (Task 5).
- Produces: `playbooks/errors.md`, extended in Task 7.

- [ ] **Step 1: Write the failing routing test**

`test/routing.test.mjs`:

```js
import { test, assert } from "./run.mjs";
import { readFileSync } from "node:fs";
import { parsePlaybook, matchEntry } from "./playbook.mjs";

const root = new URL("../", import.meta.url).pathname;
const entries = parsePlaybook(readFileSync(root + "packs/ui-web/playbooks/errors.md", "utf8"));

// Every diagnostic line in the captured output, with the kind the parser
// assigns it: msvc output is "compile" unless the code starts with LNK.
function captured(name) {
  const text = readFileSync(root + `fixtures/ui-web/captured/${name}.txt`, "utf8");
  return text.split("\n").filter((l) => /^\S.*\(\d+,\d+\): error /.test(l));
}

function route(line) {
  const m = /^(.*)\((\d+),(\d+)\): error (\S+): (.*)$/.exec(line);
  assert(m, `not a diagnostic line: ${line}`);
  return matchEntry(entries, "compile", line, m[5]);
}

test("every captured accessibility diagnostic routes to a specific entry", () => {
  const lines = captured("a11y");
  assert(lines.length >= 4, `only ${lines.length} captured a11y diagnostics`);
  for (const line of lines) {
    const hit = route(line);
    assert(hit, `nothing matched: ${line}`);
    // There is no catch-all, so a hit here is always a real entry rather
    // than generic advice standing in for one.
    assert(hit.match.source !== ".", `${line} matched a catch-all`);
  }
});

test("the four accessibility failures route to their own entries", () => {
  const wants = [
    [/alt-text/, "Image without alt text"],
    [/label-has-associated-control/, "Input without a label"],
    [/anchor-has-content/, "Link with no text"],
    [/click-events-have-key-events|no-static-element-interactions/, "Click handler on a non-interactive element"],
  ];
  const lines = captured("a11y");
  for (const [rule, title] of wants) {
    const line = lines.find((l) => rule.test(l));
    assert(line, `no captured line for ${rule}`);
    const hit = route(line);
    assert(hit && hit.title === title, `${line}\n  routed to ${hit && hit.title}, want ${title}`);
  }
});

test("every entry has a cause, a fix and a different next", () => {
  for (const e of entries) {
    assert(e.cause, `${e.title}: no cause`);
    assert(e.fix, `${e.title}: no fix`);
    assert(e.next, `${e.title}: no next`);
    assert(e.next !== e.fix, `${e.title}: next repeats the fix`);
  }
});

// Spec §5.3: cause is a discriminator, not an explanation. One sentence that
// says which situation the model is in; the chunk holds the teaching.
test("every cause is one short discriminating sentence", () => {
  for (const e of entries) {
    assert(e.cause.length <= 220, `${e.title}: cause is ${e.cause.length} chars, too long to be a discriminator`);
    assert(!e.cause.includes("\n"), `${e.title}: cause spans lines`);
  }
});

// Spec §5.3: no catch-all. Generic guidance measures worse than the raw
// compiler message, so an unmatched failure must reach the model alone.
test("there is no catch-all entry", () => {
  for (const e of entries) {
    assert(e.match.source !== ".", `${e.title} is a catch-all`);
  }
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
node test/routing.test.mjs
```

Expected: `ENOENT` on `playbooks/errors.md`.

- [ ] **Step 3: Write the accessibility entries**

`packs/ui-web/playbooks/errors.md`. Check each `match` against the real rule ids in `captured/a11y.txt` before writing it — if a rule id differs from what is below, the captured output is right and this is wrong.

```markdown
# ui-web error playbook

Format: one `##` entry per failure. `match` is a regular expression tried
against the diagnostic's raw line and message; the first matching entry in
file order wins, so specific entries come before general ones. `fix` is shown
on the first failure, `next` when the same failure returns.

## Image without alt text
match: jsx-a11y/alt-text
kind: compile
cause: An img has no alt attribute, so a screen reader announces the file name or nothing. This is the second most common accessibility defect in real interfaces.
fix:
1. If the image carries meaning, add alt text describing what it conveys, not what it looks like: `alt="Signed in as Ada"`, not `alt="avatar image"`.
2. If it is purely decorative, set `alt=""` explicitly. A missing attribute and an empty one mean different things.
next: If the image comes from props or a CMS, the alt text must come with it — add it to the type and require it at the call site rather than defaulting to "".

## Input without a label
match: jsx-a11y/label-has-associated-control|jsx-a11y/control-has-associated-label
kind: compile
cause: A form control has no label, so nothing announces what it is for. Half of all real pages have this.
fix:
1. Add `<label htmlFor="x">` and give the control `id="x"`. The ids must match exactly.
2. A placeholder is not a label: it disappears on focus and is not announced reliably.
next: If a visible label is unwanted by the design, use `aria-label` on the control, or a visually-hidden label element. Do not leave the control unlabelled.

## Link with no text
match: jsx-a11y/anchor-has-content|jsx-a11y/anchor-is-valid
kind: compile
cause: A link has no discernible text, so it is announced as "link" with no indication of where it goes.
fix:
1. Put text inside the anchor.
2. If it is an icon link, add `aria-label` describing the destination.
next: If the content is injected at runtime, the link must not render at all until it has content — an empty anchor is worse than no anchor.

## Click handler on a non-interactive element
match: jsx-a11y/click-events-have-key-events|jsx-a11y/no-static-element-interactions|jsx-a11y/no-noninteractive-element-interactions
kind: compile
cause: A div or span has an onClick. It is unreachable by keyboard and is not announced as something that can be activated.
fix:
1. Replace the element with a real `button` (or `a` if it navigates). Keyboard handling, focus and semantics then come free.
2. If the element must stay, it needs `role`, `tabIndex={0}` and key handlers — which is strictly more work than using a button.
next: If a button's default styling is the reason for the div, remove the styling instead: `appearance: none` on a button is less work than reimplementing a button.
```

- [ ] **Step 4: Run the test**

```bash
node test/routing.test.mjs
```

Expected: three `ok` lines. If a rule id did not match, correct the entry against the captured file.

- [ ] **Step 5: Commit**

```bash
git add packs/ui-web/playbooks/errors.md test/routing.test.mjs
git commit -m "ui-web: accessibility playbook entries, from captured output"
```

---

### Task 7: TypeScript and React playbook entries

**Files:**
- Modify: `packs/ui-web/playbooks/errors.md` (append)
- Modify: `test/routing.test.mjs` (append tests)

**Interfaces:**
- Consumes: `captured/props.txt`, `captured/hooks.txt`, `captured/nullable.txt`, `captured/syntax.txt`.
- Produces: the complete playbook.

- [ ] **Step 1: Append the failing tests, including Review Focus case 5**

Append to `test/routing.test.mjs`:

```js
test("a prop type mismatch routes to the props entry", () => {
  const line = captured("props").find((l) => /TS2322|TS2741|TS2739/.test(l));
  assert(line, "no captured prop diagnostic");
  const hit = route(line);
  assert(hit && /prop/i.test(hit.title), `${line}\n  routed to ${hit && hit.title}`);
});

test("a possibly-undefined access routes to the nullable entry", () => {
  const line = captured("nullable").find((l) => /TS18048|TS2532|TS2531/.test(l));
  assert(line, "no captured nullable diagnostic");
  const hit = route(line);
  assert(hit && /undefined|optional/i.test(hit.title), `${line}\n  routed to ${hit && hit.title}`);
});

test("a conditional hook routes to the hooks entry", () => {
  const line = captured("hooks").find((l) => /rules-of-hooks/.test(l));
  assert(line, "no captured rules-of-hooks diagnostic");
  const hit = route(line);
  assert(hit && /hook/i.test(hit.title), `${line}\n  routed to ${hit && hit.title}`);
});

// Review Focus 5: a syntax error has no entry, and that is correct. With no
// catch-all, the parsed diagnostic reaches the model on its own rather than
// with generic advice attached — which measures worse than the message alone.
test("a syntax error routes to nothing, and that is the intended outcome", () => {
  const lines = captured("syntax");
  assert(lines.length > 0, "no captured syntax diagnostics");
  for (const line of lines) {
    const hit = route(line);
    assert(hit === null, `${line}\n  matched ${hit && hit.title}; a TS1xxx syntax error should match no entry`);
  }
});

// Spec §5.3: entries are ordered by information gap, so the entry whose
// obvious fix is wrong comes first and the most self-explaining codes last.
test("entries are ordered by information gap", () => {
  const titles = entries.map((e) => e.title);
  const deps = titles.findIndex((t) => /missing a dependency/i.test(t));
  const props = titles.findIndex((t) => /Prop type/i.test(t));
  assert(deps !== -1 && props !== -1, `missing expected entries in ${titles.join(", ")}`);
  assert(deps < props, "exhaustive-deps must precede the prop-mismatch entry: its message is the less useful of the two");
});
```

- [ ] **Step 2: Run to confirm the new tests fail**

```bash
node test/routing.test.mjs
```

Expected: the five new tests FAIL; the Task 6 tests still pass.

- [ ] **Step 3: Append the entries, highest information gap first**

Append to `packs/ui-web/playbooks/errors.md` in the order below — the entry
whose obvious fix is wrong comes first; the most self-explaining codes come
last and exist only to stop a specific wrong move. Check each code against the
captured files before writing it.

```markdown
## Prop type does not match
match: TS2322|TS2741|TS2739|TS2345
kind: compile
cause: A prop was passed with the wrong type, or a required prop was not passed at all. The component's own Props type is the contract.
fix:
1. Read the component's Props type. The error names the expected type and what was given.
2. Fix the call site, not the type — widening the type to make the error go away removes the check that found a real mistake.
next: If the value genuinely can be either type, model that in the type: a union with narrowing at the point of use, or a discriminated union if the variants carry different data.

## Value may be undefined
match: TS18048|TS2532|TS2531|TS2533
kind: compile
cause: An optional prop, an array lookup, or data that has not arrived yet is being used as though it is always present.
fix:
1. Handle the absent case explicitly: an early return, a default value, or conditional rendering.
2. Do not reach for `!` to silence it — the checker is describing a state your component can actually be in.
next: If the value is always present by the time this renders, the type is wrong rather than the code: make the prop required, or split the component so the loaded case has its own non-optional props.

## Hook called conditionally
match: react-hooks/rules-of-hooks|React Hook .* is called conditionally
kind: compile
cause: A hook is inside a condition, loop or early return. React identifies hooks by call order, so a changing order corrupts state between renders.
fix:
1. Move the hook to the top level of the component, before any condition or early return.
2. Put the condition inside the hook instead: `useEffect(() => { if (flag) … }, [flag])`.
next: If the two branches genuinely need different hooks, they are two components. Split them and choose between them in the parent.

## Effect is missing a dependency
match: react-hooks/exhaustive-deps|React Hook .* has (a )?missing dependenc
kind: compile
cause: The effect reads a value it does not list. Adding the value is often the wrong fix.
fix:
1. First ask whether the effect is needed at all — a value derived from props or state should be computed during render, and a response to a user action belongs in the event handler.
2. If the effect is right, move the function or value inside it so it is not a dependency.
next: If adding the dependency caused an infinite loop, the value is recreated on every render. Memoise it with useCallback or useMemo, move it out of the effect's inputs, or lift it — do not disable the rule.

## List item without a key
match: react/jsx-key|Missing "key" prop
kind: compile
cause: Items rendered from an array have no key, so React cannot tell which item is which when the list changes.
fix:
1. Use a stable id from the data: `key={item.id}`.
2. Never use the array index. On reorder or removal, index keys move component state onto the wrong item.
next: If the data has no id, the list is probably derived from something that does — key on that. Generating an id during render makes a new key every render, which is worse than an index.
```

**Do not add a catch-all.** It is tempting and it is wrong: `match: .` fires on
every unrecognised failure, and generic guidance measures *worse* than the raw
compiler message. An unmatched diagnostic should reach the model by itself.

- [ ] **Step 4: Run the tests**

```bash
npm test
```

Expected: every test file passes. If a `TS` code in an entry does not appear in any captured file, remove it from the `match` — an unmatched alternative is a guess.

- [ ] **Step 5: Commit**

```bash
git add packs/ui-web/playbooks/errors.md test/routing.test.mjs
git commit -m "ui-web: TypeScript and React playbook entries, from captured output"
```

---

### Task 8: Chunks

Six chunks, each under 4096 bytes, each registered in the manifest.

**Files:**
- Create: `packs/ui-web/chunks/a11y-semantics.md`
- Create: `packs/ui-web/chunks/a11y-forms.md`
- Create: `packs/ui-web/chunks/a11y-focus.md`
- Create: `packs/ui-web/chunks/state.md`
- Create: `packs/ui-web/chunks/effects.md`
- Create: `packs/ui-web/chunks/types.md`
- Modify: `packs/ui-web/pack.json` (the `chunks` object)

**Interfaces:**
- Consumes: the manifest test from Task 4, which enforces the size limit.
- Produces: chunk names the playbook's catch-all already references (`ui-web/a11y-semantics`, `ui-web/state`, `ui-web/effects`, `ui-web/types`) — these names must match exactly.

- [ ] **Step 1: Register the chunks in the manifest**

Replace `"chunks": {}` in `packs/ui-web/pack.json` with:

```json
  "chunks": {
    "a11y-semantics": {
      "file": "chunks/a11y-semantics.md",
      "summary": "elements before ARIA, accessible names, alt text, landmarks",
      "triggers": ["aria-", "role=", "<img", "alt=", "onClick"]
    },
    "a11y-forms": {
      "file": "chunks/a11y-forms.md",
      "summary": "labels, grouping, required and invalid state, error association",
      "triggers": ["<label", "<input", "<form", "htmlFor", "aria-describedby"]
    },
    "a11y-focus": {
      "file": "chunks/a11y-focus.md",
      "summary": "focus order and visibility, dialogs, keyboard interaction, live regions",
      "triggers": ["tabIndex", "focus()", "role=\"dialog\"", "aria-live", "onKeyDown"]
    },
    "state": {
      "file": "chunks/state.md",
      "summary": "stored versus derived state, lifting, immutability, when to use context",
      "triggers": ["useState", "useReducer", "useContext", "setState"]
    },
    "effects": {
      "file": "chunks/effects.md",
      "summary": "when an effect is wrong, dependencies, cleanup, fetch races",
      "triggers": ["useEffect", "useLayoutEffect", "AbortController", "setTimeout"]
    },
    "types": {
      "file": "chunks/types.md",
      "summary": "props, children, generic components, event types, discriminated unions",
      "triggers": ["React.FC", "ReactNode", "ChangeEvent", "PropsWithChildren", "as "]
    }
  },
```

- [ ] **Step 2: Write each chunk to the shape the ue5 pack uses**

Each chunk: how it works, a correct minimal example, a table of the parts you actually need, and a list of common mistakes. Write the four the playbook references first.

Keep each **under 4096 bytes** — that is roughly 55 lines of prose plus one code block. If a chunk will not fit, split the topic rather than trimming the example; the example is the part the model copies.

For each file, after writing it:

```bash
wc -c packs/ui-web/chunks/<name>.md
```

Expected: under 4096. A chunk at 4000 bytes is fine; one at 4200 must be split.

- [ ] **Step 3: Run the manifest test**

```bash
node test/manifest.test.mjs
```

Expected: four `ok` lines, including the chunk size and summary checks.

- [ ] **Step 4: Verify the names the playbook references resolve**

```bash
grep -o 'ui-web/[a-z0-9-]*' packs/ui-web/playbooks/errors.md | sort -u
node -e 'const m=require("./packs/ui-web/pack.json");console.log(Object.keys(m.chunks).map(c=>"ui-web/"+c).join("\n"))'
```

Expected: every name in the first list appears in the second. A playbook pointing at a chunk that does not exist sends the model to a dead end.

- [ ] **Step 5: Commit**

```bash
git add packs/ui-web/chunks packs/ui-web/pack.json
git commit -m "ui-web: six chunks, each under the tool-output floor"
```

---

### Task 9: Commands and templates

**Files:**
- Create: `packs/ui-web/commands/ui-component.md`
- Create: `packs/ui-web/commands/ui-form.md`
- Create: `packs/ui-web/commands/ui-a11y.md`
- Create: `packs/ui-web/commands/ui-diagnose.md`
- Create: `packs/ui-web/templates/Component.tsx.tmpl`
- Create: `packs/ui-web/templates/Component.test.tsx.tmpl`

**Interfaces:**
- Consumes: the chunk names from Task 8.
- Produces: command files referencing templates by the name the harness serves them under — `pack ui-web/template/Component.tsx.tmpl`.

- [ ] **Step 1: Write the templates**

`packs/ui-web/templates/Component.tsx.tmpl`:

```tsx
type {{NAME}}Props = {
  // Required props first, no defaults. Optional props get a default below.
};

export function {{NAME}}({}: {{NAME}}Props) {
  return null;
}
```

`packs/ui-web/templates/Component.test.tsx.tmpl`:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { {{NAME}} } from "./{{NAME}}";

test("{{NAME}} is reachable by its accessible name", () => {
  render(<{{NAME}} />);
  // Query by role and name, never by test id: if this query cannot find the
  // element, a screen reader cannot either.
  expect(screen.getByRole("TODO", { name: "TODO" })).toBeDefined();
});
```

- [ ] **Step 2: Write the four command files**

`packs/ui-web/commands/ui-component.md`:

```markdown
Create a new React component: $ARGS

1. Find where this project keeps components and follow the same layout and naming.
2. Fetch the templates with the pack tool — `pack ui-web/template/Component.tsx.tmpl` and `pack ui-web/template/Component.test.tsx.tmpl`. A pack lives outside the workspace, so `read_file` cannot reach its files.
3. Fill in `{{NAME}}`. Type every prop explicitly; no `any`.
4. Use the real element for anything interactive, and give every control an accessible name. Fetch `pack ui-web/a11y-semantics` if unsure which element to use.
5. Write the test so it finds the component by role and accessible name. If that query cannot find it, neither can a screen reader — fix the component, not the query.
6. Run the checks. Fix the first error only, then re-run.
```

`packs/ui-web/commands/ui-form.md`:

```markdown
Build or fix a form: $ARGS

1. Fetch `pack ui-web/a11y-forms` before writing anything — missing labels are on half of all real pages, and this is the shape that gets them wrong.
2. Every control gets a `<label htmlFor>` with a matching `id`. A placeholder is not a label.
3. Keep the submit handler on the `form` element's `onSubmit`, not on the button's `onClick`, so the Enter key works.
4. Associate each validation message with its control using `aria-describedby`, and mark invalid controls with `aria-invalid`.
5. Run the checks, then confirm by querying each control by its label in a test.
```

`packs/ui-web/commands/ui-a11y.md`:

```markdown
Audit and fix the accessibility of: $ARGS

Work in this order — it is the order these defects actually occur in real interfaces:

1. **Contrast.** Check text against its background for 4.5:1 (3:1 for large text). No check will catch this, so it has to be read. Report any colour you cannot verify.
2. **Images.** Every `img` has `alt`; decorative images have `alt=""`.
3. **Form controls.** Every one has an associated label.
4. **Links and buttons.** Every one has discernible text; icon-only controls have `aria-label`.
5. **Interactive elements.** Anything with an `onClick` is a real `button` or `a`.
6. Run the lint check, which catches items 2 to 5 but never item 1.

Fetch `pack ui-web/a11y-semantics`, `pack ui-web/a11y-forms` or `pack ui-web/a11y-focus` as needed. Say plainly which items you verified and which you could not.
```

`packs/ui-web/commands/ui-diagnose.md`:

```markdown
Diagnose and fix the current failing check. $ARGS

1. Run the project's verification and read the FIRST error only.
2. The verification names a single root cause, and where the harness has the playbook it attaches the matching entry. Apply that entry's fix and change only what the one error requires.
3. Rebuild. If the same error returns, the fix did not work — follow the entry's `next` step and do not repeat the previous change.
4. If no entry matched, fetch the chunk closest to the failure: `pack ui-web/types` for a TS error, `pack ui-web/effects` for a hook or effect error, `pack ui-web/a11y-semantics` for an accessibility rule.
5. Summarise: the error, its cause, the change you made, and the result.
```

- [ ] **Step 3: Verify every referenced template and chunk resolves**

```bash
grep -oE 'pack ui-web/(template/[A-Za-z.]+|[a-z0-9-]+)' packs/ui-web/commands/*.md | sed 's/.*pack //' | sort -u
ls packs/ui-web/templates packs/ui-web/chunks
```

Expected: every `template/X` names a real file in `templates/`, and every other name is a real chunk. A command that sends the model to a missing file wastes a whole turn.

- [ ] **Step 4: Commit**

```bash
git add packs/ui-web/commands packs/ui-web/templates
git commit -m "ui-web: commands and component templates"
```

---

### Task 10: Validation, evals, and the repo README

**Files:**
- Create: `evals/ui-web/tasks.json`
- Create: `evals/ui-web/README.md`
- Modify: `README.md` (the pack table at the repository root)

**Interfaces:**
- Consumes: the whole pack.
- Produces: a validated, documented pack.

- [ ] **Step 1: Write the eval task set**

`evals/ui-web/tasks.json`:

```json
[
  {
    "id": "uiw-001-alt",
    "prompt": "The build is failing. Fix it.",
    "setup": "In src/Gallery.tsx, remove the alt attribute from the first img.",
    "check": ["lint passes", "the img has meaningful alt text, not alt=\"\"", "no other lines changed"]
  },
  {
    "id": "uiw-002-label",
    "prompt": "Add an email field to the signup form.",
    "setup": "None.",
    "check": ["lint passes", "the input has a label with a matching htmlFor and id", "placeholder is not used as the label"]
  },
  {
    "id": "uiw-003-div-button",
    "prompt": "Make the card's Save area clickable.",
    "setup": "src/Card.tsx has a div with no handler.",
    "check": ["lint passes", "a real button element was used", "no role/tabIndex/onKeyDown reimplementation of a button"]
  },
  {
    "id": "uiw-004-prop-type",
    "prompt": "The build is failing. Fix it.",
    "setup": "In src/Use.tsx, pass label={42} to a component whose label prop is a string.",
    "check": ["typecheck passes", "the call site was fixed, not the Props type widened"]
  },
  {
    "id": "uiw-005-effect-loop",
    "prompt": "The list should refresh when the filter changes, but the page hangs.",
    "setup": "An effect sets state it also depends on, with an object recreated each render.",
    "check": ["typecheck and lint pass", "no infinite render loop", "the dependency was memoised or moved, not the rule disabled"]
  },
  {
    "id": "uiw-006-index-key",
    "prompt": "Items lose their checked state when the list is reordered. Fix it.",
    "setup": "src/ItemList.tsx keys on the array index.",
    "check": ["keys use a stable id from the data", "no index key remains"]
  },
  {
    "id": "uiw-007-repeat",
    "prompt": "The list should refresh when the filter changes, but the page hangs.",
    "setup": "An effect depends on an object literal recreated each render. The obvious fix — adding the dependency — makes it worse.",
    "check": ["the second attempt differed from the first", "the dependency was memoised or moved, not added verbatim", "the rule was not disabled"]
  },
  {
    "id": "uiw-008-contrast",
    "prompt": "Add a muted caption under the heading, styled to match the design's grey.",
    "setup": "The stylesheet has a --muted token at 2.8:1 against the background.",
    "check": ["the agent flagged the contrast ratio rather than using the token silently"]
  }
]
```

Two tasks test things nothing else does. `uiw-008-contrast` is the one check nothing mechanical can make: it tests whether an unverifiable core rule changes behaviour at all, which is the only evidence such prose earns its budget. `uiw-007-repeat` exercises the repeat path — a failure whose obvious fix does not work, so the second round fires the `next` step. No published study covers escalation in agent instructions, so this is the part of the design we have to measure ourselves; record specifically whether the second attempt differed from the first.

- [ ] **Step 2: Write the eval README**

`evals/ui-web/README.md`:

```markdown
# ui-web pack evals

Measures whether the pack makes a model better at React + TypeScript interfaces.

Run each task with the pack disabled and enabled, on each model, through the
real agent (`be-code run --json`), and record: do the checks pass, how many
repair rounds, how many turns, how many tokens, and does the `check` list hold.

## Fixture

`fixtures/ui-web` is the starting project. Each task begins from a clean copy
with its `setup` applied.

## Matrix

| Model | Pack off | Pack on |
|---|---|---|
| Qwen3 8B | | |
| Qwen3 27B | | |
| A frontier model | | |

The pack is worth shipping when 8B and 27B with it close a meaningful part of
the gap to the frontier model without it. A pack that only helps a frontier
model has not earned its context.

Task `uiw-007-contrast` is the one no check can grade: it tests whether a core
rule with no verification behind it changes behaviour at all.
```

- [ ] **Step 3: Validate the pack with the real validator**

```bash
be-code packs validate packs/ui-web ; echo "exit=$?"
```

Expected: `ok` and `exit=0`. Every failure here is a real defect:
- a chunk over 4096 bytes → split it
- a wrapper not executable → `git update-index --chmod=+x`
- a missing verify program → fix the path in the manifest
- core over budget → cut rules

- [ ] **Step 4: Run the whole repo test suite**

```bash
npm test
```

Expected: every test file passes.

- [ ] **Step 5: Add the pack to the repository README**

In `README.md`, add to the pack table:

```markdown
| [`packs/ui-web`](packs/ui-web) | React + TypeScript interfaces: accessibility ordered by measured real-world frequency, state, effects, types. Eleven playbook entries, all written from captured toolchain output | 0.1.0 — seed. Six chunks; contrast and document language are rules rather than checks, because nothing can check them |
```

- [ ] **Step 6: Commit**

```bash
git add evals/ui-web README.md
git commit -m "ui-web: evals and repository README entry"
```

---

### Task 11: Verify the pack end to end in BE-Code

The pack has been tested against its own harness. This task proves it works in the one that will load it.

**Files:** none created; this is a verification task.

**Interfaces:**
- Consumes: the finished pack.

- [ ] **Step 1: Install the pack and confirm it is discovered and active**

```bash
cp -r packs/ui-web ~/.be-code/packs/ui-web
cd fixtures/ui-web
be-code packs
```

Expected: `ui-web` listed, marked `*` (matches this workspace — `package.json` and a `.tsx` file are both present).

- [ ] **Step 2: Confirm the rules and the chunk index reach the prompt**

```bash
be-code packs info ui-web
```

Expected: the index lists all six chunks, and the core text appears with its token estimate under 1500.

- [ ] **Step 3: Confirm a real failure produces a parsed diagnosis and a playbook entry**

Break the fixture deliberately and run one headless request:

```bash
cp broken/a11y.tsx src/Broken.tsx
be-code run -y -C . --json "Fix the failing checks." | tail -40
rm -f src/Broken.tsx
```

Expected in the output: the repair turn names a single root cause in the shape
`src/Broken.tsx:4:7: compile error jsx-a11y/alt-text: …`, followed by
`playbook ui-web › Image without alt text` with its cause and fix. If the
repair turn instead shows raw `npm run build` output, that is the known
interaction in the spec's §6 — record what happened rather than working
around it in the pack.

- [ ] **Step 4: Commit any corrections and push**

```bash
git add -A
git commit -m "ui-web: corrections from end-to-end verification in BE-Code"
```

Then report what Step 3 actually produced, including the §6 interaction if it fired.
