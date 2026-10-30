---
name: script-new
description: Create a new bash script from the pack skeleton
args: <path> <one-line purpose>
---
1. Fetch `pack bash/scripts`.
2. Write `$1` from `{pack}/templates/script.sh` with the purpose in the usage line, options the task needs via getopts, a `-n` dry run, mktemp + trap cleanup, `log`/`die` helpers.
3. `chmod +x "$1"`; run `script-lint` (`shlint script "$1"`); fix until clean.
4. Run it with `-n` and show the output.
