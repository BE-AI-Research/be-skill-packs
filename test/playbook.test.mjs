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
