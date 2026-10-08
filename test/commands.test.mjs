// A command that sends the model to a file the pack does not have wastes a
// whole turn and teaches it to distrust the pointers. The plan checked this
// with a grep by hand; a test checks it on every change.

import { test, assert } from "./run.mjs";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const root = new URL("../packs/ui-web/", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(root + "pack.json", "utf8"));
const dir = root + (manifest.commands ?? "commands") + "/";

const files = readdirSync(dir).filter((f) => f.endsWith(".md"));

test("the pack declares a commands directory that has commands in it", () => {
  assert(manifest.commands, "pack.json declares no commands directory");
  assert(files.length >= 4, `only ${files.length} command files`);
});

test("every command takes the user's argument text", () => {
  for (const f of files) {
    const text = readFileSync(dir + f, "utf8");
    assert(text.includes("$ARGS"), `${f} never uses $ARGS`);
  }
});

// `pack ui-web/template/X` resolves as the pack tool resolves it: the path as
// given, then under templates/. Anything else must be a registered chunk.
test("every pack reference in a command resolves to a real file or chunk", () => {
  const chunks = new Set(Object.keys(manifest.chunks ?? {}));
  let refs = 0;
  for (const f of files) {
    const text = readFileSync(dir + f, "utf8");
    for (const [, ref] of text.matchAll(/pack ui-web\/(template\/[\w.\-/]+|[a-z0-9-]+)/g)) {
      refs++;
      if (ref.startsWith("template/")) {
        const rel = ref.slice("template/".length);
        assert(
          existsSync(root + rel) || existsSync(root + "templates/" + rel),
          `${f} points at template ${rel}, which does not exist`,
        );
      } else {
        assert(chunks.has(ref), `${f} points at chunk ${ref}, which is not in the manifest`);
      }
    }
  }
  assert(refs >= 6, `only ${refs} pack references across ${files.length} commands`);
});

// The templates are what the model copies, so a placeholder it cannot see is
// worse than none: it ships {{NAME}} into the project.
test("every template marks its placeholders in the documented form", () => {
  const templates = readdirSync(root + "templates");
  assert(templates.length >= 2, `only ${templates.length} templates`);
  for (const t of templates) {
    const text = readFileSync(root + "templates/" + t, "utf8");
    assert(/\{\{[A-Z_]+\}\}/.test(text), `${t} has no {{PLACEHOLDER}}`);
  }
});

// Task 1 found that vitest does not provide test/expect as globals unless the
// project opts in, so a template relying on them produces "test is not
// defined" in a fresh project — the exact failure the fixture already hit.
test("a template test imports what it calls rather than assuming globals", () => {
  const text = readFileSync(root + "templates/Component.test.tsx.tmpl", "utf8");
  for (const fn of ["test", "expect"]) {
    if (new RegExp(`\\b${fn}\\(`).test(text)) {
      assert(
        new RegExp(`import \\{[^}]*\\b${fn}\\b[^}]*\\} from "vitest"`).test(text),
        `the test template calls ${fn}() without importing it from vitest`,
      );
    }
  }
});
