import { test, assert } from "./run.mjs";
import { readFileSync, readdirSync } from "node:fs";
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
    [
      /click-events-have-key-events|no-static-element-interactions/,
      "Click handler on a non-interactive element",
    ],
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
    assert(
      e.cause.length <= 220,
      `${e.title}: cause is ${e.cause.length} chars, too long to be a discriminator`,
    );
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
    assert(
      hit === null,
      `${line}\n  matched ${hit && hit.title}; a syntax error should match no entry`,
    );
  }
});

// Spec §5.3: entries are ordered by information gap, so the entry whose
// obvious fix is wrong comes first and the most self-explaining codes last.
test("entries are ordered by information gap", () => {
  const titles = entries.map((e) => e.title);
  const deps = titles.findIndex((t) => /missing a dependency/i.test(t));
  const props = titles.findIndex((t) => /Prop type/i.test(t));
  assert(deps !== -1 && props !== -1, `missing expected entries in ${titles.join(", ")}`);
  assert(
    deps < props,
    "exhaustive-deps must precede the prop-mismatch entry: its message is the less useful of the two",
  );
});

// The invariant the whole capture discipline exists to produce: nothing the
// toolchain actually emits goes unrouted. Syntax errors are the one deliberate
// exception and have their own test above.
test("every captured diagnostic outside the syntax case routes somewhere", () => {
  const dir = new URL("../fixtures/ui-web/captured/", import.meta.url).pathname;
  const names = readdirSync(dir)
    .filter((f) => f.endsWith(".txt"))
    .map((f) => f.replace(/\.txt$/, ""))
    .filter((n) => n !== "syntax");
  assert(names.length >= 8, `only ${names.length} captured files`);
  for (const name of names) {
    const lines = captured(name);
    assert(lines.length > 0, `${name}: captured no diagnostic at all`);
    for (const line of lines) {
      assert(route(line), `${name}: nothing matched\n  ${line}`);
    }
  }
});

// Each code below was observed in a captured file; the codes the plan guessed
// at (TS2531, TS2532, TS2533) were not, and are in no match.
test("every TypeScript code a captured file proves routes to the right entry", () => {
  const wants = [
    ["props", /TS2322/, /Prop type/i],
    ["missingprop", /TS2739/, /Prop type/i],
    ["missingprop1", /TS2741/, /Prop type/i],
    ["wrongarg", /TS2345/, /Prop type/i],
    ["nullable", /TS18048/, /undefined/i],
    ["nullobject", /TS18047/, /undefined/i],
  ];
  for (const [file, code, title] of wants) {
    const line = captured(file).find((l) => code.test(l));
    assert(line, `${file}: no captured line for ${code}`);
    const hit = route(line);
    assert(hit && title.test(hit.title), `${line}\n  routed to ${hit && hit.title}, want ${title}`);
  }
});

// A whole-branch review found this one by routing the pack's own a11y-focus
// Dialog example through the pack's own matcher. jsx-a11y reports
// no-noninteractive-element-interactions for a key handler on a role="dialog"
// container, that line matched "Click handler on a non-interactive element",
// and its fix says "replace the element with a real button" — which deletes
// the dialog. The rule was never in any captured file, so it was a guess in
// the first place; with no catch-all, the message now reaches the model alone,
// which is the right outcome for a failure the pack does not actually know.
test("a non-interactive-element-interactions diagnostic routes to nothing", () => {
  const line =
    'src/Dialog.tsx(14,5): error ESL001: jsx-a11y/no-noninteractive-element-interactions: ' +
    "Non-interactive elements should not be assigned mouse or keyboard event listeners.";
  const hit = route(line);
  assert(
    hit === null,
    `routed to ${hit && hit.title}, whose fix would replace a dialog with a button`,
  );
});

// TS2345 is the generic wrong-argument error and fires anywhere in a project —
// a utility, a reducer, a test helper. Its own captured evidence
// (captured/wrongarg.txt) is a plain function call with no component and no
// Props type in the file, so an entry telling the model to go and read a
// Props type sends it looking for something that does not exist.
test("the prop entry's fix does not assume a component", () => {
  const line = "src/wrongarg.tsx(7,20): error TS2345: Argument of type 'number' is not assignable.";
  const hit = route(line);
  assert(hit, "TS2345 must still route");
  assert(
    /signature/i.test(hit.fix),
    `fix must name the signature the error reports, not only a Props type:\n${hit.fix}`,
  );
});

// The dependency entry is reachable only for a project that elevates
// exhaustive-deps to an error. hooks-strict.txt is that project, captured.
test("an elevated exhaustive-deps diagnostic routes to the dependency entry", () => {
  const line = captured("hooks-strict").find((l) => /exhaustive-deps/.test(l));
  assert(line, "no captured exhaustive-deps diagnostic");
  const hit = route(line);
  assert(
    hit && /missing a dependency/i.test(hit.title),
    `${line}\n  routed to ${hit && hit.title}`,
  );
});
