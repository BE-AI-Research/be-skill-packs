# zsh vs bash

| Topic | bash | zsh |
|---|---|---|
| unquoted `$var` | splits on IFS and globs | one word; `$=var` to split, `$~var` to glob |
| no-match glob | left literal | error (`nomatch`); `(N)` or `setopt null_glob` |
| array index | `${a[0]}` first | `${a[1]}` first; `$a` = all elements |
| array from lines | `mapfile -t a < <(cmd)` | `a=("${(@f)$(cmd)}")` |
| assoc array | `declare -A m` | `typeset -A m` |
| case change | `${v,,}` `${v^^}` | `${(L)v}` `${(U)v}` `${(C)v}` |
| join / split | loops | `${(j:,:)a}` join, `${(s:,:)v}` split |
| unique / sort | `sort -u` | `${(u)a}` unique, `${(o)a}` sort, `${(On)a}` numeric desc |
| regex capture | `BASH_REMATCH` | `$match` (array), `$MATCH` (whole) |
| script path | `${BASH_SOURCE[0]}` | `${(%):-%x}` or `$0` |
| prompt read | `read -p 'x: ' v` | `read 'v?x: '`; yes/no: `read -q` |
| options | `shopt -s x` | `setopt x` (case/underscores ignored: `null_glob` = `NULLGLOB`) |
| nameref | `declare -n r=v` | `${(P)name}` |
| `echo -e` | ok | ok but prefer `print -r --` or `printf` |
| `[[ ]]` | yes | yes (same) |
| `$PATH` | string | `$PATH` string and `$path` array, tied |
| functions | `f() { }` | same; `emulate -L zsh` first line for predictable options |
| `=` in args | literal | `=cmd` expands to the path of cmd (`setopt no_equals` to stop) |
| `#` comments interactive | yes | off unless `setopt interactive_comments` (scripts fine) |
| `which` | external | builtin, prints functions too; use `command -v` or `whence -p` |

## Parameter expansion flags worth knowing
`${(f)x}` lines, `${(z)x}` shell words, `${(Q)x}` unquote, `${(q)x}` quote for reuse, `${(A)x}` force array, `${(k)m}` keys, `${(v)m}` values, `${(t)x}` type, `${(e)x}` evaluate, `${x:h}` dirname, `${x:t}` basename, `${x:r}` strip extension, `${x:e}` extension, `${x:A}` absolute path.

## Things that are the same
`$(...)`, `"$@"`, `set -euo pipefail`, `trap`, `local`, `printf`, redirections, `&&`/`||`, `case`, `while read -r`, process substitution `<(...)`, heredocs, `(( ))`.

## Running bash code under zsh
Either call it with `bash script.sh` (correct), or `emulate -L sh` / `emulate -L ksh` inside a function for sh-style splitting and arrays. Do not sprinkle `setopt sh_word_split` globally; fix the code instead.
