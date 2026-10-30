# zsh pack - error playbook (in addition to the bash pack's)

## No matches found
match: no matches found|zsh: no match
cause: An unquoted glob matched nothing; zsh treats that as an error and runs nothing.
fix: Quote it if literal (`'*.foo'`), add `(N)` if zero matches is acceptable, or `setopt null_glob` in a script. Do not retry the same pattern.

## Bad pattern
match: bad pattern
cause: A glob operator (`^`, `~`, `#`, `(#i)`) used without `setopt extended_glob`, or a `[` that zsh reads as a character class (common with `[[`-style text in args, or Jenkins/Jest `--testNamePattern '[x]'`).
fix: `setopt extended_glob` for the operators; quote arguments that contain `[`, `(`, `^` and are not globs; `noglob cmd ...` to disable globbing for one command.

## Bashism rejected
match: PF-ZSH-BASHISM|mapfile: command not found|shopt: command not found|bad substitution
cause: bash-only construct under zsh.
fix: Use the zsh form from the differences chunk (`${(@f)...}`, `setopt`, `${(L)v}`, `${(P)name}`). If the whole script is bash, run it with `bash` explicitly.

## read: -p: no coprocess
match: no coprocess
cause: `read -p` means "from coprocess" in zsh.
fix: `read 'var?Prompt: '`, or supply the value without prompting (agents cannot answer anyway).

## Array index 0 is empty
match: PF-ZSH-INDEX0
cause: zsh arrays start at 1.
fix: `${a[1]}` first, `${a[-1]}` last. Do not set KSH_ARRAYS to paper over it.

## command not found (zsh format)
match: zsh: command not found: 
cause: Not on PATH in this non-interactive context (often defined in `.zshrc`, which scripts and tool calls do not load).
fix: `command -v name`; use the full path; put PATH additions in `~/.zshenv` or the script; `whence -v name` interactively to see where it came from.

## permission denied (zsh)
match: zsh: permission denied: 
cause: Executing a file without the execute bit, or redirecting into a protected path.
fix: `chmod +x` or run `zsh script.zsh`; check `ls -la` on the target; a protected path goes through the gate.

## parse error near
match: parse error near|SH-SYNTAX:zsh
cause: zsh syntax error, often `[[ $x == y]]` (missing space before `]]`), a stray bash heredoc tab, or `=cmd` expansion (`setopt no_equals`).
fix: `zsh -n script.zsh` for the line; fix one thing; quote any `=word` argument that is not meant as a path lookup.

## maximum nested function level reached
match: maximum nested function level
cause: A function calling itself, usually a wrapper named the same as the command it wraps.
fix: Use `command name` inside the wrapper, or rename.
