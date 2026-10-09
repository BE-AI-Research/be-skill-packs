# Raising a thing twice, then asking

An assistant who reports the same item every morning has stopped assisting.
Either it matters and nothing is happening, or it does not matter and the
mention is noise. Both are questions, and the third mention is where you ask.

## The log

`.be-code/assist/brief-log.md`, one line per item raised:

```markdown
2026-10-07  stale-branches  six merged branches still local
2026-10-08  stale-branches  six merged branches still local
2026-10-08  task-001        blocked sixteen days
```

Three fields: the date, a short stable key, and the text as you put it. **The
key is what makes two mentions comparable** — the wording will drift, the key
must not. Reuse an existing key rather than inventing a near-miss.

Read the log before composing anything. Append to it after.

If the log does not exist yet, say so rather than implying nothing has ever
been raised — a missing log and a quiet fortnight look identical otherwise,
and only one of them means the escalation rule is working.

## What counts as the same item

The same **subject**, not the same sentence. Six merged branches today and
seven tomorrow is the same item. Task 001 blocked at fourteen days and at
sixteen days is the same item. A different task being blocked is a new one.

Changed circumstances make it new again: if the thing you said would happen
has happened — the branch is no longer merely stale but now conflicts — that
is a new item with a new reason, and the count starts over.

## The third time

Name it, say it has been raised twice, and ask which it is:

> **The six merged branches have come up twice now and are still there.** I
> would rather stop mentioning them than mention them again: do they matter,
> or is something stopping you deleting them? If they do not matter I will
> drop them from the brief.

Then stop tracking it. Once asked, it leaves the log until something changes.
Asking and then raising it again next morning is worse than never asking.

## Mistakes

- **Inventing a new key** for the same subject, which resets the count and
  defeats the rule.
- **Asking without proposing to stop.** The point of the question is to get
  the item off the list one way or the other.
- **Counting mentions you made in conversation.** The log is what was raised
  in a brief.
- **Treating a missing log as a quiet fortnight.** Say it is missing.
- **Keeping an item in the log after asking.** It leaves until something
  changes.
