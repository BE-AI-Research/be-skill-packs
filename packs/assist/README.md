# assist pack

A personal assistant over the state of the work. Version 0.1.0.

## Install

```sh
cp -r packs/assist ~/.be-code/packs/assist
```

Then switch it on, in the workspace you want it for:

```
/packs on assist
```

**It is never switched on automatically.** The pack declares no `detect`
block, so it does not activate because you opened a repository. A personal
assistant should be a choice.

## What it does

It reads what is true about the workspace and says the few things worth
saying. The facts come from one deterministic place, `tools/scan`, so they are
never inferred:

```
# assist scan  2026-10-09T08:00:05Z  workspace=/home/me/proj
git     branch=main upstream=origin/main ahead=15 behind=0 dirty=0
git     stale-branches=6 fix/ghost-rows(merged) fix/console(merged) +4 more
tasks   dir=.be-code/tasks count=7 doing=003 todo=3 active=1 done=2 blocked=1 dropped=0 stale>14d=2(001,004)
change  unreleased=6-entries version=1.2.5 latest-tag=v1.2.5 matches=yes
notes   (none)
```

The judgement is the pack's core rules, whose spine is **withholding**:
interrupting costs more than the message takes to read, so most of what is
true is not worth raising. "Nothing worth raising" is an expected answer.

| Command | Does |
|---|---|
| `/assist-brief` | The brief: at most five items, usually fewer. |
| `/assist-triage` | Loose notes into task documents. |
| `/assist-release` | Changelog and version readiness, stopping at "ready". |
| `/assist-followup` | What was owed and is late; what has already been said. |

## What it does not do

Worth knowing before you rely on it:

- **No test or CI state.** Running a suite takes minutes and would need its
  own grant, and a scan reporting stale or guessed test results is worse than
  one that stays quiet. The `notes` line says what it could not read.
- **Nothing outward-facing, ever.** It never merges, pushes, publishes,
  releases or deletes. It says what is ready and the decision stays with you.
- **It cannot create its own schedule.** A pack is data. You run the line
  below.
- **One workspace at a time.** The scan reads the workspace it is given.
- **No mail or calendar.** That was designed as a second phase and is not
  here: a pack's `mcp_servers` field is parsed and nothing starts it, so a
  pack cannot bring its own connectors.

## Running the brief on a schedule

**A schedule's instruction is sent to the model as plain text. Slash commands
are not expanded.** The harness expands a custom command in exactly two places
— the TUI's submit path and the plain REPL's — and a fired schedule reaches
`RunFull` without passing either. A schedule whose instruction is
`/assist-brief` therefore delivers those six characters and nothing else: no
scan, no log, no five-item ceiling, and none of the grants below ever used for
their purpose.

So the instruction goes inline. This line was checked against
`internal/ui/schedule.go`'s `ParseScheduleAdd` for its shape and against
`internal/schedule/allow.go`'s `WriteAllowed` for whether each grant covers
the files it is meant to:

```
/schedule add brief weekdays 08:00 -- Give the morning brief. Run `node ~/.be-code/packs/assist/tools/scan --project .` and say nothing about this workspace that is not in its output; if its notes line says something could not be read, say so. Read .be-code/assist/brief-log.md; anything already raised twice becomes a question rather than a third mention. Raise at most five items and usually fewer — "nothing worth raising" is a complete answer. Each item: what it is, why it matters now, what you would do. Append what you raised to the log, one line each with the date and a stable key. Never merge, push, publish, release or delete. allow shell: node */packs/assist/tools/scan*; write: .be-code/assist; write: .be-code/tasks; write: CHANGELOG.md
```

It repeats what `commands/assist-brief.md` says because it has to: the pack's
core rules are in the system prompt, but the command body is not.

**A schedule only fires inside a running session.** The scheduler is built for
interactive sessions and stopped by `finishSession`, so adding the line and
closing the terminal gets you nothing at 08:00. Run the session as a live host
(`be-code` detaches by default; `be-code attach <code>` rejoins it) and leave
it running.

Two details of the syntax are easy to get wrong, and both fail quietly:

- **One `allow` clause, grants separated by `;`** — not an `allow` per grant.
  Only the last ` allow ` on the line is read.
- **A write grant is a path prefix, not a glob.** `write: .be-code/assist`
  covers everything under that directory. `write: .be-code/assist/**` parses
  without complaint and then matches nothing, because `WriteAllowed` compares
  prefixes — only `browser:` and `tool:` grants are globs. A grant written
  that way leaves the assistant asking for every write in an unattended turn.

A scheduled turn gates every tool call, so each grant is there for a reason:

| Grant | Why |
|---|---|
| `shell: node */packs/assist/tools/scan*` | To run the scan. One read-only script inside the pack. |
| `write: .be-code/assist` | The brief log, so "raise a thing twice, then ask" can work at all. |
| `write: .be-code/tasks` | To annotate task documents. |
| `write: CHANGELOG.md` | To draft an entry. |

`read_file`, `list_dir`, `search` and the `pack` tool need no grant — they
gate themselves.

**Without the `.be-code/assist` grant the escalation rule degrades to raising
the same thing every morning** — which is the behaviour the rule exists to
prevent. If you would rather not grant it, drop the schedule and run
`/assist-brief` by hand instead; the log still works when you are there to
approve the write.

## Every brief triggers your project's verification

Not only a scheduled one, and not because of the log write — because of the
scan. BE-Code verifies the project after any request in which `shell`,
`process`, `write_file` or `edit_file` ran (`dispatch` sets `reqTouched` for
all four), and the brief's first act is to run the scan through `shell`. So in
a repository whose suite is red — or merely flaky under load — a brief comes
back `verification failed; repair attempt 1/N` and the assistant goes off
reading and editing source to fix a test it never touched. With `max_repairs`
high and `-y` approving writes, that runs for a long time.

**Set `verify_on_done: false` in the workspace you run the brief in.**

```json
{ "verify_on_done": false }
```

That is the only remedy. Dropping the write grant does not help — the scan
still runs through `shell` — and it costs the escalation rule for nothing.
Keeping the suite green makes every brief cost the suite's runtime.

Everything the pack's rules say about withholding and about decisions that are
not yours is still true of the brief itself. The repair loop arrives
afterwards, from the harness, and no wording in a pack can prevent it.

`.be-code/` is already in your project's `.gitignore` if BE-Code has ever
written a task document there, so the log is untracked by default.
