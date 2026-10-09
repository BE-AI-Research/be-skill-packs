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

// The three ways this second implementation drifted from the Go matcher it
// stands in for, each checked against internal/playbook/playbook.go. A
// divergence here means the tests in this repository prove something about
// behaviour the harness does not have.

// Go: `if seen[key] { warn("…keeping the first"); continue }`
test("a repeated field key keeps the first value, as the Go parser does", () => {
  const entries = parsePlaybook(`## E
match: first
cause: the first cause
cause: the second cause
fix:
1. f
next: n
`);
  assert(entries.length === 1, `got ${entries.length} entries`);
  assert(entries[0].cause === "the first cause", `kept ${JSON.stringify(entries[0].cause)}`);
});

test("a repeated match line keeps the first regex", () => {
  const entries = parsePlaybook(`## E
match: first
match: second
cause: c
fix:
1. f
next: n
`);
  assert(entries[0].match.source === "first", entries[0].match.source);
});

// Go: a bad regex warns and skips that entry; the rest of the document still
// parses. The JS version threw, which aborted the whole parse — so one typo
// in one entry would have taken the entire playbook down in the tests while
// costing the harness only that entry.
test("a bad match regex skips just that entry, not the whole document", () => {
  const entries = parsePlaybook(`## Broken
match: (unclosed
cause: c
fix:
1. f
next: n

## Fine
match: works
cause: c
fix:
1. f
next: n
`);
  assert(entries.length === 1, `got ${entries.length} entries: ${entries.map((e) => e.title)}`);
  assert(entries[0].title === "Fine", entries[0].title);
});

test("an entry with no match line is skipped", () => {
  const entries = parsePlaybook(`## No match
cause: c
fix:
1. f
next: n
`);
  assert(entries.length === 0, `got ${entries.length} entries`);
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
