# find and xargs

## Safe skeleton
```bash
find <root> -type f -name '*.log' -print0 | xargs -0 -r <cmd>
```
`-print0`/`-0` makes filenames with spaces or newlines safe; `-r` (GNU) skips running when there is no input (BSD xargs does this by default).

## find
- `-name 'glob'` (quote it), `-iname`, `-path '*/vendor/*'`, `-type f|d|l`, `-maxdepth 2`, `-mindepth 1`.
- `-mtime -1` modified < 1 day; `-mmin -30`; `-newer ref`; `-size +10M`; `-empty`; `-perm -u+x`.
- Prune: `find . -path ./node_modules -prune -o -name '*.js' -print`. The `-o ... -print` is required or pruned paths print.
- `-exec cmd {} \;` one per file; `-exec cmd {} +` batched (faster, like xargs). `-delete` exists but list first with `-print`.
- Order matters: `-maxdepth` before tests; `-not`/`!` negates.

## xargs
- `-0` NUL input; `-r` no-run-if-empty; `-n 1` one arg per call; `-I {}` placeholder (implies one per call); `-P 4` parallel; `-t` echo commands.
- `-I {}` with spaces in input needs `-d '\n'` (GNU) or `-print0`/`-0`.
- "Argument list too long" means use xargs batching instead of `cmd $(find ...)`.

## Alternatives
`fd` (fd-find): `fd -e log -x gzip` is the same skeleton, NUL-safe by default, respects .gitignore. `rg --files -g '*.log'` lists files fast.

## Do not
- `for f in $(find ...)` (SC2044): splits on spaces. Use `-print0 | while IFS= read -r -d '' f` or `-exec`.
- `ls | grep`: parse nothing from ls. Globs or find.
- `find / -name x` without `-xdev` and `2>/dev/null` on a live system: it crawls /proc and every mount.
