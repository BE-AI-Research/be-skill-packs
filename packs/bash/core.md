You run shell commands through a tool with no human at the keyboard. These rules apply to every command.

**Nothing may wait for input.** Every command must return on its own. Add the non-interactive flag before you need it: `git --no-pager`, `apt-get install -y` (with `DEBIAN_FRONTEND=noninteractive`), `ssh -o BatchMode=yes`, `npx --yes`, `psql -c`, `docker exec` without `-it`. Never run editors, pagers, `top`, `watch`, `tail -f` without `timeout`, or a bare interpreter. If a command might block, wrap it: `timeout 60 <cmd>`.

**Quote every expansion.** `"$var"`, `"$(cmd)"`, `"$@"`, `"${arr[@]}"`. The only unquoted `$` is a deliberate glob or split, and you say so. Never parse `ls`; use `find -print0 | xargs -0` or globs. In scripts, `set -euo pipefail` is the first line after the shebang.

**One failing command must fail the whole thing.** Chain with `&&`, never `;`. `cd dir && cmd`, not `cd dir; cmd`. With pipes, the exit status you see is the last command's unless `pipefail` is set; in a one-liner, check the thing that matters directly (`grep -q` and test `$?` of the pipeline you care about).

**Destructive commands are declared, not slipped in.** Before `rm -r`, `git reset --hard`, `chmod -R`, `kill`, `systemctl stop`, `docker rm`, `DROP`, or anything with `sudo`: list the exact target in this turn (`ls -la` it), use `"${VAR:?}"` on any variable in a delete path, state in one sentence what will be destroyed and why, and expect the approval gate. Never `rm -rf` a bare `*`, `.`, `~`, `/`, or an unchecked variable. Never pipe `curl`/`wget` into a shell.

**Know which shell you are in.** This session's shell is named in the tool description. Bash syntax in PowerShell or cmd fails confusingly; PowerShell cmdlets in bash fail the same way. On Windows, call `pwsh -Command "..."` or `cmd /c "..."` explicitly when you need the other shell. `sed -i`, `date`, `readlink -f`, `xargs -r` differ between GNU and BSD/macOS; the portability chunk has the table.

**Bound your output.** Pipe long output through `head -n 200`, `tail -n 100`, or `wc -l` first. A tool result over a few hundred lines wastes the context that the next step needs. Prefer `rg`/`grep -n` with a path over dumping files.

**Read before you write.** `ls`/`cat`/`stat` the thing you are about to change. Check `command -v tool` before relying on a tool. Check `pwd` if a relative path matters; the working directory may not persist between tool calls.

**When a command fails**, read stderr for the first error line, match it against the playbook if one fires, and change one thing. Do not rerun the same command hoping for a different result. Three failures on the same signature means stop and report.

**Prefer the boring, portable form.** `[ ]` over `[[ ]]` in `sh`; `printf` over `echo -e`; `$(...)` over backticks; `command -v` over `which`; `mktemp` over hand-made temp names; absolute paths over relative in anything that runs from cron or a service.
