# zsh globbing

zsh globs replace most `find` one-liners, NUL-safely, because expansion happens in the shell with no text round-trip.

## Recursion
`**/*.log` recursive (follows no symlinks); `***/` follows symlinks. `**/` alone matches directories at all depths.

## Qualifiers (in parentheses after the pattern)
| Qualifier | Means |
|---|---|
| `(.)` | regular files only |
| `(/)` | directories only |
| `(@)` | symlinks |
| `(N)` | no error on zero matches (null_glob for this pattern) |
| `(D)` | include dotfiles |
| `(om)` | order by modification time, newest first; `(Om)` oldest first |
| `(on)` | order by name; `(oL)` by size |
| `([1])` `([1,5])` | first match; first five |
| `(m-7)` `(m+30)` | modified within 7 days; more than 30 days ago (`mh` hours, `mm` minutes) |
| `(L+1m)` `(Lk-100)` | larger than 1 MiB; smaller than 100 KiB |
| `(x)` `(r)` `(w)` | executable / readable / writable by owner |
| `(^x)` | negate the next qualifier |
| `(e:'[[ ... ]]':)` | arbitrary test per match |
| `(:t)` `(:h)` `(:r)` | modifiers: basename, dirname, strip extension |

Examples:
```zsh
newest=(*.log(om[1]))                 # newest log file
for f in **/*.log(.m+7N); do gzip -- "$f"; done
rm -f -- **/*.log.gz(.m+30N)           # still gated as destructive: list first with print -l
print -l **/*.go(.L+100k)              # Go files over 100 KiB
dirs=(*(/N))
```

## extended_glob
`setopt extended_glob` enables `^pat` (not), `pat~except`, `pat#` (zero or more), `pat##` (one or more), `(#i)` case-insensitive, `(#q...)` qualifiers in non-glob contexts. Scripts should set it explicitly at the top; do not assume it.

## When to still use find
Across filesystems with `-xdev`, with `-prune` on huge trees, when piping to `xargs -P`, or when the script must also run under bash. The glob form is faster and safer for in-tree work.

## Listing before destructive globs
`print -l pattern(qualifiers)` prints one match per line without running anything. Do that in the same turn before `rm`, `mv`, or `chmod` on a glob.
