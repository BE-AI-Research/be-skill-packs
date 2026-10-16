# Reverse-Engineer

A skill-pack for recovering the meaning of untrusted code and binary targets —
source, decompiled listings, bytecode, native binaries, firmware, APKs, installers,
network captures, and running processes — into verified, inspectable findings.

Adapted from the REA `reverse-engineer-anything` skill so its full workflow, tool
catalog, and reference library are available inside be-code as a skill-pack.

## What it gives the agent

- `core.md` (always loaded when the pack is enabled) — the workflow, the full
  reverse-engineering tool catalog, routing by evidence, artifact rules, and the
  safety rules.
- Six on-demand chunks under `chunks/`, loaded only when the topic is in scope:
  - `connection-and-recovery` — MCP connection, server startup, and recovery
  - `evidence-workflows` — retained-evidence references and inspect/export bundles
  - `native-and-artifacts` — binary inspection, decompilation, symbols, artifact digests
  - `runtime-observation` — dynamic hooks and process/browser/electron workflows
  - `android-applications` — JADX / APK workflows
  - `javascript-applications` — JS source recovery and tracing workflows

## Detection

This pack has no `detect` signal: reverse engineering is a deliberate,
user-directed activity, not something implied by workspace files. Enable it
explicitly for the session.

## Using it

Ask for a reverse-engineering task, e.g. "reverse engineer this APK", "inspect
this binary's imports", or "trace this app's data flow". The pack's core workflow
is loaded automatically; the relevant chunk is pulled in when the target type
matches (native, runtime, Android, JavaScript, evidence, or connection work).

The pack names tools and built-in parsers but does not execute code itself. The
actual capabilities live in an external REA MCP server, referenced by tool name;
if that server is not attached, the workflows still describe the intended steps,
evidence to retain, and the verification contract.

## Source

Ported verbatim (workflow, catalog, and rules) from
`reverse-engineer-anything/SKILL.md`, with its six reference documents copied
byte-for-byte into `chunks/`. No source capability was dropped.
