#!/usr/bin/env bash
# <purpose>
set -euo pipefail

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
trap 'rm -rf "${tmp:?}"' EXIT

log() { printf '%s %s\n' "$(date +%FT%T)" "$*" >&2; }
die() { log "error: $*"; exit 1; }
run() { if [ "$dry" -eq 1 ]; then log "would: $*"; else "$@"; fi; }

[ -r "$input" ] || die "cannot read $input"
mkdir -p -- "$out"
log "processing $input into $out"
run cp -- "$input" "$out/"
log "done"
