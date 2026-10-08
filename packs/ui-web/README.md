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
| `types` | TypeScript via `tools/typecheck` | no `tsconfig.json`, or TypeScript is not installed |
| `lint` | ESLint via `tools/lint` | no ESLint config, or ESLint is not installed |
| `test` | the project's own test script | there is no test script |

All three run the project's **own** installed tools and never a package runner.
`npx tsc` in particular does not resolve to TypeScript: in a project without a
local copy it fetches and runs `tsc@2.0.4`, an unmaintained package by another
author, which is both a network fetch in an offline-first harness and output no
parser can read. A check whose tool is absent is inert and says so, rather than
failing a project it cannot help.

`tools/typecheck` also decides between `tsc --noEmit` and `tsc -b`. A
solution-style root `tsconfig.json` — `files: []` plus `references`, the shape
Vite's React template generates — owns no files, so plain `--noEmit` compiles
nothing and exits 0. Reporting green without checking is worse than failing, so
where the root delegates, the wrapper builds the referenced projects instead.

`tools/lint` converts ESLint's JSON to the shape the harness parses: the
constant code `ESL001` with the rule name leading the message. The rule name
cannot be the code, because the parser's code group is `[A-Z]{1,3}\d{3,5}` —
`TS18048` fits and `jsx-a11y/alt-text` cannot — and a playbook `match` is tried
against the raw line as well as the message, so matching on the rule name still
works. ESLint has removed the two formatters that would have parsed directly
(`unix` and `compact`), so the conversion lives here rather than depending on a
formatter that may vanish again. It lints `.`, letting the flat config's own
`files` globs decide, so a project keeping sources in `app/` is checked too.

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
