# Composing a brief

The scan tells you what is true. A brief says what matters, and most of what
is true does not matter this morning.

## Order by what blocks what

Not by when it happened — the scan is already in its own order and a brief
that repeats it is a log. Ask of each item: does anything the person plans to
do today run into this? Those come first. Then what expires. Then what was
owed to somebody else and is late. Everything else is probably not an item.

## The shape of an item

Three parts, in this order:

1. **What it is**, in one clause, naming the thing: a branch, a document, a
   version.
2. **Why it matters now** — not why it matters in general. "Unpushed" is not a
   reason; "unpushed, and the pack repo it belongs with is about to be
   published" is.
3. **What you would do.** A specific next action, not "look into it".

No item without a next action. If you cannot name one, you have found
something true rather than something worth saying.

## A worked example

A scan with eight observations in it:

```
git     branch=main upstream=origin/main ahead=15 behind=0 dirty=0
git     stale-branches=6 fix/ghost-rows(merged) fix/console(merged) …
tasks   dir=.be-code/tasks count=7 doing=003 todo=4 blocked=1 stale>14d=2(001,004)
change  unreleased=6-entries version=1.2.5 latest-tag=v1.2.5 matches=yes
notes   (none)
```

The brief that should come out of it:

> **Task 001 has been blocked for sixteen days.** It is the only blocked
> document and nothing else can close while it stands. I would ask whether it
> is still real or should be dropped.
>
> **Six branches are merged and still local.** Harmless, but they make
> `git branch` unreadable and two of them look like work you finished a
> fortnight ago. I would delete the merged ones.

The other six observations were left out, and this is why: 15 unpushed commits
with a matching tag and a full changelog is a decision waiting for the person,
not a problem — raising it daily would train them to skim. `doing=003` is what
they are already doing. `dirty=0`, `behind=0` and `notes (none)` are the
absence of news. Four todo documents is the normal state of a project.

## Length

**At most five items, and five is a ceiling rather than a target.** Two is a
good brief. One is a good brief. "Nothing worth raising" is a complete and
good answer, and saying it on a quiet morning is the clearest evidence that
the other mornings were worth reading.

## Mistakes

- **Padding to a number.** Five items every day means the judgement is not
  running.
- **Reporting the absence of news.** `dirty=0` is not an item.
- **Recapping the scan.** If the brief reads like the scan with sentences
  around it, nothing was decided.
- **Hedging.** "You may want to consider possibly looking at" is not a next
  action.
- **Raising what was raised yesterday** without checking the log. See
  `assist/escalation`.
