---
name: porta
description: Check a command or script for GNU/BSD/busybox/Windows portability
args: <command or path>
---
Fetch `pack bash/portability`. Walk the table against the input: flag every `sed -i`, `date -d`, `readlink -f`, `xargs -r`, `grep -P`, `stat -c`, `sort -V`, bashism under `#!/bin/sh`, and PowerShell/cmd mismatch. Give the portable rewrite or the `case "$(uname -s)"` block.
