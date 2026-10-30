# Startup files and automation

## Load order
| File | Login | Interactive | Script / tool call |
|---|---|---|---|
| `/etc/zshenv`, `~/.zshenv` | yes | yes | **yes** |
| `/etc/zprofile`, `~/.zprofile` | yes | | |
| `/etc/zshrc`, `~/.zshrc` | yes | yes | |
| `/etc/zlogin`, `~/.zlogin` | yes | | |

So: PATH and environment a script needs belong in `~/.zshenv` (or in the script); aliases, prompt, completion, oh-my-zsh belong in `~/.zshrc` and are invisible to scripts and to the agent's tool calls. If a command works in your terminal but not in the tool, this is usually why.

`zsh -f` skips all of them (clean test); `zsh -l` is a login shell; `zsh -i` interactive. `ZDOTDIR` relocates the dotfiles.

## macOS notes
zsh is the default interactive shell since 10.15; `/bin/sh` is still a bash-3.2-in-sh-mode and `/bin/bash` is bash 3.2 (no `mapfile`, no `${v,,}`, no assoc arrays). Homebrew bash (`/opt/homebrew/bin/bash`) is modern. `/etc/zprofile` runs `path_helper`, which reorders PATH on login shells only. BSD userland: see the bash pack's portability chunk (`sed -i ''`, `date -v`, no `readlink -f`).

## oh-my-zsh and friends in automation
Plugins can alias `rm`, `ls`, `grep`, `git` with flags (`rm -i`, colour output) and define `gst`, `gco` style shortcuts. Scripts never see them (good); interactive tests may (confusing). When reproducing a user's interactive result in a script, ask for `alias name` / `whence -v name` output first.

## Completion and prompt code is not for scripts
`compinit`, `zstyle`, `PROMPT`, `precmd` hooks: skip in scripts; they slow startup and can print.
