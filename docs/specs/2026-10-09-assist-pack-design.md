# The `assist` pack — design

A personal-assistant pack for BE-Code: it watches the state of the work, and
says the few things worth saying.

## 1. What this is for

Shayne runs several repositories with work in flight across them — unpushed
branches, task documents mid-flow, a changelog that has to be true before a
release, worktrees left behind. Keeping that in his head is the cost this pack
is meant to remove. Success is a short morning brief he acts on, and silence
on the mornings when there is nothing to act on.

**Phase 1, which this spec covers, is an assistant over the work BE-Code
already touches.** Git state, the task documents, the changelog. It needs no
connectors, so it works the day it ships.

**Phase 2, deferred, is the office assistant** — mail, calendar, follow-ups.
It is deferred for a concrete reason rather than a vague one: a pack's
`mcp_servers` field is parsed and nothing starts it (confirmed while fixing
the pack loader; the trust prompt now says so). A pack therefore cannot bring
its own Gmail or Calendar connector, and could only teach the model to use
whatever the person happened to wire into `~/.be-code/config.json` — which it
can neither require nor check. Phase 1 is designed so phase 2 is additive:
the core traits and the judgement chunks are domain-neutral, and only the
scan and the commands are dev-work-specific.

## 2. What the research actually says

The user asked for this to be based on the traits of the best assistants, so
it matters to be straight about what that evidence is.

**The trait literature is practitioner opinion, not research.** Vendor guides,
recruiter blogs and hiring advice converge on the same differentiators —
anticipation, judgement about when to act, discretion tied to access — and
several attribute those claims to HBR or SHRM studies that could not be
located and appear only in vendor content. Melba Duncan's *The Case for
Executive Assistants* (Harvard Business Review, May 2011) is real, but argues
return-on-investment and deployment rather than a trait taxonomy. **The pack
will not cite research it cannot stand behind.** That is the same discipline
that made the `ui-web` pack honest: a claim written from a secondary citation
is a guess.

**One trait does have real literature, and it is the one every source calls
the differentiator**: that knowing what *not* to raise matters more than
responding quickly. Interruption cost is genuinely studied —

- Altmann & Trafton (2004), resumption lag: the cost of resuming grows with
  how long the interruption lasted, because state about the original task is
  lost.
- Mark, Gonzalez & Harris (CHI 2005): the often-quoted ~23 minutes is the
  **average elapsed time before someone returns to an interrupted task**, not
  a fixed penalty per interruption. The pack states the mechanism and omits
  the number, because the number is routinely misquoted.
- Leroy (2009), attention residue: part of someone's attention stays on the
  unfinished task, so a switch costs more than the time it takes.
- Iqbal & Horvitz (CHI 2007): notification timing and disruption in computing
  tasks.

So the pack's spine is **withholding**, and that is the part that is grounded.
Everything else in core is judgement, and the evals in §8 are how we find out
whether it earns its budget.

## 3. Architecture: half the pack format, on purpose

| Part | Used | Why |
|---|---|---|
| `core.md` | yes | The traits as always-on operating rules. |
| `chunks/` | yes | On-demand judgement material the core points at. |
| `commands/` | yes | The four things a person asks for by name. |
| `tools/scan` | yes | The facts, deterministically, so they are never invented. |
| `verify` | **no** | A failing check drives the repair loop, up to `max_repairs`. "You have 15 unpushed commits" is not a failure to repair, and a model repairing it would push — a decision reserved to the person. |
| `playbooks/` | **no** | Entries fire only on verify failures. With no verify they would be dead weight, and this pack should not ship any. |
| `templates/` | **no** | Nothing here is a file the model fills in. |
| `mcp_servers` | **no** | Inert in this build (§1). |
| `detect` | **absent** | Deliberate. With no detect block `Pack.Matches` returns false, so the pack waits for `/packs on assist` rather than switching itself on because a repository was opened. A personal assistant should be a choice. |

### Why a script for the facts and prose for the judgement

Two options were considered. Teaching the model to read git and the task
documents itself is flexible but costs many turns, and a small local model is
exactly the model most likely to misread raw git output. A script answers
*what is true* deterministically and cheaply; the pack's core answers *what is
worth saying*, which is the part prose is actually good at. The division is
the design.

## 4. `core.md` — the rules

Budget: 1500 tokens, expected to land well under. Verbatim intent:

```
You are acting as a personal assistant. These rules are not optional.

**Withholding is the skill.** Interrupting costs more than the message takes
to read: resuming interrupted work takes measurably longer than the
interruption itself, and part of someone's attention stays on the task you
pulled them off. For everything you notice, choose: say it now, hold it for
the next natural break, put it in the brief, or drop it. Default to the
brief. Only act-now items interrupt — something irreversible is about to
happen, something is already broken, or a deadline passes before the next
break.

**Report what you read, never what you assume.** Every statement names where
it came from — the scan, a task document, git. If you did not read it, say
you did not. A confident wrong brief is worse than no brief: it gets acted on.

**Decisions that are not yours.** Never merge, push, publish, release, or
delete. Never send anything outward. Prepare the work and say it is ready;
the decision stays with the person, every time, however obvious it looks.

**Anticipate, don't recap.** A list of what happened is a log. Say what is
about to matter: what blocks the next step, what expires, what was owed and
is late.

**Raise a thing twice, then ask.** If you have raised something twice and
nothing moved, it is either not important or it is blocked. Do not raise it
a third time — ask which it is.

**Each item: what, why now, what you would do.** No item without a next
action. If there is no action, it is not an item.
```

Two notes for whoever edits this later. The withholding rule states the
mechanism and no figures, for the reason in §2. "Decisions that are not
yours" encodes the project's own standing rule that merges, pushes and
releases are the owner's call per change — it belongs in core rather than a
chunk because it is the rule that must never be missed.

## 5. `chunks/`

Each under 4 KiB (the harness's smallest tool-output cap; a larger chunk is
truncated mid-chunk).

| Chunk | Holds |
|---|---|
| `brief.md` | How to compose one: ordering by what blocks what, the shape of an item, how to say "nothing worth raising", how long is too long. |
| `triage.md` | Turning loose notes into task documents: the document format, what makes a step rather than a wish, what not to invent. |
| `release.md` | Changelog and version discipline: what an entry has to say, how the version and the latest tag relate, what "ready" means and where it stops. |
| `escalation.md` | The memory rule in practice: what counts as the same item twice, how to phrase the question on the third, when to stop tracking something. |

## 6. `tools/scan` — the contract

Node, one file, run as `node {pack}/tools/scan --project <workspace>` — the
same shape as `ui-web`'s wrappers, which work on Windows and Unix without a
shell and without a shebang being honoured.

Output is small, labelled, and names its source per line:

```
# assist scan  2026-10-09T08:00:05Z  workspace=/home/me/proj
git     branch=main ahead=15 behind=0 dirty=0
git     stale-branches=6 fix/windows-ghost-rows(merged,18d) …
git     worktrees=1
tasks   dir=.be-code/tasks count=7 doing=003 todo=4 blocked=1 stale>14d=2(001,004)
change  unreleased=6-entries version=1.2.5 latest-tag=v1.2.5 matches=yes
notes   (none)
```

**Reports only what is cheap, local and read-only.** Git state, the task
documents, the changelog and the version. **Not test results**: running the
suite takes minutes on this machine, would need its own grant, and a scan
that reports stale or guessed test state is worse than one that stays quiet.

**The `notes` line is load-bearing.** Everything the scan could not read goes
there — no git, no tasks directory, an unparseable changelog — so absence is
explicit rather than silent, and the brief can say "I could not read X"
instead of quietly omitting it.

**It always exits 0** except on its own usage error. A pack whose script
fails the moment something is missing breaks every workspace it activates in;
`ui-web`'s lint wrapper learned this the same way.

### Defined thresholds

Stated here rather than left in an example, so the implementer does not have
to infer them:

- **Stale task document**: not modified for **14 days**, by file mtime.
  Overridable with `--stale-days <n>`.
- **Stale local branch**: merged into the default branch, or no commit for
  **30 days**. Both are reported with which of the two applies, because
  "merged" is safe to delete and "old" is not.
- **Output ceiling**: the scan prints at most **60 lines**. Past that it
  truncates each list and says how many it dropped, so a repository with two
  hundred stale branches cannot crowd out the rest of the report.

The task-document format it parses is BE-Code's own
(`be-code/docs/task-format.md`, and `internal/engine`'s `markdown.go` is
authoritative). The implementer reads that before writing the parser rather
than inferring the format from an example.

## 7. Commands, schedule and grants

A command's name is its filename, as the harness's custom-command loader
derives it — so, following the ue5 pack's convention (`ue-actor.md`):

| Command | Does |
|---|---|
| `/assist-brief` | Run the scan, apply core's judgement, raise the few things worth raising. |
| `/assist-triage` | Loose notes into task documents. |
| `/assist-release` | Changelog and version readiness, stopping at "ready". |
| `/assist-followup` | What was owed and is late; what has already been said. |

**`/assist-brief` must be allowed to say "nothing worth raising".** An
assistant that finds five items every morning is padding, not judging. The
command says so explicitly and §8 tests for it. **At most five items**, and
five is a ceiling rather than a target: the command instructs that fewer is
the normal case and that an item only exists if it has a next action.

**The schedule is the person's to create** — a pack is data and cannot add
one, and the model is refused `/schedule add` during a fired turn. The README
gives the line to paste:

```
/schedule add weekdays 08:00 "/assist-brief" \
  allow "shell: node */packs/assist/tools/scan*" \
  allow "write: .be-code/assist/**" \
  allow "write: .be-code/tasks/**" \
  allow "write: CHANGELOG.md"
```

The implementer checks that against `internal/schedule`'s own parser
(`Parse`, `ParseGrant`) and `/schedule`'s argument handling before putting it
in the README — a README that ships a line which does not parse is worse than
one that describes the shape and says to run `/schedule add --help`.

**Corrected during implementation (2026-10-09).** The line above is a guess
and wrong in four ways; `packs/assist/README.md` carries the form that works
and the reasoning. In short:

1. `ParseScheduleAdd` requires a schedule **name** before the `when`.
2. It requires ` -- ` between the `when` and the instruction.
3. Only the **last** ` allow ` clause is read, its grants split on `;`, so a
   clause per grant silently drops all but one.
4. A `write:` grant is a path **prefix**, not a glob — `WriteAllowed` compares
   prefixes and only `browser:`/`tool:` use `path.Match` — so
   `write: .be-code/assist/**` parses and then covers nothing.

And one thing this section got wrong at the design level, found by the final
review rather than by the syntax check: **a schedule's instruction is sent to
the model as plain text, and slash commands are not expanded.** The harness
expands a custom command only on the TUI's submit path and the plain REPL's;
a fired schedule reaches `RunFull` without passing either. So scheduling
`/assist-brief` delivers those six characters and runs nothing — no scan, no
log, and none of the grants used for their purpose. The scheduled brief's
instruction has to be written inline, repeating what the command body says,
and the README does that.

The brief then runs unattended, and because a fired turn gates every tool
call, it needs these standing grants:

```
shell: node */packs/assist/tools/scan*
write: .be-code/assist
write: .be-code/tasks
write: CHANGELOG.md
```

The `shell:` grant is one read-only script inside the pack. The three writes
are the task documents, the changelog, and the assistant's own directory.

### Why the assistant has its own directory

"Raise a thing twice, then ask" needs memory across days, and a transcript is
gone by morning. It is kept in `.be-code/assist/brief-log.md`.

The alternatives were worse. Writing it into the task documents would stay
inside a grant already needed, but the task engine *parses* those documents
and a log that is not a task tree risks being quarantined as broken — abusing
a structure owned by another subsystem. The engine's durable notes are not the
assistant's to write either. A fourth narrow grant is the cheaper mistake.

## 8. Testing

**The scan is unit-tested** against fixture repositories in temporary
directories, asserting on real output: unpushed counted, dirty files counted,
stale branches found, task statuses read, changelog and version compared —
and every inert path, each of which must exit 0 with a `notes` line: no git,
no tasks directory, an unparseable changelog.

**The judgement is not unit-testable**, so it is measured by evals, in the
shape `ui-web` used for its unverifiable core rules. Each is run with the
pack off and on, on a small local model and a large one.

| Eval | Measures |
|---|---|
| Thin scan, nothing urgent | Says "nothing worth raising" rather than padding. |
| One urgent item among noise | The urgent one leads; the noise is dropped. |
| Something irreversible imminent | Interrupts now instead of holding for the brief. |
| A merge is ready | Stops at "ready". Never merges. |
| Scan `notes` says tasks unreadable | Says so. Does not invent task state. |
| Same item, third occurrence | Becomes a question, not a third mention. |

The last two matter most. The anti-hallucination eval is the only one testing
*correctness* rather than taste, and the escalation eval is the only one that
exercises the brief log.

**The pack is worth shipping when the two local models with it withhold as
well as a frontier model without it.** A pack that only helps a frontier model
has not earned its context — the same bar `ui-web` set.

## 9. Known limits

- **No test or CI state.** By choice (§6). A later version could read a
  recorded result if one existed; it must not run the suite in a fired turn.
- **Phase 2 needs `mcp_servers` implemented**, or the person wiring
  connectors themselves. Either way the pack cannot require them.
- **The escalation rule depends on the brief log being writable.** Without the
  grant, the rule degrades to "raise it every day", which is the behaviour it
  exists to prevent. The README says so plainly.
- **Judgement is unverifiable by construction.** The evals in §8 are the only
  evidence the core rules earn their budget. If they show no difference
  between pack-off and pack-on, the rules should be cut rather than kept out
  of politeness.
- **One workspace at a time.** The scan reads the workspace it is given. An
  assistant across several repositories at once is not in this phase.

## 10. Non-goals

- Running tests, builds or any long command.
- Any outward-facing action: no pushing, publishing, sending or deleting.
- Creating or editing schedules. The person owns those.
- Replacing the task engine. The assistant reads and annotates task
  documents; it does not become a second source of truth for them.
