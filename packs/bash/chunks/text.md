# Text processing

Prefer the simplest tool that does the job, in this order: `grep` → `cut`/`tr` → `sed` → `awk` → `jq` for JSON → a Python one-liner when the shell gets ugly.

## grep / rg
- `grep -n` line numbers, `-i` case-insensitive, `-r` recursive, `-E` extended regex, `-F` fixed string (fast, safe for user input), `-q` quiet (for `if`), `-c` count, `-l` files only, `-v` invert, `-w` whole word, `-o` only the match, `-A/-B/-C n` context.
- `grep -P` (PCRE) is GNU-only; `rg` supports it everywhere and is faster: `rg -n 'pattern' path`. `rg` respects `.gitignore` by default (`--no-ignore` to disable).
- Always pass a path or `-r .`; `grep pat` with no file reads stdin forever (a hang for an agent).

## sed
- `sed -n '10,20p' f` print lines. `sed -n '/start/,/end/p'` a block.
- `sed 's/old/new/'` first per line; `s/old/new/g` all; `-E` extended; `&` is the match; `\1` groups.
- Delimiters are free: `s|/usr/local|/opt|g`.
- In-place: GNU `sed -i 's/a/b/' f`; BSD/macOS `sed -i '' 's/a/b/' f`. Portable: `sed 's/a/b/' f > f.tmp && mv f.tmp f`, or use the edit tool.
- Literal special chars in the pattern need escaping: `. * [ ] ^ $ \ /`. For a literal string replace, prefer the edit tool or `python3 -c`.

## awk
- `awk '{print $2}'` second field (whitespace-split). `-F,` comma. `-F'\t'` tab.
- `awk 'NR==5'` line 5; `awk 'NR>1'` skip header; `awk '$3 > 100'` filter; `awk '{s+=$2} END {print s}'` sum.
- `awk -v n="$var"` to pass shell values in (never interpolate `"$var"` into the program text).

## cut / tr / sort / uniq / column
- `cut -d: -f1,3` fields; `cut -c1-10` chars. `tr 'a-z' 'A-Z'`; `tr -d '\r'` strip CR; `tr -s ' '` squeeze.
- `sort -u` unique; `sort -n` numeric; `sort -k2,2 -t,`; `sort -r` reverse; `sort | uniq -c | sort -rn` frequency table.
- `uniq` only collapses adjacent lines: sort first.
- `column -t` aligns; `paste -sd,` joins lines with commas.

## jq
- `jq '.key'`, `jq -r '.[] | .name'` raw strings, `jq '.items | length'`, `jq 'select(.x > 3)'`, `jq -c` compact one per line, `jq --arg v "$var" '.k == $v'`.
- `jq -e` sets exit status from the result (for `if`).

## Line endings and encoding
`file f` tells you CRLF/encoding. `dos2unix` or `tr -d '\r'`. A script with CRLF fails with `$'\r': command not found` (see playbook).

## Dates
GNU: `date -d '2 days ago' +%F`. BSD/macOS: `date -v-2d +%F`. Portable: `python3 -c 'import datetime as d;print(d.date.today()-d.timedelta(2))'`. ISO everywhere: `+%Y-%m-%dT%H:%M:%S%z`.
