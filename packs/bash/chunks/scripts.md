# Writing scripts

## Skeleton
```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

usage() { printf 'usage: %s [-n] [-o DIR] <input>\n' "${0##*/}" >&2; exit 2; }

dry=0; out="."
while getopts ':no:' opt; do
  case "$opt" in
    n) dry=1 ;;
    o) out="$OPTARG" ;;
    *) usage ;;
  esac
done
shift $((OPTIND - 1))
[ $# -eq 1 ] || usage
input="$1"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

log() { printf '%s %s\n' "$(date +%FT%T)" "$*" >&2; }
die() { log "error: $*"; exit 1; }

[ -r "$input" ] || die "cannot read $input"
log "processing $input into $out"
# ... work ...
```

## set -euo pipefail, honestly
- `-e` exits on an unhandled non-zero. It does not fire inside `if`, `while`, `&&`/`||` chains, or `$( )` on the right of an assignment in some shells. Test the things that matter explicitly anyway.
- `-u` errors on unset variables; use `"${var:-}"` where unset is legal, and `"${1:-}"` for optional args.
- `-o pipefail` makes a pipeline fail if any stage fails. Expect SIGPIPE (141) from `| head`.
- `sh` has no `pipefail`; use `set -eu` and check `$?` stages manually.

## Arguments
`getopts` for short options (POSIX). Long options need a manual `while [ $# -gt 0 ]; do case "$1" in --out) out="$2"; shift 2 ;; ...` loop. Validate early; print usage on error to stderr and exit 2.

## Idempotence
A script run twice should leave the same state: `mkdir -p`, `ln -sfn`, `grep -q line f || echo line >> f`, `install -D`, check before create. Support `-n` (dry run) that prints what would happen.

## Logging and output
Data to stdout, messages to stderr. Never colour unless stdout is a tty: `[ -t 1 ] && red=$'\e[31m' || red=''`. Timestamps in logs. `set -x` (trace) to a file via `BASH_XTRACEFD` when debugging.

## Safety in scripts
- Every delete path uses `"${var:?}"`.
- `cd` only inside `( )` or with `|| exit`.
- Quote everything; `shellcheck` is the reviewer: `script-lint` runs it with `set -e` and `pipefail` checks on top.
- A script that needs root checks `[ "$(id -u)" -eq 0 ] || die "run as root"` instead of calling `sudo` internally.

## Running
`bash -n script.sh` syntax check; `bash -x script.sh` trace; `shellcheck script.sh`. Make executable: `chmod +x`. Call with a path (`./script.sh`), not `sh script.sh` (which ignores the shebang and may run dash).
