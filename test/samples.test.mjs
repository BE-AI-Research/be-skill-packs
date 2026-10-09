// The pack's code samples are the highest-leverage bytes in it — the plan says
// outright that the example "is the part the model copies" — and until now they
// were the only part nothing verified. A whole-branch review found three
// defects in them at once, each of which a model would copy into a user's
// project and then be told to fix by the pack's own playbook:
//
//   - the a11y-focus Dialog tripped jsx-a11y/no-noninteractive-element-
//     interactions, and that diagnostic routed to "Click handler on a
//     non-interactive element", whose fix is "use a real button" — advice that
//     deletes the dialog.
//   - types.md's event table named `MouseEvent<…>` and `KeyboardEvent<…>`,
//     which are non-generic DOM globals: TS2315, a code with no playbook entry.
//   - Component.tsx.tmpl's `({}: Props)` fails no-empty-pattern, which is in
//     eslint:recommended, so the model's first check after /ui-component failed
//     on the pack's own template.
//
// So the samples are now linted and type-checked like any other source.

import { test, assert } from "./run.mjs";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PACK = new URL("../packs/ui-web/", import.meta.url).pathname;
const FIXTURE = new URL("../fixtures/ui-web", import.meta.url).pathname;
const LINT = join(PACK, "tools/lint");
const TYPECHECK = join(PACK, "tools/typecheck");

// What counts as a checkable sample:
//
//   - A block containing an ellipsis is deliberately elided prose and claims
//     nothing about compiling.
//   - A chunk block that declares nothing — the four `setItems(...)` lines in
//     state.md, the one-line live region in a11y-focus.md — is a snippet from
//     inside a function, not a file. Requiring `export` or `function` keeps
//     the blocks that are whole modules, which are the ones a model copies.
//   - A template is a whole file by definition, so it is always included, and
//     is written under the name its own sibling imports (`Sample.tsx`) so the
//     relative import in the test template resolves.
//
// The count assertions in the first test exist because every one of these
// exclusions could otherwise quietly empty the suite out.
const ELIDED = "…";

// An ellipsis in a string or in JSX text is content — `Searching…` is a real
// label — while one standing where code belongs is an elision. Checking for
// the character alone skipped the pack's only async example, which is exactly
// the sample most worth checking, so strings and JSX text are removed first.
function elided(body) {
  const code = body
    .replace(/"[^"\n]*"/g, '""')
    .replace(/'[^'\n]*'/g, "''")
    .replace(/`[^`]*`/g, "``")
    .replace(/>[^<>{}\n]*</g, "><");
  return code.includes(ELIDED);
}

function samples() {
  const out = [];
  for (const f of readdirSync(join(PACK, "chunks"))) {
    const text = readFileSync(join(PACK, "chunks", f), "utf8");
    let i = 0;
    for (const [, body] of text.matchAll(/```tsx\n([\s\S]*?)```/g)) {
      i++;
      if (elided(body)) continue;
      if (!/\b(export|function)\b/.test(body)) continue;
      out.push({ name: `${f.replace(/\.md$/, "")}-${i}`, body });
    }
  }
  for (const f of readdirSync(join(PACK, "templates"))) {
    const body = readFileSync(join(PACK, "templates", f), "utf8").replace(/\{\{NAME\}\}/g, "Sample");
    const name = f.startsWith("Component.test") ? "Sample.test" : "Sample";
    if (!elided(body)) out.push({ name, body });
  }
  return out;
}

// What a chunk may lean on without declaring it. These are ambient globals in
// their own .d.ts rather than text prepended to each sample, because a sample
// that imports `useId` itself would otherwise collide with the preamble's copy
// (no-redeclare, TS2440) — the harness would be reporting its own noise as a
// finding about the pack.
const AMBIENT = `import type { ReactNode } from "react";
declare global {
  // No hooks here on purpose. Supplying them ambiently let every example omit
  // its own import line, so a copied block gave the reader TS2304 with no
  // playbook entry to route it. Each sample now imports what it calls, and
  // leaving them out of this file is what keeps that true.
  //
  // Project-specific names stay ambient: a chunk cannot define the reader's
  // whole application, and eliding a domain type is not the same kind of
  // omission as eliding an import anyone can copy.
  type Item = { id: string; price: number; qty: number; checked?: boolean };
  type Result = { id: string; title: string };
  // Deliberately permissive: a chunk names a Props type it does not show, and
  // the point of this harness is the accessibility and rule checks, not
  // inventing the type a sample elided.
  type Props = Record<string, any>;
  const formatPrice: (n: number) => string;
  const save: () => void;
  const close: () => void;
  const XIcon: (p: Props) => ReactNode;
  const ResultList: (p: Props) => ReactNode;
  const status: string;
}
export {};
`;

function project(samples, { recommended }) {
  const dir = mkdtempSync(join(tmpdir(), "samples-"));
  mkdirSync(join(dir, "src"), { recursive: true });
  cpSync(join(FIXTURE, "package.json"), join(dir, "package.json"));
  cpSync(join(FIXTURE, "tsconfig.json"), join(dir, "tsconfig.json"));
  symlinkSync(join(FIXTURE, "node_modules"), join(dir, "node_modules"), "dir");
  writeFileSync(
    join(dir, "eslint.config.mjs"),
    `import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "jsx-a11y": jsxA11y, "react-hooks": reactHooks, "@typescript-eslint": tseslint.plugin },
    rules: {
      ${recommended ? "...js.configs.recommended.rules," : ""}
      ...jsxA11y.flatConfigs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      // TypeScript resolves identifiers; the base rule does not understand
      // type-only or JSX references and would report the preamble as undefined.
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
`,
  );
  writeFileSync(join(dir, "src", "ambient.d.ts"), AMBIENT);
  for (const s of samples) {
    writeFileSync(join(dir, "src", `${s.name}.tsx`), s.body);
  }
  return dir;
}

function run(bin, dir) {
  try {
    return { out: execFileSync(bin, ["--project", dir], { encoding: "utf8" }), code: 0 };
  } catch (err) {
    return { out: (err.stdout ?? "") + (err.stderr ?? ""), code: err.status ?? 1 };
  }
}

test("an ellipsis in content is not mistaken for an elision", () => {
  assert(!elided('<p aria-live="polite">Searching…</p>'), "JSX text ellipsis");
  assert(!elided('const label = "Loading…";'), "string ellipsis");
  assert(!elided("const t = `one…two`;"), "template-literal ellipsis");
  assert(elided("state.items.map(…);"), "elided call argument");
  assert(elided("useEffect(() => { if (flag) … }, [flag]);"), "elided effect body");
});

test("the async effect example is among the checked samples", () => {
  // It was silently skipped: the only sample with cancellation, a cleanup
  // function and a catch, and nothing was verifying it.
  const names = samples().map((s) => s.name);
  assert(
    names.some((n) => n.startsWith("effects")),
    `effects.md's example is not being checked: ${names}`,
  );
});

test("there are samples to check, from chunks and from templates", () => {
  const found = samples();
  assert(found.length >= 6, `only ${found.length} checkable samples: ${found.map((s) => s.name)}`);
  assert(
    found.some((s) => s.name.startsWith("a11y-focus")),
    "the a11y-focus example is not being checked",
  );
  assert(
    found.some((s) => s.name === "Sample") && found.some((s) => s.name === "Sample.test"),
    `both templates must be checked, got ${found.map((s) => s.name)}`,
  );
});

test("every code sample lints clean under the pack's own lint check", () => {
  const dir = project(samples(), { recommended: false });
  const { out, code } = run(LINT, dir);
  assert(code === 0, `the pack's own samples fail its own lint check:\n${out}`);
});

// eslint:recommended is what most real projects enable and the fixture does
// not, which is how no-empty-pattern reached a shipped template unnoticed.
test("every code sample lints clean under eslint:recommended too", () => {
  const dir = project(samples(), { recommended: true });
  const { out, code } = run(LINT, dir);
  assert(code === 0, `samples fail under eslint:recommended:\n${out}`);
});

test("every code sample type-checks", () => {
  const dir = project(samples(), { recommended: false });
  const { out, code } = run(TYPECHECK, dir);
  assert(code === 0, `the pack's own samples do not type-check:\n${out}`);
});

// The event-type table is denser and more copyable than any example, and its
// rows are types a model will paste verbatim. Each must be a real React type
// of the right generic arity, given the import the chunk now documents.
test("every event type in types.md's table compiles as written", () => {
  const text = readFileSync(join(PACK, "chunks/types.md"), "utf8");
  const rows = [...text.matchAll(/`((?:React\.)?[A-Z]\w*<[^`>]*>)`/g)]
    .map((m) => m[1])
    // Prose writes `React.MouseEvent<…>` to mean "whatever element"; an
    // elided type argument is not a claim that it compiles.
    .filter((r) => !r.includes(ELIDED));
  // The four event types are the rows this exists for: two of them,
  // MouseEvent and KeyboardEvent, are also non-generic DOM globals, so a row
  // written without the React import compiles to TS2315 and routes nowhere.
  for (const name of ["ChangeEvent", "MouseEvent", "FormEvent", "KeyboardEvent"]) {
    assert(
      rows.some((r) => r.includes(name)),
      `types.md no longer documents ${name}; was the table changed?`,
    );
  }

  const dir = mkdtempSync(join(tmpdir(), "types-"));
  mkdirSync(join(dir, "src"), { recursive: true });
  cpSync(join(FIXTURE, "package.json"), join(dir, "package.json"));
  cpSync(join(FIXTURE, "tsconfig.json"), join(dir, "tsconfig.json"));
  symlinkSync(join(FIXTURE, "node_modules"), join(dir, "node_modules"), "dir");
  const names = [...new Set(rows.map((r) => r.replace(/^React\./, "").replace(/<.*/, "")))];
  writeFileSync(
    join(dir, "src", "Table.tsx"),
    `import type * as React from "react";\n` +
      `import type { ${names.join(", ")} } from "react";\n` +
      rows.map((r, i) => `export type T${i} = ${r};`).join("\n") +
      "\n",
  );
  const { out, code } = run(TYPECHECK, dir);
  assert(code === 0, `a type in types.md's table does not compile:\n${out}`);
});
