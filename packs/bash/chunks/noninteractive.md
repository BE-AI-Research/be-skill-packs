# Running without a human

An agent's command either returns or hangs the session. These are the tools that wait for a person and the flag that stops them. `shlint preflight` catches most of this list before execution.

| Tool | Waits because | Non-interactive form |
|---|---|---|
| `git log/diff/show/blame/branch` | pager | `git --no-pager <cmd>` or `GIT_PAGER=cat`; `git config --global core.pager cat` once |
| `git commit` (no `-m`) | editor | `git commit -m "msg"`; `git rebase -i` has no agent form, use `GIT_SEQUENCE_EDITOR=true` only with a prepared todo |
| `git push/pull` to https | credential prompt | credential helper or token in URL via env; never type a password |
| `ssh`, `scp`, `rsync -e ssh` | host key / password | `-o BatchMode=yes -o StrictHostKeyChecking=accept-new`, key auth only |
| `sudo` | password | `sudo -n` (fails instead of hanging); route through the approval gate |
| `apt-get`, `apt` | confirm | `DEBIAN_FRONTEND=noninteractive apt-get install -y`; `apt-get -y -o Dpkg::Options::=--force-confold` on upgrades |
| `dnf/yum`, `pacman`, `zypper` | confirm | `-y`, `--noconfirm`, `-n` |
| `pip`, `npm install` | usually fine | `pip --no-input`; `npm ci` for reproducibility; `npm init -y`; `npx --yes` |
| `psql`, `mysql`, `sqlite3` | REPL | `-c 'sql'`, `-e 'sql'`, `sqlite3 db 'sql'`; `< file.sql` |
| `python3`, `node`, `irb` | REPL | `-c '...'`, `-e '...'`, or a script path |
| `less`, `more`, `man` | pager | `cat`, `sed -n`, `man -P cat`, `--help` |
| `vim`, `nano`, `emacs` | editor | the edit tool, `sed -i`, heredoc |
| `top`, `htop`, `watch` | live UI | `ps aux \| head`, `top -b -n 1`, run the command once in a loop with `sleep` |
| `tail -f`, `journalctl -f`, `kubectl logs -f` | stream | `timeout 10 ...`, `tail -n 200`, `journalctl -n 200 --no-pager` |
| `docker exec -it`, `docker run -it` | tty | drop `-it`; `docker run --rm img cmd`; `docker logs --tail 200` |
| `systemctl status` | pager | `systemctl status --no-pager`, or `is-active` |
| `rm -i`, `cp -i`, `mv -i` (often aliased) | confirm | call `\rm`, `command rm`, or `rm -f` deliberately |
| `read`, `select`, `dialog`, `whiptail` | input | supply values as args or env |
| `gpg`, `openssl` key ops | passphrase | `--batch --passphrase-fd`, or keys without passphrases in a secure store |
| `pager` in `aws`, `gh`, `az` CLIs | pager | `AWS_PAGER=""`, `gh --no-pager`/`GH_PAGER=cat`, `az config set core.output=json` |
| `expect`-style prompts | varies | `yes \| cmd` only as a last resort; prefer the tool's flag |

## Detecting a hang
No output for longer than the command should take, and the tool has not returned. Prevention beats detection: `timeout` on anything you have not run before. If the harness reports a timeout (exit 124), the fix is a non-interactive flag, not a longer timeout, unless the work is known to be long (builds, downloads).

## Environment that helps
```bash
export DEBIAN_FRONTEND=noninteractive GIT_PAGER=cat PAGER=cat AWS_PAGER= GH_PAGER=cat PIP_NO_INPUT=1 CI=1 TERM=dumb
```
Many tools honour `CI=1` or a non-tty stdout by dropping colour and prompts. Do not rely on it; add the flag anyway.
