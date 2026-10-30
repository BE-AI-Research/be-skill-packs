---
name: safe-rm
description: Delete a path the safe way: list, confirm scope, then remove
args: <path>
---
1. `ls -la -- "$1" && du -sh -- "$1"` in this turn. If it is a glob or a variable, expand and list what it resolves to.
2. Confirm it is inside the workspace or a path the user named; refuse `/`, `~`, `.`, `*`.
3. Write the approval message: exact path, size, what depends on it, why.
4. Execute `rm -rf -- "<absolute path>"` (with `"${VAR:?}"` if a variable is involved) through the gate.
