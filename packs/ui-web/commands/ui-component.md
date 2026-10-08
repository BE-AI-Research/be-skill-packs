Create a new React component: $ARGS

1. Find where this project keeps components and follow the same layout and naming.
2. Fetch the templates with the pack tool — `pack ui-web/template/Component.tsx.tmpl` and `pack ui-web/template/Component.test.tsx.tmpl`. A pack lives outside the workspace, so `read_file` cannot reach its files.
3. Fill in `{{NAME}}`. Type every prop explicitly; no `any`. Fetch `pack ui-web/types` if a prop's type is not obvious.
4. Use the real element for anything interactive, and give every control an accessible name. Fetch `pack ui-web/a11y-semantics` if unsure which element to use.
5. Write the test so it finds the component by role and accessible name. If that query cannot find it, neither can a screen reader — fix the component, not the query.
6. Run the checks. Fix the first error only, then re-run.
