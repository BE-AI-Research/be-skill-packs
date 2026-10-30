# Quoting and expansion

## The two failures
Unquoted `$var` goes through **word splitting** (on IFS: space, tab, newline) and **pathname expansion** (globs). `f="my file.txt"; cat $f` runs `cat my file.txt` (two args). `pat="*.log"; echo $pat` lists files. Double quotes stop both and keep `$`, `` ` ``, `\` expansions; single quotes stop everything.

| Want | Write |
|---|---|
| the value, as one word | `"$var"` |
| command output, as one word | `"$(cmd)"` |
| all script args, each as one word | `"$@"` (never `$*` or `"$*"` unless joining) |
| all array elements, each as one word | `"${arr[@]}"` |
| literal text with `$` in it | `'$HOME is home'` |
| fail if unset or empty | `"${var:?message}"` |
| default if unset | `"${var:-default}"` |
| only split on newlines | `mapfile -t lines < <(cmd)` (bash) |
| a glob, deliberately | `for f in ./*.log; do [ -e "$f" ] || continue; ...; done` |

## Common traps
- `rm -rf "$dir/"` with `dir` unset deletes `/`. Always `"${dir:?}/"` in delete paths.
- Filenames starting with `-` become options: `rm -- "$f"`, `grep -e "$pat"`, or `./*` instead of `*`.
- `echo "$x"` breaks on `-n`/`-e` values; `printf '%s\n' "$x"`.
- `'$var'` is literal (SC2016). `"$var"` expands. `"\$var"` is a literal dollar inside double quotes.
- Nested quotes inside `$(...)` are their own context: `"$(grep "pat" "$f")"` is fine.
- Tilde does not expand inside quotes: `"~/x"` is literal. Use `"$HOME/x"`.
- Brace expansion happens before variables: `{1..$n}` does not work; use `seq 1 "$n"` or `for ((i=1;i<=n;i++))`.
- `[ $x = y ]` fails when `x` is empty; `[ "$x" = y ]` or `[[ $x == y ]]` (`[[` does not split).

## Arrays (bash only)
```bash
args=(--flag "value with space" "$file")
cmd "${args[@]}"
mapfile -t files < <(find . -name '*.go' -print)   # one per line, no splitting
for f in "${files[@]}"; do ...; done
```
NUL-safe collection: `find . -print0 | while IFS= read -r -d '' f; do ...; done`.

## Heredocs
```bash
cat > file <<'END'      # quoted delimiter: no expansion inside (literal $ and `)
...
END
cat > file <<END        # unquoted: $var and $(cmd) expand
...
END
```
`<<-END` strips leading tabs only (not spaces). A heredoc whose body contains the delimiter on its own line ends early: pick a delimiter that cannot appear in the body. Writing files from an agent: prefer the edit tool; if using a heredoc, quote the delimiter unless you need expansion.

## Escaping for another layer
Passing a command through `ssh host "..."`, `bash -c "..."`, `docker exec sh -c "..."`, or `sudo sh -c "..."` adds a quoting layer. Build the inner command with `printf '%q '` or pass a script file instead of nesting quotes more than once.
