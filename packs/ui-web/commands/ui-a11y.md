Audit and fix the accessibility of: $ARGS

Work in this order — it is the order these defects actually occur in real interfaces:

1. **Contrast.** Check text against its background for 4.5:1 (3:1 for large text). No check will catch this, so it has to be read. Report any colour you cannot verify.
2. **Images.** Every `img` has `alt`; decorative images have `alt=""`.
3. **Form controls.** Every one has an associated label. The linter catches an orphaned `<label>` but not a control with no label anywhere near it, so read the markup rather than trusting a clean lint run.
4. **Links and buttons.** Every one has discernible text; icon-only controls have `aria-label`. An empty `<button>` produces no diagnostic from any standard lint config.
5. **Interactive elements.** Anything with an `onClick` is a real `button` or `a`.
6. Run the lint check, which catches some of items 2 to 5 and never item 1.

Fetch `pack ui-web/a11y-semantics`, `pack ui-web/a11y-forms` or `pack ui-web/a11y-focus` as needed. Say plainly which items you verified and which you could not.
