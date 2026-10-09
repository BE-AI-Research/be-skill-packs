# Turning notes into task documents

The task engine keeps its records in the project, as Markdown, one document
per top-level task. They are the person's files and they are read by hand, so
they are written in the engine's own format and nothing else.

## The format

`.be-code/tasks/NNN-<slug>.md` — note the directory: the engine uses
`.be-code`, while packs and custom commands use `.becode`. Getting that wrong
writes a document nothing will ever read.

```markdown
# 004 — publish the skill packs

- [>] 4. publish the skill packs
  - [x] 4.1. check the pack loads against a release build
  - [>] 4.2. write the install instructions
    - files: README.md (lines 30–48)
  - [!] 4.3. announce it — blocked: waiting on the 1.3.0 release
  - [-] 4.4. write a migration guide — dropped: nothing to migrate from
```

- The heading is `# NNN — title`, regenerated on save, so match it exactly.
- **One document holds exactly one top-level task.** Its single unindented
  bullet is the root, its id is the document's number, and its mark is the
  document's status. Steps nest two spaces beneath it as `NNN.n`, and deeper
  as `NNN.n.m`.
- **A second unindented bullet is a second top-level task**, not a step. The
  engine moves it into a document of its own with a new number on the next
  save, so a flat checklist silently becomes N documents and every count read
  off the tree is wrong.
- Ids are positional, not chosen. Read the directory for the next document
  number; never invent one.
- The marks: `[ ]` todo, `[>]` doing, `[x]` done, `[!]` blocked, `[-]`
  dropped. **Exactly one step anywhere in the whole tree is `[>]`.**
- Blocked and dropped carry why, after an em dash.
- Evidence sits one level under its step with one of six keys: `files:`,
  `cmds:`, `lookups:`, `note:`, `decision:`, `error:`.

## A step, not a wish

A step has a next action and an observable end. "Make the docs better" is a
wish; "write the install section of the README" is a step, because you can
tell when it is done.

Split anything you cannot tell the end of. Fold anything too small to track on
its own into the step it belongs to.

## A worked example

Three lines of loose notes:

> need to sort out the packs repo before anyone sees it, readme is thin.
> also the ue5 pack still says mcp servers work and they don't.
> maybe look at whether the brief log should be gitignored

Becomes one document, with one root and its steps beneath:

```markdown
# 005 — make the packs repo presentable

- [ ] 5. make the packs repo presentable
  - [ ] 5.1. write the README's install and usage sections
  - [ ] 5.2. correct the ue5 pack's claim that mcp_servers are started
```

Not two unindented bullets — that is two tasks, and the engine would split
them into `005-…` and `006-…` unasked.

And a note, not a task: the third line is a question, not work — it has no
observable end until somebody decides. It goes to the person as a question, or
nowhere.

## Mistakes

- **Inventing steps the person did not describe.** A note that is not a task
  stays a note. Say which notes you did not turn into tasks, and why.
- **Writing to `.becode/tasks`.** Wrong directory; nothing reads it.
- **A flat list of unindented bullets.** The commonest way to get this wrong:
  it looks like the document you meant and parses as N separate tasks.
- **Two `[>]` marks.** The engine warns and changes neither document, so the
  record silently stops meaning what it says.
- **Rewriting a document's structure** to tidy it. It is the person's file and
  they edit it by hand; change the lines you were asked to change.
- **Guessing the next id.** Read the directory.
