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

- [ ] 1. check the pack loads against a release build
- [>] 2. write the install instructions
  - files: README.md (lines 30–48)
- [!] 3. announce it — blocked: waiting on the 1.3.0 release
- [-] 4. write a migration guide — dropped: nothing to migrate from
```

- The heading is `# NNN — title`, regenerated on save, so match it exactly.
- Two spaces per level of nesting. Ids are positional, not chosen.
- The marks: `[ ]` todo, `[>]` doing, `[x]` done, `[!]` blocked, `[-]`
  dropped. **Exactly one step anywhere is `[>]`.**
- Blocked and dropped carry why, after an em dash.
- Evidence sits one level under its step with a key: `files:`, `cmds:`,
  `lookups:`, `note:`.

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

Becomes one document:

```markdown
# 005 — make the packs repo presentable

- [ ] 1. write the README's install and usage sections
- [ ] 2. correct the ue5 pack's claim that mcp_servers are started
```

And a note, not a task: the third line is a question, not work — it has no
observable end until somebody decides. It goes to the person as a question, or
nowhere.

## Mistakes

- **Inventing steps the person did not describe.** A note that is not a task
  stays a note. Say which notes you did not turn into tasks, and why.
- **Writing to `.becode/tasks`.** Wrong directory; nothing reads it.
- **Two `[>]` marks.** The engine warns and changes neither document, so the
  record silently stops meaning what it says.
- **Rewriting a document's structure** to tidy it. It is the person's file and
  they edit it by hand; change the lines you were asked to change.
- **Guessing the next id.** Read the directory.
