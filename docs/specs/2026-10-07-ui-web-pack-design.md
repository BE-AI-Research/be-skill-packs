# ui-web pack — design

**Status:** Draft 1
**Date:** 2026-10-07
**Applies to:** pack format v1 ([`docs/PACK-FORMAT.md`](../PACK-FORMAT.md)); BE-Code 1.3.0+
**Needs no harness change.**

## 1. Purpose

A pack that makes a coding agent better at React + TypeScript interfaces,
measured by whether a small local model with the pack closes a meaningful part
of the gap to a frontier model without one.

It is the first of a planned family (`ui-web`, then a second stack, then a
shared `ui-core` extracted from what the two prove they have in common). The
order is deliberate: you cannot know what is universal about UI work until you
have two concrete packs to compare, and writing the shared core first would
mean guessing at universality and producing confident, unverifiable prose —
the weakest thing this format can hold.

### Not in scope

- Any other stack. `ui-qt`, `ui-swiftui`, `ui-bubbletea` are later packs.
- `ui-core`. Extracted later, from evidence, not written first.
- Pack-to-pack dependencies. The format has none; adding them is a format
  change and not needed for one pack.
- Visual/design judgement beyond what is mechanically checkable or
  frequency-justified. A pack is not a design course.
- Rendered-DOM accessibility checking (axe, a dev server). See §6.

## 2. The organising principle

**Core carries what verification cannot catch. The playbook carries what the
checks catch.**

Core is the one budgeted, always-on resource a pack has. Prose spent
preventing an error that `tsc` reports every time, with a precise code, is
prose wasted — that error belongs in the playbook, which fires when it
happens and says what to do. Conversely, a high-frequency defect that no check
can see has nowhere to live *except* core.

Two facts make the split sharp:

- Low contrast text is the most common interface defect measured anywhere
  (83.9% of the top million homepages) and is **structurally invisible** to
  static analysis: contrast needs computed colours at runtime.
- This pack runs its lint check **only when the project has ESLint
  configured** (§4). So the accessibility rules cannot be delegated to a check
  either; on a bare project they are the only defence there is.

## 3. Detection

```json
"detect": { "all": ["package.json", "**/*.tsx"] }
```

Detect globs match paths, not file contents, so "React is in the
dependencies" is not expressible. A `.tsx` file is a glob-matchable proxy for
TypeScript-plus-JSX, which is the territory. A false positive costs the user
one `/packs off ui-web`.

## 4. Verification

Three checks, in manifest order, each with a parser so that a failure
produces a diagnosis the playbook can route against. (A check with no parser
produces no diagnosis, and a playbook entry can never match it — see §6.)

| check | command | parser | inert when |
|---|---|---|---|
| `types` | `tsc --noEmit --pretty false` | `msvc` | never |
| `lint` | `{pack}/tools/lint` | `msvc` | no ESLint config found |
| `test` | `{pack}/tools/test` | `generic` | no test script found |

Gated on `when.changed: ["src/**", "*.ts", "*.tsx", "package.json",
"tsconfig.json"]`.

### 4.1 Why `tsc` needs no new parser — measured

TypeScript 7.0.2, piped, emits:

```
src/App.tsx(5,19): error TS2322: Type 'number' is not assignable to type 'string'.
```

That is the MSVC shape the built-in `msvc` parser already reads. Verified by
running the real parser over real `tsc` output: it returns
`kind=compile code=TS2322 file=src/App.tsx line=5 col=19`, formats as
`src/App.tsx:5:19: compile error TS2322: …`, and produces a stable signature.
`--pretty false` is passed explicitly rather than relying on pretty-mode
auto-disabling when not a TTY.

### 4.2 Why the lint check is a wrapper — measured

ESLint 10's default `stylish` format puts the filename on a *header* line and
diagnostics on indented `1:7  error  …` lines, which no line-based parser can
read. The two formats that would have parsed, `unix` and `compact`, **have
been removed from core ESLint** and are now separate packages.

So `tools/lint` is a small Node script that runs ESLint with `--format json`
and prints:

```
src/App.tsx(12,5): error no-unused-vars: 'x' is assigned a value but never used.
```

The ESLint **rule name takes the place of an error code**, which gives
playbook entries something stable to match and signatures something stable to
fingerprint, exactly as `TS2322` and `LNK2019` do.

Node is present by definition in this project type, so shipping Node wrappers
costs nothing. The important property is that ESLint's format churn — it just
deleted two of its own formatters — is absorbed **inside the pack**, where a
pack author can fix it, rather than inside the harness, where it would need a
release.

### 4.3 The wrapper contract

Each wrapper must:

1. exit 0 with a one-line note when its tool is not configured, so an absent
   tool reads as "nothing to check" rather than a failure (the format has no
   `when.exists` condition);
2. emit `file(line,col): error CODE: message`, paths relative to the
   workspace;
3. otherwise exit with the underlying tool's own exit code.

Both wrappers are tracked executable in git.

## 5. Content

### 5.1 Core (~8 rules, budget 1500 tokens)

Accessibility first, ordered by measured frequency:

- Text meets 4.5:1 contrast (3:1 for large text) — nothing will catch this.
- Every image has `alt`; decorative images get `alt=""`.
- Every input has an associated label — not a placeholder, not adjacent text.
- Every link and button has discernible text; an icon-only control needs an
  accessible name.
- Anything interactive is a real `button`/`a`/`input`, never a `div` with
  `onClick`.

Then the React correctness rules the type checker cannot see:

- Never mutate state — new object, new array.
- Keys are stable ids, never the array index.
- Do not reach for an effect for what is derived from props or state, or for
  what belongs in an event handler.

Deliberately **absent**: "type your props", "no `any`", "use React's event
types". `tsc` fails on all of it with a routable code.

### 5.2 Chunks — each under 4 KiB

The per-call tool-output cap can fall to 4 KiB on a small context window, and
a chunk larger than that is truncated mid-chunk exactly where it matters. So
chunks are small and numerous rather than few and large — which also means the
model pulls only the topic it needs.

Write in this order:

1. `a11y-semantics` — elements before ARIA, names, alt, roles, landmarks
2. `a11y-forms` — labels, grouping, error association, required/invalid state
3. `a11y-focus` — focus order and visibility, dialogs, keyboard, live regions
4. `state` — stored vs derived, lifting, immutability, when context
5. `effects` — when an effect is wrong, dependencies, cleanup, fetch races
6. `types` — props, children, generics, event types, discriminated unions

Later, if evals show demand: `forms-ux`, `performance`, `testing`, `data`.

### 5.3 Playbook

Keyed on the code or rule name the diagnostic already carries, frequency
first:

**Accessibility** (when lint is present) — the four of the six most common
failures that static analysis can catch: `alt-text`,
`label-has-associated-control`, `anchor-has-content`,
`control-has-associated-label`.

**TypeScript** — `TS2322` assignability, `TS2739`/`TS2741` missing props,
`TS18048`/`TS2531` possibly undefined, `TS7006` implicit any on a handler,
`TS2769` no overload matches (usually a handler signature).

**React** — `rules-of-hooks`, `exhaustive-deps`, `jsx-key`.

Then a catch-all (`match: .`).

`exhaustive-deps` is the entry that justifies the format, because the obvious
fix is the wrong one:

```markdown
## react-hooks/exhaustive-deps
match: exhaustive-deps|React Hook .* has (a )?missing dependenc
kind: compile
cause: The effect reads a value it does not list. Adding the value is often
  the wrong fix.
fix:
1. First ask whether the effect is needed at all — derived state and event
   handlers do not belong in effects.
2. If it is needed, move the function or value inside the effect so it is not
   a dependency.
next: If adding the dependency caused an infinite loop, the value is recreated
  every render. Memoise it, move it out of the effect's inputs, or lift it —
  do not silence the rule.
```

A model told the same error twice will repeat its edit; here that edit causes
a render loop. `next` is what catches it on the second pass.

**Every entry is written from captured output**, from the fixture project of
§7 — not from memory of what these tools say. A playbook written from
documentation is a guess.

## 6. Evidence, and the limits of it

**Well-supported.** The accessibility frequencies are measured across the top
one million homepages and have been stable for seven consecutive years
([WebAIM Million 2026](https://webaim.org/projects/million/)): low contrast
83.9%, missing alt 53.1%, missing labels 51.0%, empty links 46.3%, empty
buttons 30.6%, missing document language 13.5% — together 96% of all detected
errors. React pages average 43.5 errors against an all-site 56.1. This is why
the playbook can be short and frequency-ordered rather than comprehensive, and
why it will not rot.

**Asserted, not measured.** The TypeScript error frequencies are practitioner
consensus. The one empirical study found concerns bugs in the TypeScript
compiler, not errors developers encounter. Assignability, missing properties,
null/undefined and implicit `any` are consistently reported as the common set,
and the fixture project of §7 will give us our own ordering.

**Known ceilings**, to be stated in the pack's own README rather than implied
away:

- Static lint catches four of the six most common accessibility failures.
  Contrast (the largest) and document language are not among them.
- axe-core reaches roughly 57% of WCAG issues even when the page is rendered,
  which this pack does not do.
- `eslint-plugin-jsx-a11y` is an AST checker: it cannot see values arriving
  through props, so a correct-looking component can still fail at runtime.

**Known interaction that blunts the pack.** BE-Code runs the project's
*detected* checks before any pack's and stops at the first failure. A React
project is detected as `node`, so `npm run build` and `npm test` run first
with **no parser** — no diagnosis, no playbook. If the build shells out to
`tsc` (most do), a type error fails there and this pack's parsed check never
runs. Resolution: document it, and recommend `verify.builtin: false` for
projects using this pack once that config key exists (specified, not yet
built). Not worked around in the pack.

## 7. Fixture project

One artifact, two jobs: the source of captured output for every playbook
entry, and the evals fixture.

A small Vite + React + TypeScript app with ESLint, `eslint-plugin-jsx-a11y`
and Vitest configured, plus one deliberately broken variant per playbook
entry. Kept minimal — a couple of components, one form, one list — and in a
location the evals can copy from cleanly.

## 8. Evals

Tasks derived from the playbook entries and the six accessibility failures,
each run with the pack off and on, against a small local model and a frontier
model. Recorded per run: whether the checks pass, repair rounds, turns, tokens.

The pack is worth shipping when the small model with it closes a meaningful
part of the gap to the frontier model without it. A pack that only helps a
frontier model has not earned its context.

## 9. Done when

- `be-code packs validate packs/ui-web` exits 0 — every chunk under the 4 KiB
  floor, both wrappers executable, every verify program present.
- Both wrappers emit the documented shape, verified against the real tools,
  and self-skip when their tool is absent.
- Every playbook entry matches output captured from the fixture project, with
  a test asserting the routing — the equivalent of the ue5 pack's real-output
  routing test.
- Core is under budget as measured by the deterministic estimate.
- The README states the ceilings in §6 plainly.

## 10. Deferred

- Rendered-DOM checking (axe, dev server) — a second verify entry once there
  is evidence the static set is insufficient.
- `when.exists` in the format, which would replace the wrappers' self-skip.
- `verify.commands` in BE-Code config, which would resolve §6's interaction.
- Pack dependencies, for when `ui-core` exists.
