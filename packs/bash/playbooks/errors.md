# bash pack - error playbook

Entries match the condensed failure line from `script-lint`, from the
`pre_exec` hook, and (with `playbook_scope: tool:bash`) from a failed bash
tool call's stderr. Same format as the other packs: heading, `match:`
regex, `cause:`, `fix:`, optional `fallback:`.

## Command not found
match: command not found|not found$|No such file or directory.*(bin/|command)
cause: The program is not installed, not on PATH, or the name is wrong (`python` vs `python3`, `pip` vs `pip3`, `node` vs `nodejs`, `fd` vs `fdfind`, `bat` vs `batcat`).
fix: `command -v <name>`; try the alternate name; check `echo "$PATH"`; install with the package manager using a non-interactive flag. Do not retry the same name.

## CRLF script
match: \$'\\r': command not found|\^M
cause: The script has Windows line endings.
fix: `sed -i 's/\r$//' script.sh` (GNU) or `tr -d '\r' < script.sh > fixed.sh`; set `core.autocrlf=input` in git.

## Permission denied
match: Permission denied
cause: Not executable (`chmod +x`), owned by another user, or a protected path (/etc, /usr, another user's home).
fix: `ls -la <path>` to see owner and mode. If it is a script, `chmod +x` or run `bash script.sh`. If it is a system path, say so and route through the approval gate with `sudo -n`; do not loop on sudo.
fallback: Work in a path you own (`$HOME`, the workspace, `mktemp -d`).

## Syntax error near unexpected token
match: syntax error near unexpected token|unexpected EOF while looking for matching|SH-SYNTAX
cause: Unbalanced quotes/parens, a stray `fi`/`done`/`}`, `(` in an argument that should be quoted, or bash syntax run under `sh`.
fix: Run `bash -n` on the script, read the line number, fix the first one only. For one-liners, split into smaller commands. If `sh` is the interpreter, `[[`, arrays and `<(` are the usual culprits.

## Unbound variable
match: unbound variable|parameter not set
cause: `set -u` and a variable that is unset (often `$1` without an argument, or an env var expected from the caller).
fix: `"${var:-default}"` where unset is legal; `"${var:?message}"` where it is not; check argument count before use.

## Argument list too long
match: Argument list too long
cause: `cmd $(find ...)` or `cmd *` expanded beyond ARG_MAX.
fix: `find ... -print0 | xargs -0 cmd` or `find ... -exec cmd {} +`.

## No such file or directory (path)
match: No such file or directory
cause: Relative path from a different cwd than you think, a typo, a file that was never created, or `cd` that did not persist to this tool call.
fix: `pwd; ls -la <dir>` in the same call; use absolute paths; chain `cd dir && cmd`.

## Broken pipe / status 141
match: Broken pipe|exit status 141|SIGPIPE
cause: The reader (`head`) closed before the writer finished; harmless unless pipefail turned it into a failure.
fix: Accept it for `| head`, or use `sed -n '1,20p'`, or drop `pipefail` for that one pipeline.

## Timeout (124) or hang
match: exit status 124|timed out|PF-HANG
cause: The command waited for input or a pager, or is long-running.
fix: Add the non-interactive flag from the noninteractive chunk (`--no-pager`, `-y`, `BatchMode=yes`, drop `-it`). If the work is legitimately long, raise `timeout` once and run in the background with a log file.

## Unquoted expansion (SC2086/SC2046/SC2068)
match: SC2086|SC2046|SC2068|word splitting
cause: `$var`/`$(cmd)`/`$@` unquoted.
fix: Quote it: `"$var"`, `"$(cmd)"`, `"$@"`. If splitting was intended, use an array or `read -ra`.

## rm with unsafe variable (SC2115 / PF-RMUNSAFE)
match: SC2115|SC2114|PF-RMUNSAFE
cause: A delete path that can become `/`, `~`, `*` or an empty variable.
fix: `rm -rf -- "${var:?}/subdir"`; `ls -la` the target first; name the directory explicitly.

## Parsing ls / iterating find (SC2012 / SC2044 / SC2045)
match: SC2012|SC2044|SC2045
cause: Filenames with spaces or newlines break `for f in $(ls)` and `$(find)`.
fix: Globs (`for f in ./*.log`) or `find -print0 | while IFS= read -r -d '' f`.

## cd without guard (SC2164 / PF-CDSEMI)
match: SC2164|PF-CDSEMI
cause: `cd dir; cmd` runs cmd in the wrong directory when cd fails.
fix: `cd dir && cmd`, or `(cd dir && cmd)` to return.

## Destructive command needs approval
match: PF-DESTRUCTIVE|PF-SUDO
cause: The command deletes, rewrites history, changes permissions recursively, stops services, or escalates.
fix: This is not an error to fix; it is a gate. In the approval message state: exact target (listed this turn), what is destroyed, why it is necessary, and the non-destructive alternative you rejected.

## Pipe to shell
match: PF-PIPESHELL
cause: `curl ... | sh`.
fix: `curl -fsSL URL -o install.sh && head -n 40 install.sh`, read it, then run `bash install.sh`; or use the package manager.

## Wrong shell
match: PF-WINSHELL|is not recognized as an internal or external command|CommandNotFoundException|The term .* is not recognized
cause: Bash syntax in PowerShell/cmd or the reverse.
fix: Check which shell the tool runs. Translate (portability chunk), or call the other shell explicitly: `pwsh -NoProfile -Command "..."` / `cmd /c "..."` / `bash -c "..."`.

## Checker not installed
match: PACK-TOOLMISSING
cause: `shlint` (or `shellcheck`) is not built or on PATH.
fix: Tell the user: `go build -o ~/.be-code/bin/shlint ./tools/shlint` and install shellcheck (single static binary). Do not bypass the preflight.
