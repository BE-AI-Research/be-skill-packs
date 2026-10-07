# The pack format

A **pack** is a folder of Markdown and JSON holding domain expertise, in a
shape an agentic coding harness can load. It brings four things:

- a small block of **always-on rules**, budgeted so it fits a small model's
  context window;
- **chunks** of knowledge the model fetches by name, one at a time, rather
  than being given all of it up front;
- **verification commands** and the name of a parser that turns their output
  into one root cause;
- an **error playbook** mapping a failure to its cause, a fix, and something
  different to try when the fix does not work.

Version 1 of the format. Nothing in a pack executes inside the harness: a
pack *names* a command to run and *names* a built-in parser, so a harness
never loads code a pack supplied.

This document is the contract. If you are implementing it in your own
harness, everything below is what you need; where it says **must**, a pack
author is entitled to rely on it.

## Layout

```
<pack-root>/<name>/
├── pack.json            manifest (required)
├── core.md              always-on rules (optional, budgeted)
├── chunks/*.md          on-demand knowledge
├── playbooks/*.md       error signature → cause → fix → next
├── commands/*.md        prompt templates for the harness's own slash commands
├── templates/**         files a command tells the model to copy
└── tools/**             executables named by verify commands
```

`<name>` must match `[a-z0-9-]+` and should equal the manifest's `name`.

## Where packs live

A harness should look in at least two places, later shadowing earlier by pack
name:

1. a per-user directory the person controls (BE-Code uses `~/.be-code/packs/`)
2. a per-project directory (BE-Code uses `<workspace>/.becode/packs/`)

**The distinction matters for trust.** A pack in the user's own directory was
put there by the user. A pack in the project arrived with somebody's
repository and can name commands to run, so it must not be activated without
asking — see [Trust](#trust).

## `pack.json`

```json
{
  "schema": 1,
  "name": "ue5",
  "version": "0.1.0",
  "description": "Unreal Engine 5 C++ and build expertise",
  "detect": { "any": ["*.uproject"] },
  "core": { "file": "core.md", "budget_tokens": 1500 },
  "chunks": {
    "cpp-reflection": {
      "file": "chunks/cpp-reflection.md",
      "summary": "UCLASS/UPROPERTY/UFUNCTION, UHT rules, GC and object lifetime",
      "triggers": ["UCLASS", "UPROPERTY", "GENERATED_BODY", "TObjectPtr"]
    }
  },
  "verify": [
    {
      "name": "build",
      "cmd": ["{pack}/tools/ue-build", "--project", "{workspace}"],
      "cmd_windows": ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
                      "-File", "{pack}/tools/ue-build.ps1", "-Project", "{workspace}"],
      "parser": "ubt",
      "timeout": "30m",
      "when": { "changed": ["Source/**", "*.uproject"] }
    }
  ],
  "playbooks": ["playbooks/errors.md"],
  "commands": "commands",
  "mcp_servers": { "ue-editor": { "command": "be-ue5-editor", "args": ["--serve"], "optional": true } },
  "requires": { "be_code": ">=1.3.0" }
}
```

| Field | Rule |
|---|---|
| `schema` | Integer. A harness must refuse a schema it does not understand rather than guess. |
| `name` | `[a-z0-9-]+`, unique after shadowing. |
| `version` | Free text; shown to the user. |
| `detect` | `any` / `all` lists of workspace-relative globs. `*` matches within one path element, `**` across separators. `any` needs one hit, `all` needs every glob. **No detect block means the pack never activates on its own** — it is a general-purpose pack the user switches on deliberately. |
| `core.file` | Markdown read into the system prompt. |
| `core.budget_tokens` | Hard cap. Over budget, the pack must not load at all: half a pack's rules are worse than none. Estimate deterministically (see [Budget](#budget)). |
| `chunks.*.summary` | One line. All summaries together form the index the model is shown. |
| `chunks.*.triggers` | Plain substrings, not patterns, matched against files the model reads or writes. For hints only. |
| `verify[].cmd` | **An argument vector, never a shell string.** See [Verification](#verification). |
| `verify[].cmd_windows` | Optional; replaces `cmd` on Windows. |
| `verify[].parser` | Names a parser the harness has built in. An unknown name is a load error, not a silent fallback. |
| `verify[].timeout` | Go duration string (`"30m"`). Default generously: a cold Unreal build is tens of minutes. |
| `verify[].when.changed` | Optional globs; skip the check when nothing matching changed. |
| `commands` | Directory of prompt templates. |
| `mcp_servers` | Tool servers to start, if the harness supports them. `optional: true` means a failure to start is a notice, not an error. |
| `requires` | Advisory minimum harness versions. |

Two placeholders are substituted in `cmd` and in command files: `{pack}` is
the pack's own absolute directory, `{workspace}` the project root.

## Core and the index

`core.md` goes into the system prompt, and the chunk summaries go with it so
the model knows what else it can ask for.

**Frame core as instructions.** Many harnesses inject project notes framed
explicitly as *facts, not instructions*, so that a session cannot be made to
execute its own notes. A pack is the opposite: the user installed it so the
model would follow it. Say which is which, or you weaken the first guarantee.

Core must be **stable for the life of a request**. A harness with a prompt
cache pays a full cold read when the system prompt changes, so a pack's rules
belong in the stable part and a change to the active set belongs at a request
boundary.

## Chunks

Fetched by name, one at a time, as a tool result — **never injected into the
system prompt**. The point of a pack is that most of its knowledge is pulled
rather than pushed, because a small model's window is the scarce resource.

A harness should serve chunks and templates **through its own tool**, not by
telling the model to read the files. A pack usually lives outside the
workspace, and a harness that confines file reads to the workspace (most do,
and should) cannot read its own packs. Keep that confinement and serve pack
files through a tool that confines paths to the pack directory instead — the
path comes from the model, so `../../.ssh/id_rsa` must be refused.

Keep a chunk under the harness's smallest per-call tool-output cap. BE-Code's
floor is 4 KiB on a small context window; a chunk larger than that is
truncated mid-chunk exactly where it matters most.

## Verification

`cmd` is an argument vector because the alternative is a shell string, and a
shell string means quoting rules that differ between `sh` and PowerShell, with
any mismatch an injection. A project path containing spaces —
`C:\Unreal Projects\My Game` — needs no quoting in an argv and cannot be
word-split. Run it with no shell between the harness and the arguments.

A pack's checks should run **after** the project's own detected checks, and
the sequence should stop at the first failure: one failure at a time is what
makes a repair loop converge.

### Parsers

A parser turns a check's combined stdout/stderr plus its exit code into one
root cause:

```
Diagnostic:  kind (uht|compile|link|tool|test), severity, file, line, column,
             code (C2065, LNK2019, …), message, raw line, fatal
Result:      ok, first (the one root cause), count, signature
```

`signature` is a stable fingerprint — kind, code, file and normalised message,
with line and column left out so the same failure on a shifted line still
matches. It is what lets a harness tell a repeated failure from a new one.

Parsers are **built into the harness and chosen by name**. A pack must not be
able to ship one: executable logic from a pack is the thing this format
exists to avoid. BE-Code provides `generic` (exit code and the output tail),
`gcc` (Clang/GCC `file:line:col: error:`), `msvc` (`file(line,col): error
CXXXX:` and `LNKxxxx`), and `ubt` (those plus UnrealHeaderTool and
UnrealBuildTool's own failures).

If you implement parsers, two things are easy to get wrong and silently drop
every diagnostic on Windows: an absolute path contains a drive letter, so a
file pattern that excludes `:` never matches `C:\...`; and MSBuild prefixes
every line with the project number (`1>`), which lands inside the file name
and then resolves against nothing.

## Playbooks

```markdown
## LNK2019 unresolved external from another module
match: LNK2019|undefined reference|undefined symbol
kind: link
cause: The symbol lives in a module this module does not depend on, or the
  class is not exported with its module's API macro.
fix:
1. Find which module defines the symbol.
2. Add it to PublicDependencyModuleNames in this module's .Build.cs.
next: If the dependency is already present, the class may be missing its
  MODULE_API macro, or the function has no definition in a .cpp.
```

- One `##` entry per failure. Entries are tried in file order and the first
  match wins, so put specific entries before general ones and finish with a
  catch-all (`match: .`).
- `match` is a regular expression tried against the diagnostic's raw line and
  its message.
- `kind` restricts an entry to one diagnostic kind; `any`, or no kind, takes
  anything.
- A field key is only a field key outside a fenced code block: an entry's body
  may legitimately contain a line beginning `match:`.

**`next` is the field that earns the format.** A weak model told the same
compiler error twice will make the same edit again. So when a failure's
signature repeats, show `next` and withhold `fix`; when it repeats again, say
the entry has been tried and stop offering either. That escalation is the
difference between a repair loop that converges and one that spins.

A broken playbook should be a warning, not a load failure — losing a fix
table is bad, losing the pack's rules along with it is worse.

## Commands and templates

Command files are prompt templates for whatever slash-command mechanism the
harness has; `$ARGS` is the user's argument text and `{pack}` the pack
directory. Tool names inside them are necessarily harness-specific — the ue5
pack says "fetch the templates with the `pack` tool", which is BE-Code's name
for it. Treat the files as prose to adapt, not as an interface.

There is no template engine: a template is a file with obvious placeholders
(`{{MODULE_API}}`, `{{NAME}}`) that the model fills in.

## Trust

A pack can name commands to run, so where it came from decides what to ask:

- **A pack the user installed** needs no permission. They put it there.
- **A pack from the project** must ask once before it is active, and the
  prompt must name every verify command and every server it would start —
  there is nothing to judge otherwise. Remember the answer per project,
  against a fingerprint of the pack's **manifest and tools** (including file
  modes: making a script executable changes what a pack can do without
  changing a byte of it). Deliberately **not** the prose — re-asking because
  somebody improved a paragraph is how a gate ends up approved unread.
- **Nobody to ask is a no.** An unattended run must leave an unapproved pack
  off rather than trusting it, and a blanket "approve everything" flag should
  not answer this question either.

## Budget

Estimate core against `budget_tokens` **deterministically**. If your estimate
is calibrated from live token counts, a pack whose core sits near its budget
will load against one model and fail against another, or load and then stop
loading mid-session. BE-Code uses a fixed three characters per token for this
check alone.

## Validation

A pack author should be able to check a pack in CI. Worth reporting, with a
non-zero exit:

- anything the loader would refuse (unknown schema, bad name, unknown parser);
- a chunk whose file is missing;
- a verify command whose program is missing or **not executable** — a pack is
  installed by copying a folder, and a copy does not always keep the bit;
- a chunk larger than the smallest tool-output cap.

`be-code packs validate <dir>` does this.
