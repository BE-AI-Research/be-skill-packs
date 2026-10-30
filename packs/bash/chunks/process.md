# Process control

## Bounding a command
`timeout 60 cmd` kills after 60 s (exit 124). `timeout -k 5 60 cmd` sends KILL 5 s after TERM. Use it on anything network-bound, on builds you have not timed before, and on any `tail -f`/`watch`.

## Background and wait
```bash
cmd1 & p1=$!
cmd2 & p2=$!
wait "$p1" || echo "cmd1 failed"
wait "$p2"
```
`wait` with no args waits for all; its status is the last job's. Background jobs in an agent tool call usually die when the call returns: for anything long-lived use `nohup cmd > log 2>&1 &` with `disown`, or `setsid`, or a service, and record the PID: `echo $! > run.pid`.

## Signals and traps
`kill PID` sends TERM (polite). `kill -9` is KILL (no cleanup; last resort). `kill -0 PID` tests existence. `pgrep -f pattern`/`pkill -f pattern` match the full command line; verify with `pgrep -af` before `pkill`.
In scripts: `trap 'rm -rf "$tmp"' EXIT` for cleanup; `trap 'exit 130' INT`. `EXIT` runs on normal exit and most signals.

## Temp files and locks
`tmp=$(mktemp -d)`; `trap 'rm -rf "$tmp"' EXIT`. Portable mktemp: `mktemp -d "${TMPDIR:-/tmp}/name.XXXXXX"`. Lock: `exec 9>/tmp/lock && flock -n 9 || { echo running; exit 1; }` (GNU).

## Finding what is running or listening
`pgrep -af name`; `ss -ltnp` listeners (Linux); `lsof -i :8080`; `lsof +D dir` open files under dir (slow on big trees).

## Exit code conventions worth honouring in scripts
`0` ok; `1` failure; `2` usage error; `3+` your own documented meanings. `exit "$?"` after a trap is a classic bug (the trap changed `$?`); capture first: `rc=$?; cleanup; exit "$rc"`.

## Environment
`VAR=x cmd` sets for one command only. `export VAR=x` for the rest of the shell (and children). Variables set in a tool call usually do not persist to the next call; prefix each command that needs them or source a file.
