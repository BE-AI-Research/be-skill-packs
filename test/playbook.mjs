// A second implementation of the playbook rules in docs/PACK-FORMAT.md, so
// pack content can be tested in this repository. BE-Code's Go matcher is
// authoritative; if the two ever disagree, the Go one is right and this is
// the bug. The rules are small enough that a second copy is cheaper than a
// cross-repository test.

const KEYS = ["match", "kind", "cause", "fix", "next"];

export function parsePlaybook(text) {
  const entries = [];
  let cur = null;
  let seen = null;
  let field = "";
  let inFence = false;

  const flush = () => {
    // An entry with no usable match is dropped, exactly as the Go parser
    // drops one with no match line or an uncompilable regex.
    if (cur && cur.match) entries.push(cur);
    cur = null;
    seen = null;
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
      seen = new Set();
      field = "";
      continue;
    }
    if (!cur) continue;
    let matchedKey = null;
    if (!inFence) {
      for (const k of KEYS) {
        if (trimmed.startsWith(k + ":")) {
          matchedKey = k;
          break;
        }
      }
    }
    if (matchedKey) {
      const value = trimmed.slice(matchedKey.length + 1).trim();
      // The Go parser warns and keeps the first value for a repeated key.
      // Overwriting with the last, as this did, means a document with a
      // duplicated line behaves one way here and another in the harness.
      if (seen.has(matchedKey)) {
        field = "";
        continue;
      }
      seen.add(matchedKey);
      if (matchedKey === "match") {
        try {
          cur.match = new RegExp(value);
        } catch {
          // Go compiles the regex and, on failure, warns and skips the entry.
          // Throwing here aborted the whole parse instead, so one typo looked
          // far worse in these tests than it does in the harness.
          cur.match = null;
        }
        field = "";
      } else if (matchedKey === "kind") {
        cur.kind = value;
        field = "";
      } else {
        cur[matchedKey] = value;
        field = matchedKey;
      }
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
