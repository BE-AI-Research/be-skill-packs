# ui-web error playbook

Format: one `##` entry per failure. `match` is a regular expression tried
against the diagnostic's raw line and message; the first matching entry in
file order wins, so specific entries come before general ones. `fix` is shown
on the first failure, `next` when the same failure returns.

Every `match` here was checked against `fixtures/ui-web/captured/`. A rule id
that appears in no captured file gets no entry, however common the defect it
would have caught.

## Effect is missing a dependency
match: react-hooks/exhaustive-deps|React Hook .* has (a )?missing dependenc
kind: compile
cause: The effect reads a value it does not list. Adding the value is often the wrong fix. This only reaches you if the project has elevated the rule to an error; by default it is a warning.
fix:
1. First ask whether the effect is needed at all — a value derived from props or state should be computed during render, and a response to a user action belongs in the event handler.
2. If the effect is right, move the function or value inside it so it is not a dependency.
next: If adding the dependency caused an infinite loop, the value is recreated on every render. Memoise it with useCallback or useMemo, move it out of the effect's inputs, or lift it — do not disable the rule. Full rules: `ui-web/effects`.

## Click handler on a non-interactive element
match: jsx-a11y/click-events-have-key-events|jsx-a11y/no-static-element-interactions
kind: compile
cause: A div or span has an onClick. It is unreachable by keyboard and is not announced as something that can be activated.
fix:
1. Replace the element with a real `button` (or `a` if it navigates). Keyboard handling, focus and semantics then come free.
2. If the element must stay, it needs `role`, `tabIndex={0}` and key handlers — which is strictly more work than using a button.
next: If a button's default styling is the reason for the div, remove the styling instead: `appearance: none` on a button is less work than reimplementing a button. Full rules: `ui-web/a11y-focus`.

## Hook called conditionally
match: react-hooks/rules-of-hooks|React Hook .* is called conditionally
kind: compile
cause: A hook is inside a condition, loop or early return. React identifies hooks by call order, so a changing order corrupts state between renders.
fix:
1. Move the hook to the top level of the component, before any condition or early return.
2. Put the condition inside the hook instead: `useEffect(() => { if (flag) … }, [flag])`.
next: If the two branches genuinely need different hooks, they are two components. Split them and choose between them in the parent. Full rules: `ui-web/state`.

## Input without a label
match: jsx-a11y/label-has-associated-control|jsx-a11y/control-has-associated-label
kind: compile
cause: A label element was written with no control inside or associated with it, so nothing announces what the field is for. Missing form labels affect about half of all real pages.
fix:
1. Add `htmlFor="x"` to the label and `id="x"` to the control. The ids must match exactly.
2. Or nest the control inside the label, which needs no ids at all.
3. A placeholder is not a label: it disappears on focus and is not announced reliably.
next: If the design wants no visible label, use `aria-label` on the control or a visually-hidden label element. Note that lint cannot see a control that has no label near it at all — only an orphaned label — so check the other fields in this form by hand. Full rules: `ui-web/a11y-forms`.

## Image without alt text
match: jsx-a11y/alt-text
kind: compile
cause: An img has no alt attribute, so a screen reader announces the file name or nothing. This is the second most common accessibility defect in real interfaces.
fix:
1. If the image carries meaning, add alt text describing what it conveys, not what it looks like: `alt="Signed in as Ada"`, not `alt="avatar image"`.
2. If it is purely decorative, set `alt=""` explicitly. A missing attribute and an empty one mean different things.
next: If the image comes from props or a CMS, the alt text must come with it — add it to the type and require it at the call site rather than defaulting to "". Full rules: `ui-web/a11y-semantics`.

## Link with no text
match: jsx-a11y/anchor-has-content|jsx-a11y/anchor-is-valid
kind: compile
cause: A link has no discernible text, so it is announced as "link" with no indication of where it goes.
fix:
1. Put text inside the anchor.
2. If it is an icon link, add `aria-label` describing the destination.
next: If the content is injected at runtime, the link must not render at all until it has content — an empty anchor is worse than no anchor. Full rules: `ui-web/a11y-semantics`.

## Value may be null or undefined
match: TS18048|TS18047
kind: compile
cause: An optional prop, a nullable value, or data that has not arrived yet is being used as though it is always present.
fix:
1. Handle the absent case explicitly: an early return, a default value, or conditional rendering.
2. Do not reach for `!` to silence it — the checker is describing a state your component can actually be in.
next: If the value is always present by the time this renders, the type is wrong rather than the code: make the prop required, or split the component so the loaded case has its own non-optional props. Full rules: `ui-web/types`.

## Prop type does not match
match: TS2322|TS2739|TS2741|TS2345
kind: compile
cause: A prop or argument was passed with the wrong type, or a required prop was not passed at all. The declared signature is the contract.
fix:
1. Read the signature the error names — a component's Props type, or a plain function's parameters. TS2345 fires on any call, not only on JSX. The error states the expected type and what was given.
2. Fix the call site, not the type — widening the type to make the error go away removes the check that found a real mistake.
next: If the value genuinely can be either type, model that in the type: a union with narrowing at the point of use, or a discriminated union if the variants carry different data. Full rules: `ui-web/types`.
