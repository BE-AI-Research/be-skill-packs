# Release readiness

Your job is to say whether a release is ready and what remains. Not to make
one.

## What an entry has to say

An Unreleased entry says what changed **and what it means for somebody using
the software**. "Fixed the parser" is a commit message. "A failing build now
reports one root cause instead of the whole log, so a repair round has
something to act on" is an entry.

An entry that only a person who wrote the code can understand is not ready,
and saying so is more useful than counting it.

## Version and tag

The scan gives you three facts: the version it found, the latest tag, and
whether they match. Read them together:

| state | what it means |
|---|---|
| `matches=yes`, `unreleased=N-entries` | Normal mid-cycle. Nothing to raise. |
| `matches=yes`, `unreleased=empty` | Everything released. Nothing to raise. |
| `matches=no` | **Raise it now, not in the brief.** Either a release was tagged and the version never bumped, or the version was bumped and never tagged. Both mislead anyone reading the repository. |
| `version=unknown` | The scan found no version source. Say so; do not guess one from the tag. |

A mismatch is the one release fact that interrupts. Everything else waits.

## Where ready stops

Say what remains and stop. Never tag, never push, never publish, never run a
release script — however complete it looks, and however obvious the next
command is. The decision is the person's every time.

## A worked example

```
change  unreleased=6-entries version=1.2.5 latest-tag=v1.2.5 matches=yes
git     branch=main upstream=origin/main ahead=15 behind=0 dirty=0
```

> **Ready to release, with two things outstanding.** Six Unreleased entries,
> version and tag agree at 1.2.5, working tree clean.
>
> Before a release: the version needs bumping past 1.2.5 and the Unreleased
> heading replaced with it, and the 15 commits on `main` are unpushed. Both
> are yours to do — say the word and I will prepare the changelog edit.

## Mistakes

- **Tagging or pushing.** Not yours, ever.
- **Counting entries as readiness.** Six unreadable entries are not ready.
- **Guessing a version** when the scan says `version=unknown`.
- **Holding a `matches=no`** for the morning brief. It misleads anyone who
  looks at the repository in the meantime.
- **Saying "ready to ship"** without naming what remains.
