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
        if (trimmed.startsWith(k + ":")) {
          matchedKey = k;
          break;
        }
      }
    }
    if (matchedKey) {
      const value = trimmed.slice(matchedKey.length + 1).trim();
      if (matchedKey === "match") {
        cur.match = new RegExp(value);
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
