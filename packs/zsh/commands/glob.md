---
name: glob
description: Explain a zsh glob and show what it would match without running anything
args: <pattern>
---
1. Fetch `pack zsh/globbing`.
2. Explain each part of `$1`: recursion, qualifiers, modifiers, whether it needs `extended_glob`, and what happens on zero matches.
3. Run `print -l -- $1` (adding `(N)` if absent) to list matches, bounded with `| head -n 50`. Never pass the pattern to a destructive command in this step.
