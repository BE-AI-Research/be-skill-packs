---
name: to-bash
description: Port a zsh snippet or script to bash (so shellcheck can lint it)
args: <path or snippet>
---
1. Fetch `pack zsh/differences`.
2. Translate: glob qualifiers → find; `${(f)...}` → mapfile; `$=var` → unquoted (with a comment) or `read -ra`; 1-indexed → 0-indexed; `setopt` → `shopt`/`set`; `print -r --` → `printf '%s\n'`.
3. Write the bash version with `#!/usr/bin/env bash` and `set -euo pipefail`; run `shlint script` on it; fix until clean. State anything that has no bash equivalent.
