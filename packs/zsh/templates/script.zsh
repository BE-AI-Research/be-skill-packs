#!/usr/bin/env zsh
# <purpose>
emulate -L zsh
setopt err_exit no_unset pipe_fail null_glob extended_glob warn_create_global

usage() { print -u2 -r -- "usage: ${0:t} [-n] <dir>"; exit 2 }
dry=0
while getopts ':n' opt; do
  case "$opt" in
    n) dry=1 ;;
    *) usage ;;
  esac
done
shift $((OPTIND - 1))
(( $# == 1 )) || usage
dir="${1:?}"
[[ -d "$dir" ]] || { print -u2 -r -- "not a directory: $dir"; exit 1 }

run() { if (( dry )); then print -r -- "would: $*"; else "$@"; fi }

for f in "$dir"/**/*.log(.m+7N); do
  run gzip -- "$f"
done
for f in "$dir"/**/*.log.gz(.m+30N); do
  run rm -f -- "$f"
done
print -r -- "done"
