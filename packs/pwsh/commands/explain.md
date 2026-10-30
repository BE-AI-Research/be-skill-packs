---
name: explain
description: Explain a PowerShell command segment by segment, including what flows through the pipeline
args: <command>
---
1. Split on `|` and `;`. For each stage: cmdlet or native program, each parameter, what object type goes out (use `Get-Member` reasoning), and whether an error there stops the pipeline.
2. State whether any stage prompts, and the 5.1 vs 7 differences.
3. Run `shlint preflight --shell pwsh` and report findings. Give the safer rewrite if one exists.
