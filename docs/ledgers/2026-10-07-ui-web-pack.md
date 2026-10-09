# ui-web pack — build record

The execution ledger for [`packs/ui-web`](../../packs/ui-web), kept because the
decisions in it are not recoverable from the diff. It is the third artifact of
a set:

| | |
|---|---|
| **Spec** | [`docs/specs/2026-10-07-ui-web-pack-design.md`](../specs/2026-10-07-ui-web-pack-design.md) — what the pack must do and why |
| **Plan** | [`docs/plans/2026-10-07-ui-web-pack.md`](../plans/2026-10-07-ui-web-pack.md) — eleven tasks arguing from the spec |
| **Record** | this file — what actually happened, and every place the plan was wrong |

Below the line it is **verbatim**, in the order it was written, one line per
event as the work happened. It was written for the executor rather than for a
reader, so it is terse; `Ruling:` lines are decisions taken without asking,
each with what it costs if the decision was wrong.

## Why this is worth reading

The pack's value rests on one habit — **every playbook `match` was written
against captured tool output, never against a rule's documentation** — and the
ledger is where that habit repeatedly overruled the plan:

- The plan guessed `TS2531`/`TS2532`/`TS2533` for a nullable value. The real
  codes are `TS18047`/`TS18048`, and `TS2739`/`TS2741` distinguish two missing
  props from one. Four variants were added to capture them.
- **No standard lint config catches an unlabelled `<input>`** (51% of real
  pages) or an empty `<button>`. `control-has-associated-label` is off in
  `jsx-a11y`'s recommended rules and its defaults ignore `input` anyway. A
  README claim that lint caught "four of the top six" defects was written
  before this was measured, and was wrong in the direction that flattered the
  pack.
- `react-hooks/exhaustive-deps` is a *warning* in the plugin's own recommended
  config and in Next.js's, and the lint wrapper drops warnings — so a default
  project's harness never sees a missing dependency at all.

Two findings came only from running the real harness against the real pack, and
nothing in this repository's own tests could have produced either:

- **The playbook was dead on the one check it was written for.** BE-Code's
  `msvc` parser requires an error code matching `[A-Z]{1,3}\d{3,5}`;
  `TS18048` satisfies it and `jsx-a11y/alt-text` cannot. Every lint line fell
  through unparsed, so a failing check reached the model as "exit code 1 and no
  recognisable error line" — no diagnosis, no signature, no entry. The
  wrapper's tests had only ever checked its output against *its own* idea of
  the shape.
- **All three verify commands were wrong for projects outside the fixture's
  layout** — `npx tsc` fetching an unrelated squatter package from the network
  in an offline-first harness, `tsc --noEmit` reporting green without checking
  anything on a solution-style `tsconfig.json`, and `eslint src` hard-failing
  wherever sources live in `app/`.

The last entry records a hard crash that corrupted the shared git object store
mid-commit, and how the repository was repaired without losing committed work.

---

# SDD ledger — plan: docs/plans/2026-10-07-ui-web-pack.md

Spec: docs/specs/2026-10-07-ui-web-pack-design.md (read)
Workspace: .worktrees/ui-web on feat/ui-web-pack, cut from 1f874a9

Setup: Ruling: created the worktree with `git worktree add` from local HEAD rather
than letting the native EnterWorktree create it, then adopted it via EnterWorktree
`path`. EnterWorktree defaults to branching from origin/<default-branch>, which is
two commits behind here: the spec and the plan are local-only, so a fresh-based
worktree would have contained neither. Cost if wrong: none beyond a non-default
base — the worktree is registered in `git worktree list` and tracked by the harness.

## Pre-flight scan (shared interfaces)

| producer | consumer | produces vs consumes | finding |
|---|---|---|---|
| T1 fixture | T3 wrappers | green fixture incl. node_modules vs "run the wrappers against it" | **DEFECT** — ruling below |
| T1 fixture | T5 capture | fixture src/ vs broken variants copied into it | clean; capture removes src/Broken.tsx each time, so T1's baseline stays green |
| T2 harness | T3, T4, T6, T7 | test()/assert() from ./run.mjs vs imported by every test file | clean |
| T2 harness | T6, T7 | parsePlaybook/matchEntry vs routing tests import both | clean, names match |
| T3 wrappers | T4 manifest | tools/lint, tools/test vs `{pack}/tools/lint` in verify | clean, paths match |
| T3 wrappers | T5 capture | tools/lint vs capture runs ../packs/ui-web/tools/lint | clean |
| T4 manifest | T8 chunks | `"chunks": {}` vs T8 replaces it | clean and deliberate; T4's test iterates whatever is present |
| T5 capture | T6, T7 | captured/*.txt vs routing asserted against those files | clean; the `$ tsc … (exit N)` header lines do not match the diagnostic filter |
| T6 playbook | T7 playbook | errors.md vs appended to | clean |
| T8 chunks | T9 commands | chunk names vs `pack ui-web/<chunk>` references | clean, T9 follows T8 |

T3: Ruling: the wrapper tests copy the whole fixture with `cpSync(recursive)`, which
would copy ~200MB of node_modules four times over. Symlink node_modules into each
temp project instead — npx resolves through the link, so the tests keep their
isolation at a fraction of the cost. Cost if wrong: on a filesystem without symlinks
(not this one) the full copy would have to be restored.

T7/T8: Note: with the catch-all removed, no playbook entry references a chunk by
name, so T8 Step 4's dead-reference grep is vacuous for the playbook. It still has
work to do for T9's command files. Not a defect; recorded so a later reader does not
mistake an empty grep for a broken check.

## Tasks
Task 1: complete (commits 1f874a9..d9e4cd5, tests: npm --prefix fixtures/ui-web run typecheck → > tsc --noEmit --pretty false)
Task 1: Ruling: eslint pinned ^9 not ^10 — no published eslint-plugin-jsx-a11y
  supports eslint 10; accessibility is the pack's highest-value content so the
  plugin wins. Cost if wrong: the pack lints on a major behind current.
Task 1: Ruling: added typescript-eslint as the parser — ESLint's default parser
  cannot read TypeScript, so every .tsx was a parsing error. Cost if wrong: none,
  it is the only mature option.
Task 1: Ruling: typescript pinned ^5.7 not ^7 — typescript-eslint requires <6.1.
  Re-measured the consequence: TS 5.9.3 emits the same MSVC-shaped diagnostics the
  spec recorded from 7.0.2, so the parser choice is unaffected. Cost if wrong: the
  fixture lags TS 7, which is also what real projects do today.
Task 1: Ruling: @typescript-eslint/no-unused-vars replaces the base rule — the base
  rule does not know JSX references an identifier and flagged every imported
  component. Cost if wrong: the rule id in T3's assertion changes with it.
Task 1: Ruling: skipLibCheck true — vitest's and vite's own .d.ts need Node types
  the fixture has no reason to install. Our source is still fully checked. Cost if
  wrong: a broken third-party type goes unreported, which is not what this fixture
  measures.
Task 1: Ruling: the test imports test/expect from vitest rather than using globals,
  which would have needed a vitest config the plan never created. T9's template must
  match. Cost if wrong: one import line per generated test.
Task 1: Note: ESLint 9.39.5 has also dropped the unix and compact formatters, so
  spec §4.2's justification holds for the pinned version — it attributed the removal
  to 10, and it happened by 9.
Task 2: complete (commits d9e4cd5..b9b28ca, tests: npm test → ok   a fenced block does not create a field)
Task 3: complete (commits b9b28ca..0c19e95, tests: npm test → ok   the test wrapper is inert when the project has no test script)
Task 3: Ruling: the lint wrapper prefers the project's own node_modules/.bin/eslint
  and only falls back to npx — npx reaches for the network when the dependency is
  missing, turning a clear failure into a hang. Cost if wrong: none; the fallback
  still covers a globally-installed eslint.
Task 3: Ruling: applied the pre-flight symlink decision — the wrapper tests link the
  fixture's node_modules into each temp project instead of copying it.
Task 3: Finding: the broken-config test passed for the wrong reason (empty src/ made
  ESLint fail with "no files matching the pattern", not on the config). Fixed by
  adding a lintable file so the config is the only cause.
Task 4: complete (commits 0c19e95..dbc5d10, tests: npm test → ok   the test wrapper is inert when the project has no test script)
Task 5: complete (commits dbc5d10..08a0e5b, tests: npm test → ok   the test wrapper is inert when the project has no test script)
Task 5: Ruling: no playbook entry may match react-hooks/exhaustive-deps — it is a warning in the plugin's own recommended config and in Next.js's, and tools/lint drops warnings so the harness never sees it — cost if wrong: stale-closure bugs are addressed by core prose only, never routed
Task 5: Ruling: no playbook entry for an unlabelled <input> or an empty <button> — neither produces any diagnostic, since control-has-associated-label is off in recommended and its defaults ignore input/textarea — cost if wrong: none; the entry would have been dead weight in the budget
Task 5: Ruling: the form-label entry matches jsx-a11y/label-has-associated-control, the orphan-<label> direction, which is what lint actually reports — cost if wrong: the entry fires on fewer real pages than WebAIM's 51% figure suggests
Task 5: Ruling: corrected Task 4's README claim that lint catches four of the top six defects, which the captures disprove — a wrong claim in the pack's own honesty section is worse than a gap — cost if wrong: none; the README now cites the capture file a reader can check
Task 5: Ruling: git identity passed per-commit with -c to match this repo's existing author, rather than writing user.name/user.email into the user's config — cost if wrong: future commits here need the same flags
Task 6: complete (commits 08a0e5b..ef2d427, tests: npm test → ok   the test wrapper is inert when the project has no test script)
Task 6: Ruling: kept the title "Input without a label" that the brief's test pins, but rewrote its cause to the orphaned-<label> case lint actually reports and added the hand-check warning to next — the title names the defect class a person must fix, the cause must name what was detected — cost if wrong: a model reading only the title may think the whole form was checked, which next now contradicts
Task 6: Ruling: kept the dead jsx-a11y/control-has-associated-label branch in the label entry's match — it costs nothing and routes correctly for a project that enables that rule with non-default options — cost if wrong: one never-taken alternation in a regex
Task 6: Ruling: the brief's Step 4 expected three ok lines while its own Step 1 defines five tests; took the five tests as authoritative — cost if wrong: none, the count was a stale number in the brief
Task 7: complete (commits ef2d427..c2e3fdd, tests: npm test → ok   the test wrapper is inert when the project has no test script)
Task 7: Ruling: dropped the plan's TS2531/TS2532/TS2533 and TS2741-only guesses and captured the real codes instead (TS2739 two missing props, TS2741 one, TS18047 null, TS2345 wrong argument) via four new variants — an unverified alternation is the guess the capture discipline exists to prevent — cost if wrong: a project on TypeScript 4.7 or earlier emits the old 2531/2532 codes and its nullable failures will not route
Task 7: Ruling: kept the plan's "Effect is missing a dependency" entry, which its ordering test requires, by adding an opt-in capture pass that elevates exhaustive-deps to an error — this converts the entry from belief into evidence and the cause now states that a default project never sees it — cost if wrong: a few hundred bytes in an on-demand playbook that most projects never match
Task 7: Ruling: omitted the plan's "List item without a key" entry — eslint-plugin-react is not in the fixture so no capture can prove react/jsx-key, and core.md line 14 already carries the prevention rule always-on — cost if wrong: a project with that plugin gets the raw lint message instead of routed advice
Task 7: Ruling: added a test that every captured diagnostic outside the syntax case must route somewhere, which mechanises the no-silent-gap invariant rather than leaving it to review — cost if wrong: a new captured variant must be routed or deliberately excluded before the suite goes green
Task 8: complete (commits c2e3fdd..3a139a4, tests: npm test → ok   the test wrapper is inert when the project has no test script)
Task 8: Ruling: added chunk pointers to every playbook entry's next field and a test enforcing it — core.md promises "fetch the chunk named in a playbook entry" and no entry named one, so the promise was false; the format has no chunk: field, so the reference is prose, and next is where a repeat failure lands — cost if wrong: eight entries carry one extra sentence each
Task 8: Ruling: docs/PACK-FORMAT.md still tells pack authors to "finish with a catch-all (match: .)", which the spec forbids and this pack's tests reject — recorded here and fixed in the docs task rather than mid-chunk — cost if wrong: a pack author following the public format doc ships the catch-all the research says measures worse than no entry
Task 9: complete (commits 3a139a4..8c3f736, tests: npm test → ok   the test wrapper is inert when the project has no test script)
Task 9: Ruling: added explicit vitest imports to the test template, deviating from the plan's code block — the plan's version calls test() and expect() as globals, the exact failure Task 1 hit in the fixture, and a template ships that defect into every project that copies it — cost if wrong: two extra imports in a project that does set globals: true
Task 9: Ruling: replaced the plan's by-hand grep for dangling pack references with test/commands.test.mjs — a manual check in a plan step stops being run the moment the plan is finished — cost if wrong: one more test file to keep green
Task 10: complete (commits 8c3f736..a8ac080, tests: npm test → ok   the test wrapper is inert when the project has no test script)
Task 10: Ruling: README row says eight playbook entries, not the plan's eleven, and names unlabelled inputs and empty buttons among what the pack cannot check — the plan's numbers predated the captures — cost if wrong: none
Task 10: Ruling: fixed docs/PACK-FORMAT.md's instruction to finish a playbook with a catch-all, and added the write-matches-from-captured-output rule — the public format doc was the last place recommending what the spec forbids and both packs omit — cost if wrong: a doc change outside this pack's directory, in the same repo and the same subject
Task 10: Ruling: used Qwen3 32B rather than the plan's "Qwen3 27B" in the eval matrix — no Qwen3 27B exists — cost if wrong: the owner substitutes whichever local model they actually run
Task 11: complete (commits a8ac080..590f240, tests: npm test → ok   the test wrapper is inert when the project has no test script)
Task 11: Ruling: fixed the lint wrapper to emit a constant ESL001 code with the rule name leading the message, rather than relaxing BE-Code's reMSVC — the pack format says parsers are the harness's and packs adapt to them, and loosening that regex would make it match far more than lint output, including inside the ubt parser — cost if wrong: every eslint diagnostic shares one code, so the anti-loop signature leans on the normalised message to tell two rules apart
Task 11: Ruling: installed the pack into ~/.be-code/packs for verification and removed it afterwards rather than leaving it — an active pack changes the system prompt of every React session on this machine, and the branch is not merged — cost if wrong: the owner runs one cp command to install it for real
Final: review by fresh Opus reviewer: 3 Critical, 11 Important, 10 Minor, 10 declined-to-judge. All 3 Criticals reproduced independently before fixing.
Final: fixed npx tsc fetching the tsc@2.0.4 squatter — new tools/typecheck preferring the project's own compiler, inert with a note when absent — regression test: "the wrapper never invokes npx" + manifest "no verify command invokes a package runner" RED→GREEN, suite 56/56
Final: fixed tsc --noEmit reporting green on a solution-style tsconfig — wrapper picks -b where the root delegates — test "a type error behind a solution-style tsconfig is still reported" RED→GREEN, suite 56/56
Final: fixed tools/lint hard-failing where sources are not in src/ — lints "." so the flat config's globs decide; when.changed globs widened too — test "a project whose sources are not in src/ is still linted" RED→GREEN, suite 56/56
Final: fixed the a11y-focus Dialog tripping no-noninteractive-element-interactions and routing to advice that deletes the dialog — Escape moved to a document listener, and the uncaptured rule dropped from the entry's match — tests "every code sample lints clean" and "a non-interactive-element-interactions diagnostic routes to nothing" RED→GREEN, suite 56/56
Final: fixed types.md naming bare MouseEvent/KeyboardEvent (non-generic DOM globals, TS2315, routes nowhere) — the import requirement is now stated — test "every event type in types.md's table compiles as written" RED→GREEN, suite 56/56
Final: fixed Component.tsx.tmpl's empty object pattern failing no-empty-pattern under eslint:recommended — test "every code sample lints clean under eslint:recommended too" RED→GREEN, suite 56/56
Final: fixed both wrappers mangling a symlinked workspace into ../real/... paths — realpathSync first — tests "a workspace reached through a symlink still yields relative paths" (both wrappers) RED→GREEN, suite 56/56
Final: fixed the vacuous Review Focus 4 assertion (character class excluded digits and uppercase, so it could never match) — now checks every line against reMSVC — suite 56/56
Final: fixed a missing toolchain reported as "no output" in lint and test — res.error named — suite 56/56
Final: fixed Windows breakage — every verify cmd runs through node, tools/test names npm.cmd, and .gitattributes pins LF on packs/*/tools/* so a CRLF checkout cannot produce "node\r: No such file or directory" — manifest test "run through node" RED→GREEN, suite 56/56
Final: fixed scripts/capture.mjs leaving the fixture dirty — one restore() wired to finally and to SIGINT/SIGTERM/SIGHUP, src/Broken.tsx gitignored, and the script now runs the pack's wrappers rather than npx — suite 56/56
Final: fixed the TS2345 entry telling the model to read a Props type that need not exist — fix step names the signature instead — test "the prop entry's fix does not assume a component" RED→GREEN, suite 56/56
Final: fixed packs/ui-web/README.md still describing the pre-ESL001 output shape and the old check commands — suite 56/56
Final: Ruling: dropped only jsx-a11y/no-noninteractive-element-interactions from the click-handler entry, keeping the other uncaptured alternations (control-has-associated-label, anchor-is-valid) — graded by effect: that one routes a legitimate dialog or listbox container to advice that destroys it, while the others are merely broader than their evidence — cost if wrong: a project hitting anchor-is-valid gets slightly off-target advice
Final: Ruling: added a one-line note to the Dialog example that a real modal also traps Tab, rather than implementing a trap in a 3 KiB chunk — the example had aria-modal with no trap, contradicting the chunk's own rules, and it was the code I was already rewriting — cost if wrong: the example is still not a complete modal, which it now says
Final: Ruling: made the chunk samples' hooks ambient in the test harness rather than adding import lines to every chunk block — a chunk is prose and repeating imports in each block costs budget in a 4 KiB file; the samples are still type-checked — cost if wrong: a copied block needs its import line added, which TS reports as TS2304
Final: Ruling: verified the fix pass's command changes by running all three verify commands exactly as pack.json names them, rather than by another agent run — the model answered without writing a file on the retry, and a deterministic check of the thing I changed beats a nondeterministic one — cost if wrong: the full agentic path was last proven at 590f240, before the command rewrite
Final: Ruling: recorded the packs validate and end-to-end evidence here, which the reviewer correctly noted was missing from the ledger — validate: "ui-web 0.1.0 (6 chunks) / ok", exit 0, against the pack-capable build from feat/verify-parisers; the §6 interaction did not fire
Final: minor (deferred): playbook entry order follows accessibility frequency, not spec §5.3's information-gap order; the eight regexes are disjoint over the captured corpus so it is inert today, and routing.test.mjs's order test checks one pair of 28
Final: minor (deferred): test/playbook.mjs diverges from the Go matcher on a repeated field key (Go keeps the first, JS keeps the last), on a bad regex (Go skips the entry, JS aborts the parse), and in dialect (Go is RE2, so a JS-legal lookahead would pass here and be dropped by the harness)
Final: minor (deferred): chunk examples other than types.md omit the imports they use, so a copied block yields TS2304 with no entry to route it
Final: minor (deferred): effects.md rethrows inside the terminal .catch, producing an unhandled rejection in the one async-effect sample the pack offers
Final: minor (deferred): core.md says "19px bold" where WCAG's large-text threshold is 14pt (18.66px); errs safe
Final: minor (deferred): a11y-focus.md calls assertive live regions "almost always wrong" and then recommends role="alert"; both correct, but the tension is unexplained
Final: minor (deferred): test/run.mjs does not await fn(), so a future async test would report ok immediately and surface failures as unhandled rejections
Final: minor (deferred): both wrappers accept only "--project <path>", silently ignoring "--project=<path>" and falling back to cwd
Final: all eight deferred minors fixed in commit 67a1a22, each with a test that failed first; suite 67/67
Final: Ruling: the playbook reorder was verified against the real harness as well as the tests, because reordering changes match precedence and disjointness was an inference — all four captured diagnostics routed to the same entries over four repair rounds — cost if wrong: none, it held
Final: Ruling: test/run.mjs refuses a returned promise rather than awaiting it — awaiting would stop tests running in definition order, which several files rely on (a const declared between two tests is visible to the second and not the first) — cost if wrong: a future async test must do its async work before the test body
Final: Ruling: hooks were removed from the samples harness's ambient declarations while project-specific names (Item, Result, Props, formatPrice) stayed — an elided import is copyable and an elided domain type is not — cost if wrong: a chunk could still elide a non-hook import without the test noticing
Final: Ruling: tightened two passages in a11y-focus.md rather than splitting the chunk when it reached 3917 of its 4096 bytes — the plan says split rather than trim the example, and neither passage trimmed was an example — cost if wrong: the chunk has 292 bytes of headroom instead of a cleaner topic split
Crash: a hard crash mid-commit corrupted the shared object store: 24 of 265 loose objects were zero length, the branch tip pointed at a commit object that was never written (7ec06671), and the index referenced 16 staged blobs that no longer existed. Repair: the empty objects were quarantined to the session scratchpad (not deleted), the ref was reset to 0febf74 with git update-ref, and the index was rebuilt with git read-tree HEAD because git reset could not read a missing blob. Every one of the 240 objects reachable from the branch was present, so no committed history was lost; fsck is clean and the suite passes 67/67. The working tree held all the uncommitted work, which is now 67a1a22.
