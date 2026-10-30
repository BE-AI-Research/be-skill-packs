# Pipes, redirection and exit codes

## Exit codes
`0` success; anything else failure. `$?` is the last command's status; test commands directly instead (`if grep -q x f; then`), SC2181.
Conventions: `1` general, `2` usage, `126` not executable, `127` not found, `128+N` killed by signal N (`137` = SIGKILL/OOM, `143` = SIGTERM), `124` = `timeout` expired.

## Chaining
- `a && b` runs b only if a succeeded. `a || b` runs b only if a failed. `a; b` always runs b (avoid in agent commands).
- `a && b || c` is **not** if/else: c also runs if b fails. Use a real `if`.
- `{ a; b; }` groups in the current shell; `( a; b )` in a subshell: `cd` and variables inside `( )` do not leak out. `(cd dir && make)` is the idiom for "build there, stay here".

## Pipes
The pipeline's status is the **last** command's. `false | true` succeeds. In scripts, `set -o pipefail` makes it the rightmost non-zero. In a one-liner, structure so the command whose failure matters is last, or read `PIPESTATUS`: `cmd1 | cmd2; echo "${PIPESTATUS[0]}"`.
`cmd | head` kills `cmd` with SIGPIPE when head exits; with pipefail that is status 141. Accept it, or use `cmd | sed -n 1,20p`.
Each pipe stage is a subshell: `cmd | while read -r l; do n=$((n+1)); done; echo $n` prints the original `n`. Use `while ...; done < <(cmd)` or `mapfile`.

## Redirection
| Form | Meaning |
|---|---|
| `> f` | stdout to f (truncate). `set -o noclobber` refuses existing files. |
| `>> f` | append |
| `2> f` | stderr to f |
| `> f 2>&1` | both to f (order matters: `2>&1 > f` sends stderr to the old stdout) |
| `&> f` | both, bash only |
| `2>/dev/null` | discard stderr (rarely; you lose the error you need) |
| `< f` | stdin from f |
| `<<< "str"` | here-string to stdin |
| `cmd 2>&1 \| tee log` | see and keep both streams |
| `exec > >(tee -a log) 2>&1` | whole script logged |

## Process substitution (bash)
`diff <(sort a) <(sort b)`; `while read -r l; do ...; done < <(cmd)`. Not in `sh`.

## tee, yes, and friends
`cmd | tee out.txt` keeps a copy. `yes | cmd` answers prompts with `y` (last resort; prefer the tool's non-interactive flag). `cmd | tee >(wc -l) | head` fans out.

## Reading large output safely
`cmd 2>&1 | tail -n 100` for the end (where errors usually are); `| head -n 50` for the start; `| grep -n -i -E 'error|fail' | head` to find the first failure; `| wc -l` to size it before dumping.
