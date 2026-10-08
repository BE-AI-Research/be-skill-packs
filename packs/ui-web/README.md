# ui-web pack

React + TypeScript interface expertise. Version 0.1.0.

## Install

```sh
cp -r packs/ui-web ~/.be-code/packs/ui-web
```

Activates in any workspace with a `package.json` and a `.tsx` file.

## What it checks

| check | command | when it does nothing |
|---|---|---|
| `types` | `tsc --noEmit` | never |
| `lint` | ESLint via `tools/lint` | the project has no ESLint config |
| `test` | the project's own test script | there is no test script |

The lint wrapper converts ESLint's JSON to the shape the harness parses, using
the rule name as the error code. ESLint has removed the two formatters that
would have parsed directly (`unix` and `compact`), so the conversion lives
here rather than depending on a formatter that may vanish again.

## What it cannot check

Worth knowing before you rely on it:

- **Colour contrast** — the most common accessibility defect in real
  interfaces (83.9% of the top million homepages) — is invisible to static
  analysis, because it needs computed colours at runtime. It is a core rule
  here, not a check.
- Static lint reaches fewer of the most common failures than it looks like it
  should, measured against `fixtures/ui-web/captured/a11y.txt` rather than
  estimated. Of WebAIM's six most frequent defects it catches missing alt text
  and empty links outright; it catches missing form labels only from the
  `<label>` side, when a label exists with no control; and it catches nothing
  at all for contrast, empty buttons, or a missing document language. An
  `<input>` with no label anywhere — 51% of real pages — produces no
  diagnostic in any standard configuration: `control-has-associated-label` is
  off in `jsx-a11y`'s recommended rules, and its own defaults ignore `input`
  and `textarea` even when you turn it on. That is why those defects are core
  rules here instead of playbook entries.
- Stale `useEffect` dependencies are core guidance for the same reason:
  `react-hooks/exhaustive-deps` is a *warning* in the plugin's recommended
  config and in Next.js's, and `tools/lint` drops warnings so they cannot fail
  a check. Set it to `"error"` in your own config if you want it enforced.
- Even a rendered accessibility scan reaches only about 57% of WCAG issues,
  and this pack does not render.
- `eslint-plugin-jsx-a11y` cannot see values arriving through props, so a
  component that lints clean can still fail at runtime.

## Versions

The accessibility plugin decides the toolchain: no published
`eslint-plugin-jsx-a11y` supports ESLint 10, and `typescript-eslint` requires
TypeScript below 6.1. So the fixture pins ESLint 9 and TypeScript 5, which is
what the overwhelming majority of real projects run today. The pack itself
works against whatever the project has — only its own fixture is pinned.

## Known interaction

BE-Code runs a project's *detected* checks before any pack's and stops at the
first failure. A React project is detected as `node`, so `npm run build` and
`npm test` run first, with no parser — so no diagnosis and no playbook entry.
If your build shells out to `tsc`, a type error fails there and this pack's
parsed check never runs. Set `verify.builtin: false` for the workspace when
that option is available.
