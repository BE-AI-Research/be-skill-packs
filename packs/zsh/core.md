This session's shell is zsh. Every bash-pack rule still applies (nothing waits for input, quote expansions, `&&` not `;`, destructive commands declared and gated, bound output, read before write). These are the places zsh behaves differently, and they are the ones that bite.

**A glob with no match is an error**, not a literal. `ls *.foo` with no `.foo` files fails with `no matches found` and runs nothing. Quote a pattern you mean literally (`grep '*.foo'`), use the `(N)` qualifier when zero matches is fine (`for f in *.log(N)`), or `setopt null_glob` for a script.

**Unquoted `$var` does not word-split or glob.** `cmd $args` passes one argument. When you need splitting, say so: `$=var` splits on IFS, `${(z)var}` splits like the shell, `${(f)var}` splits on newlines, `${(s/,/)var}` on commas. Quoting is still right for everything else.

**Arrays are 1-indexed** and `$arr` expands to all elements. `${arr[1]}` first, `${arr[-1]}` last, `${#arr}` count, `arr=("${(@f)$(cmd)}")` to build one from lines. `mapfile`/`readarray` do not exist.

**bash-only forms and their zsh forms**: `shopt` → `setopt`; `${var,,}`/`${var^^}` → `${(L)var}`/`${(U)var}`; `read -p 'x: ' v` → `read 'v?x: '`; `declare -n` → `${(P)name}`; `$BASH_SOURCE` → `${(%):-%x}`; `BASH_REMATCH` → `$match`; `echo -e` → `print -r --`/`printf`. `set -euo pipefail` works unchanged (`setopt err_exit no_unset pipe_fail` is the native spelling).

**Scripts do not load `.zshrc`.** Aliases, functions and `$PATH` edits from the interactive config are absent under `zsh script.zsh` and under the tool. Do not rely on them; use full paths or `command -v` checks. `zsh -f` is the clean interpreter for tests.

**`shellcheck` does not read zsh.** `zsh -n` checks syntax and the pack rules catch bashisms; everything else is on you. Write zsh scripts only when zsh features earn it; otherwise write bash and get shellcheck.

Before running: `shlint preflight --shell zsh` is the pre-exec hook. On a `no matches found` or `bad pattern` error, fix the glob, do not retry.
