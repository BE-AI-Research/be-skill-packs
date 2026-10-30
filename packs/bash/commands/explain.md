---
name: explain
description: Explain what a shell command does, segment by segment, and what could go wrong
args: <command>
---
1. Split on `|`, `&&`, `||`, `;`. For each segment: the program, each flag, each expansion (and whether it is quoted), redirections.
2. State the exit status semantics of the whole thing (which failure is visible).
3. Run `shlint preflight` on it and report findings.
4. Give the safer/portable rewrite if one exists. Fetch `pack bash/quoting` or `pack bash/pipes` if needed.
