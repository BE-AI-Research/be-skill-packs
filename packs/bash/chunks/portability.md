# Portability

## Which shell
`#!/bin/sh` is POSIX sh: often dash (Debian/Ubuntu) or busybox ash (Alpine). No arrays, no `[[ ]]`, no `${var//x/y}`, no `<(...)`, no `$'\n'`, no `echo -e`. `#!/usr/bin/env bash` gets bash where it is installed (not guaranteed on Alpine, BSD base, or minimal containers: `apk add bash`). zsh (macOS default interactive shell) differs in globbing (`nomatch` errors on no match) and word splitting (off by default); scripts should still target bash or sh, never zsh.

## GNU vs BSD/macOS vs busybox
| Task | GNU (Linux) | BSD / macOS | busybox |
|---|---|---|---|
| in-place sed | `sed -i 's/a/b/' f` | `sed -i '' 's/a/b/' f` | `sed -i` ok |
| extended regex sed | `sed -E` or `-r` | `sed -E` | `sed -E` |
| date arithmetic | `date -d '-1 day'` | `date -v-1d` | `date -d @epoch` only |
| readlink -f | yes | no (`realpath` on 13+, or `python3 -c`) | yes |
| xargs no-run-if-empty | `-r` | default behaviour | `-r` ok |
| `grep -P` | yes | no (`rg -P`) | no |
| `stat` format | `stat -c %s f` | `stat -f %z f` | `stat -c` |
| `mktemp` | `mktemp -d` | `mktemp -d` (needs template on old) | ok |
| `sort -V` | yes | no | partial |
| `timeout` | yes | `gtimeout` (coreutils) | yes |
| `awk` | gawk | awk (BWK) | busybox awk |
Install GNU tools on macOS with `brew install coreutils gnu-sed findutils` (prefixed `g`, e.g. `gsed`).

## Detecting
`uname -s` (Linux/Darwin/FreeBSD); `[ -f /etc/alpine-release ]`; `command -v gsed`; `sed --version 2>/dev/null | head -1` (BSD sed has no `--version`).

## Windows side
- From bash (Git Bash, WSL, MSYS): paths are `/c/Users/...` (Git Bash) or `/mnt/c/Users/...` (WSL). Line endings matter: `git config core.autocrlf`, and a CRLF script fails with `$'\r': command not found`.
- Calling PowerShell from bash: `pwsh -NoProfile -NonInteractive -Command "Get-ChildItem"` (or `powershell.exe` for Windows PowerShell 5). Calling cmd: `cmd.exe /c "dir /b"`. Quote the whole inner command once.
- From PowerShell, bash syntax does not apply: no `&&` before PS 7, `;` separates, `$env:VAR`, backtick escapes, `-and`/`-or`, `2>$null` not `2>/dev/null`. Use `Get-ChildItem -Recurse -Filter *.log`, `Select-String`, `Get-Content -Tail 100`.
- WSL: `wsl.exe bash -c "..."` from Windows; `cmd.exe /c` and `powershell.exe` from inside WSL. Paths via `wslpath -w`/`-u`.

## Writing for both
Prefer `printf` over `echo -e`, `[ ]` over `[[ ]]` in sh, `$(...)` over backticks, `command -v` over `which`, `mktemp` with a template, `awk` over `grep -P`, and a `case "$(uname -s)"` block for the few places you must differ.
