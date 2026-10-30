# Options that change what a script does

Set with `setopt NAME`, clear with `unsetopt NAME` (or `setopt no_name`). Names are case-insensitive and underscores are ignored. Check current with `[[ -o NAME ]]`.

| Option | Effect | Script default |
|---|---|---|
| `err_exit` (`set -e`) | exit on unhandled failure | on |
| `pipe_fail` (`set -o pipefail`) | pipeline fails if any stage fails | on |
| `no_unset` (`set -u`) | error on unset variable | on |
| `null_glob` | zero-match glob expands to nothing instead of erroring | on in scripts that loop over globs |
| `extended_glob` | `^ ~ #` glob operators | on if used; set explicitly |
| `glob_dots` | globs match dotfiles | off; use `(D)` per pattern |
| `sh_word_split` | unquoted `$var` splits like sh | off; use `$=var` where needed |
| `ksh_arrays` | 0-indexed arrays, `${a[@]}` required | off; do not mix with native code |
| `no_clobber` | `>` refuses to overwrite | consider on |
| `warn_create_global` | warn when a function creates a global | on while developing |
| `xtrace` (`set -x`) | trace | debugging |
| `interactive_comments` | `#` comments on the command line | irrelevant in scripts |

## emulate
`emulate -L zsh` at the top of a function resets options to zsh defaults for that function only, and restores on return. Use it in any function that will be sourced into someone's interactive shell (where they may have odd options set). `emulate -L sh` gives sh semantics (word splitting, 0-indexed) for ported code.

## Script header
```zsh
#!/usr/bin/env zsh
emulate -L zsh
setopt err_exit no_unset pipe_fail null_glob extended_glob warn_create_global
```
(`set -euo pipefail` is accepted and means the same as the first three.)
