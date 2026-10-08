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
