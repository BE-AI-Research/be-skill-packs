# AgentCAD

A skill-pack for building, validating, and exporting production-grade CAD parts
and assemblies in Python, from a natural-language brief, using build123d or CadQuery.

Adapted from the AgentCAD `skill` command (which emits `SKILL.md` = frontmatter +
operating guide) so the full agent operating guide is available inside be-code as
a skill-pack.

## What it gives the agent

- `core.md` (always loaded when the pack is enabled) — the complete **build123d**
  operating guide: the build123d SKILL.md frontmatter, the canonical workflow,
  the full tool catalog, the build123d API cheat-sheet, reference patterns,
  verification gates, and the build123d runtime fingerprint.
- One on-demand chunk under `chunks/`, loaded only when the topic is in scope:
  - `cadquery` — the complete **CadQuery** operating guide (the `runtime="cadquery"`
    variant: CadQuery frontmatter, `cq` import, the CadQuery API substitutions,
    and the CadQuery runtime fingerprint).

## Two runtimes

AgentCAD ships one operating guide in two flavors:

- `build123d` (default) — `from build123d import *`, `build_part()` / `build_line()`,
  `make_line` / `offset2D` / `fillet2D`, `extrude()`, `sweep()`. This is `core.md`.
- `cadquery` (opt-in) — `import cadquery as cq`, `cq.Workplane`, `cq.Face`,
  `offset2D` → `offset()`, `fillet2D` → `fillet()`, etc. This is the `cadquery` chunk.

The two are parallel, complete documents: CadQuery is derived from build123d by
substitutions applied across the whole guide body, not a small delta — so both are
shipped verbatim rather than one plus a patch. Pick the one matching your
`runtime`.

## Detection

This pack has no `detect` signal: CAD is a deliberate, user-directed activity, not
something implied by workspace files. Enable it explicitly for the session, then
name the runtime in your request (e.g. "build this bracket in CadQuery").

## Using it

Ask for a CAD task, e.g. "model this bracket from this STEP file", "design a
flange in build123d", or "build this housing in CadQuery and validate it". The
build123d core guide is loaded automatically; the `cadquery` chunk is pulled in
when the request targets the CadQuery runtime.

The pack names tools and built-in parsers but does not execute code itself. The
actual capabilities live in an external AgentCAD MCP server, referenced by tool
name; if that server is not attached, the workflows still describe the intended
steps, tool calls, evidence to retain, and the verification contract.

## Source

Ported verbatim from the AgentCAD `skill` command's generated `SKILL.md` for both
runtimes. Both documents were generated directly from the source Python
(`agentcad.guide.guide_body(runtime)` + the frontmatter literals in
`agentcad.commands.skill`), not retyped, so the body of `core.md` is byte-for-byte
the build123d guide and `chunks/cadquery.md` is byte-for-byte the CadQuery guide.
Each document carries its runtime fingerprint (build123d `dfd10125806a`,
CadQuery `457f839450fe`) as provenance. No source capability was dropped.
