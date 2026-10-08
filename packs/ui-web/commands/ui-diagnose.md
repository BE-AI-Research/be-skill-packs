Diagnose and fix the current failing check. $ARGS

1. Run the project's verification and read the FIRST error only.
2. The verification names a single root cause, and where the harness has the playbook it attaches the matching entry. Apply that entry's fix and change only what the one error requires.
3. Rebuild. If the same error returns, the fix did not work — follow the entry's `next` step and do not repeat the previous change.
4. If no entry matched, that is deliberate: a syntax error, for instance, is clearer on its own than with advice attached. Fetch the chunk closest to the failure — `pack ui-web/types` for a TypeScript error, `pack ui-web/effects` for an effect or dependency error, `pack ui-web/state` for a hook-order error, `pack ui-web/a11y-semantics` for an accessibility rule.
5. Summarise: the error, its cause, the change you made, and the result.
