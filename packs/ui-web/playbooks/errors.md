# ui-web error playbook

Format: one `##` entry per failure. `match` is a regular expression tried
against the diagnostic's raw line and message; the first matching entry in
file order wins, so specific entries come before general ones. `fix` is shown
on the first failure, `next` when the same failure returns.

Every `match` here was checked against `fixtures/ui-web/captured/`. A rule id
that appears in no captured file gets no entry, however common the defect it
would have caught.

## Image without alt text
match: jsx-a11y/alt-text
kind: compile
cause: An img has no alt attribute, so a screen reader announces the file name or nothing. This is the second most common accessibility defect in real interfaces.
fix:
1. If the image carries meaning, add alt text describing what it conveys, not what it looks like: `alt="Signed in as Ada"`, not `alt="avatar image"`.
2. If it is purely decorative, set `alt=""` explicitly. A missing attribute and an empty one mean different things.
next: If the image comes from props or a CMS, the alt text must come with it — add it to the type and require it at the call site rather than defaulting to "".

## Input without a label
match: jsx-a11y/label-has-associated-control|jsx-a11y/control-has-associated-label
kind: compile
cause: A label element was written with no control inside or associated with it, so nothing announces what the field is for. Missing form labels affect about half of all real pages.
fix:
1. Add `htmlFor="x"` to the label and `id="x"` to the control. The ids must match exactly.
2. Or nest the control inside the label, which needs no ids at all.
3. A placeholder is not a label: it disappears on focus and is not announced reliably.
next: If the design wants no visible label, use `aria-label` on the control or a visually-hidden label element. Note that lint cannot see a control that has no label near it at all — only an orphaned label — so check the other fields in this form by hand.

## Link with no text
match: jsx-a11y/anchor-has-content|jsx-a11y/anchor-is-valid
kind: compile
cause: A link has no discernible text, so it is announced as "link" with no indication of where it goes.
fix:
1. Put text inside the anchor.
2. If it is an icon link, add `aria-label` describing the destination.
next: If the content is injected at runtime, the link must not render at all until it has content — an empty anchor is worse than no anchor.

## Click handler on a non-interactive element
match: jsx-a11y/click-events-have-key-events|jsx-a11y/no-static-element-interactions|jsx-a11y/no-noninteractive-element-interactions
kind: compile
cause: A div or span has an onClick. It is unreachable by keyboard and is not announced as something that can be activated.
fix:
1. Replace the element with a real `button` (or `a` if it navigates). Keyboard handling, focus and semantics then come free.
2. If the element must stay, it needs `role`, `tabIndex={0}` and key handlers — which is strictly more work than using a button.
next: If a button's default styling is the reason for the div, remove the styling instead: `appearance: none` on a button is less work than reimplementing a button.
